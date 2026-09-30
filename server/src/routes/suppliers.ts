import { Hono } from "hono";
import { eq, desc } from "drizzle-orm";
import db from "../db/index.ts";
import * as schema from "../db/schema.ts";
import { AuthEnv } from "../middleware/auth.ts";
import { getUser, requireRole } from "../auth.ts";

export const supplierRoutes = new Hono<AuthEnv>();

// GET /api/suppliers
supplierRoutes.get("/", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin", "manager"]);
    const suppliers = await db.select().from(schema.suppliers).orderBy(desc(schema.suppliers.createdAt)).all();
    return c.json({ suppliers });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// GET /api/suppliers/:id
supplierRoutes.get("/:id", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin", "manager"]);
    const id = c.req.param("id");
    const supplier = await db.select().from(schema.suppliers).where(eq(schema.suppliers.id, id)).get();
    if (!supplier) return c.json({ error: "Supplier not found" }, 404);
    return c.json({ supplier });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// POST /api/suppliers
supplierRoutes.post("/", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin", "manager"]);
    const { name, email, phone } = await c.req.json();
    if (!name) return c.json({ error: "Name is required" }, 400);

    const supplier = await db.insert(schema.suppliers).values({ name, email, phone }).returning().get();

    await db.insert(schema.activityLogs).values({
      userId: user.id, role: user.role, action: "supplier.create",
      entityType: "suppliers", entityId: supplier!.id,
      description: `Created supplier "${name}"`,
    }).run();

    return c.json({ supplier }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// PATCH /api/suppliers/:id
supplierRoutes.patch("/:id", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin", "manager"]);
    const id = c.req.param("id");
    const existing = await db.select().from(schema.suppliers).where(eq(schema.suppliers.id, id)).get();
    if (!existing) return c.json({ error: "Supplier not found" }, 404);

    const { name, email, phone } = await c.req.json();
    const updates: Record<string, any> = { updatedAt: Date.now() };
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;

    await db.update(schema.suppliers).set(updates).where(eq(schema.suppliers.id, id)).run();
    const supplier = await db.select().from(schema.suppliers).where(eq(schema.suppliers.id, id)).get();

    return c.json({ supplier });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// DELETE /api/suppliers/:id
supplierRoutes.delete("/:id", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin"]);
    const id = c.req.param("id");
    const existing = await db.select().from(schema.suppliers).where(eq(schema.suppliers.id, id)).get();
    if (!existing) return c.json({ error: "Supplier not found" }, 404);

    await db.delete(schema.suppliers).where(eq(schema.suppliers.id, id)).run();

    await db.insert(schema.activityLogs).values({
      userId: user.id, role: user.role, action: "supplier.delete",
      entityType: "suppliers", entityId: id,
      description: `Deleted supplier "${existing.name}"`,
    }).run();

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});