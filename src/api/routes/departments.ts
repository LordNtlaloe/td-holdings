import { Hono } from "hono";
import { eq, desc } from "drizzle-orm";
import db from "../db/index.ts";
import * as schema from "../db/schema.ts";
import type { AuthEnv } from "../middleware/auth.ts";
import { getUser, requireRole } from "../auth.ts";

export const departmentRoutes = new Hono<AuthEnv>();

// GET /api/departments
departmentRoutes.get("/", async (c) => {
  try {
    const user = getUser(c);
    const departments = await db.select().from(schema.departments).orderBy(desc(schema.departments.createdAt)).all();
    return c.json({ departments });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// POST /api/departments
departmentRoutes.post("/", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin", "manager"]);
    const { name, description } = await c.req.json();

    if (!name) return c.json({ error: "Name is required" }, 400);

    const department = await db.insert(schema.departments).values({ name, description }).returning().get();

    await db.insert(schema.activityLogs).values({
      userId: user.id, role: user.role, action: "department.create",
      entityType: "departments", entityId: department!.id,
      description: `Created department "${name}"`,
    }).run();

    return c.json({ department }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// GET /api/departments/stats/activity — per-weekday department activity.
// Migrated callers treat the response as a bare array for the department chart.
departmentRoutes.get("/stats/activity", async (c) => {
  try {
    getUser(c);

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const logs = await db.select().from(schema.activityLogs).all();
    const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const buckets = new Map(
      dayOrder.map((day) => [day, { Created: 0, Updated: 0, Deleted: 0, Assigned: 0, Removed: 0 }])
    );

    for (const log of logs) {
      if (log.createdAt < sevenDaysAgo) continue;

      const action = log.action || "";
      const isDepartment =
        log.entityType === "departments" ||
        log.entityType === "storeDepartments" ||
        action.includes("department") ||
        action.includes("storeDepartments");
      if (!isDepartment) continue;

      const day = new Date(log.createdAt).toLocaleDateString("en-US", { weekday: "short" });
      const bucket = buckets.get(day);
      if (!bucket) continue;

      if (action === "department.create" || action === "departments.create") bucket.Created++;
      else if (action === "department.update" || action === "departments.update") bucket.Updated++;
      else if (action === "department.delete" || action === "departments.delete") bucket.Deleted++;
      else if (action.includes("assign")) bucket.Assigned++;
      else if (action.includes("remove")) bucket.Removed++;
    }

    return c.json(dayOrder.map((label) => ({ label, ...buckets.get(label)! })));
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// PATCH /api/departments/:id
departmentRoutes.patch("/:id", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin", "manager"]);
    const id = c.req.param("id");
    const existing = await db.select().from(schema.departments).where(eq(schema.departments.id, id)).get();
    if (!existing) return c.json({ error: "Department not found" }, 404);

    const { name, description } = await c.req.json();
    const updates: Record<string, any> = { updatedAt: Date.now() };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;

    await db.update(schema.departments).set(updates).where(eq(schema.departments.id, id)).run();
    const department = await db.select().from(schema.departments).where(eq(schema.departments.id, id)).get();

    await db.insert(schema.activityLogs).values({
      userId: user.id, role: user.role, action: "department.update",
      entityType: "departments", entityId: id,
      description: `Updated department "${existing.name}"`,
    }).run();

    return c.json({ department });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// DELETE /api/departments/:id
departmentRoutes.delete("/:id", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin", "manager"]);
    const id = c.req.param("id");
    const existing = await db.select().from(schema.departments).where(eq(schema.departments.id, id)).get();
    if (!existing) return c.json({ error: "Department not found" }, 404);

    await db.delete(schema.departments).where(eq(schema.departments.id, id)).run();

    await db.insert(schema.activityLogs).values({
      userId: user.id, role: user.role, action: "department.delete",
      entityType: "departments", entityId: id,
      description: `Deleted department "${existing.name}"`,
    }).run();

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});