import { Hono } from "hono";
import { eq, desc } from "drizzle-orm";
import db from "../db/index.ts";
import * as schema from "../db/schema.ts";
import type { AuthEnv } from "../middleware/auth.ts";
import { getUser, requireRole } from "../auth.ts";

export const categoryRoutes = new Hono<AuthEnv>();

// GET /api/categories — with optional departmentId filter
categoryRoutes.get("/", async (c) => {
  try {
    const user = getUser(c);
    const departmentId = c.req.query("departmentId");

    let query = db.select().from(schema.categories);
    if (departmentId) {
      query = query.where(eq(schema.categories.departmentId, departmentId)) as any;
    }
    const categories = await query.orderBy(desc(schema.categories.createdAt)).all();
    return c.json({ categories });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// GET /api/categories/:id
categoryRoutes.get("/:id", async (c) => {
  try {
    const user = getUser(c);
    const id = c.req.param("id");
    const category = await db.select().from(schema.categories).where(eq(schema.categories.id, id)).get();
    if (!category) return c.json({ error: "Category not found" }, 404);
    return c.json({ category });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// POST /api/categories
categoryRoutes.post("/", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin", "manager"]);
    const { name, departmentId, description } = await c.req.json();

    if (!name || !departmentId) return c.json({ error: "Name and departmentId are required" }, 400);

    const category = await db.insert(schema.categories).values({ name, departmentId, description }).returning().get();

    await db.insert(schema.activityLogs).values({
      userId: user.id, role: user.role, action: "category.create",
      entityType: "categories", entityId: category!.id,
      description: `Created category "${name}"`,
    }).run();

    return c.json({ category }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// PATCH /api/categories/:id
categoryRoutes.patch("/:id", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin", "manager"]);
    const id = c.req.param("id");
    const existing = await db.select().from(schema.categories).where(eq(schema.categories.id, id)).get();
    if (!existing) return c.json({ error: "Category not found" }, 404);

    const { name, departmentId, description } = await c.req.json();
    const updates: Record<string, any> = { updatedAt: Date.now() };
    if (name !== undefined) updates.name = name;
    if (departmentId !== undefined) updates.departmentId = departmentId;
    if (description !== undefined) updates.description = description;

    await db.update(schema.categories).set(updates).where(eq(schema.categories.id, id)).run();
    const category = await db.select().from(schema.categories).where(eq(schema.categories.id, id)).get();

    await db.insert(schema.activityLogs).values({
      userId: user.id, role: user.role, action: "category.update",
      entityType: "categories", entityId: id,
      description: `Updated category "${existing.name}"`,
    }).run();

    return c.json({ category });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// DELETE /api/categories/:id
categoryRoutes.delete("/:id", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin", "manager"]);
    const id = c.req.param("id");
    const existing = await db.select().from(schema.categories).where(eq(schema.categories.id, id)).get();
    if (!existing) return c.json({ error: "Category not found" }, 404);

    await db.delete(schema.categories).where(eq(schema.categories.id, id)).run();

    await db.insert(schema.activityLogs).values({
      userId: user.id, role: user.role, action: "category.delete",
      entityType: "categories", entityId: id,
      description: `Deleted category "${existing.name}"`,
    }).run();

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});