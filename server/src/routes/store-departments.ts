import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import db from "../db/index.ts";
import * as schema from "../db/schema.ts";
import { AuthEnv } from "../middleware/auth.ts";
import { getUser, requireRole } from "../auth.ts";

export const storeDepartmentRoutes = new Hono<AuthEnv>();

// GET /api/store-departments/by-department/:departmentId — stores linked to a department
storeDepartmentRoutes.get("/by-department/:departmentId", async (c) => {
  try {
    const user = getUser(c);
    const departmentId = c.req.param("departmentId");

    const links = await db.select().from(schema.storeDepartments)
      .where(eq(schema.storeDepartments.departmentId, departmentId))
      .all();

    const stores = (await Promise.all(
      links.map((link) =>
        db.select().from(schema.stores).where(eq(schema.stores.id, link.storeId)).get()
      )
    )).filter(Boolean);

    return c.json({ stores });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// POST /api/store-departments — assign a department to a store
storeDepartmentRoutes.post("/", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin"]);
    const { storeId, departmentId } = await c.req.json();

    if (!storeId || !departmentId) {
      return c.json({ error: "storeId and departmentId are required" }, 400);
    }

    const existing = await db.select().from(schema.storeDepartments)
      .where(and(
        eq(schema.storeDepartments.storeId, storeId),
        eq(schema.storeDepartments.departmentId, departmentId)
      ))
      .get();

    // Ignore duplicates — return the existing assignment
    if (existing) {
      return c.json({ assignment: existing });
    }

    const assignment = await db.insert(schema.storeDepartments).values({
      storeId,
      departmentId,
    }).returning().get();

    const [store, department] = await Promise.all([
      db.select().from(schema.stores).where(eq(schema.stores.id, storeId)).get(),
      db.select().from(schema.departments).where(eq(schema.departments.id, departmentId)).get(),
    ]);

    await db.insert(schema.activityLogs).values({
      userId: user.id,
      role: user.role,
      action: "storeDepartments.assign",
      entityType: "storeDepartments",
      entityId: assignment!.id,
      description: `Assigned department "${department?.name || departmentId}" to store "${store?.name || storeId}"`,
    }).run();

    return c.json({ assignment }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// DELETE /api/store-departments?storeId=...&departmentId=... — remove a link
storeDepartmentRoutes.delete("/", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin"]);
    const storeId = c.req.query("storeId");
    const departmentId = c.req.query("departmentId");

    if (!storeId || !departmentId) {
      return c.json({ error: "storeId and departmentId are required" }, 400);
    }

    const [store, department] = await Promise.all([
      db.select().from(schema.stores).where(eq(schema.stores.id, storeId)).get(),
      db.select().from(schema.departments).where(eq(schema.departments.id, departmentId)).get(),
    ]);

    await db.delete(schema.storeDepartments)
      .where(and(
        eq(schema.storeDepartments.storeId, storeId),
        eq(schema.storeDepartments.departmentId, departmentId)
      ))
      .run();

    await db.insert(schema.activityLogs).values({
      userId: user.id,
      role: user.role,
      action: "storeDepartments.remove",
      entityType: "storeDepartments",
      entityId: null,
      description: `Removed department "${department?.name || departmentId}" from store "${store?.name || storeId}"`,
    }).run();

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});
