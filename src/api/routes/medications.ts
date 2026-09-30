import { Hono } from "hono";
import { eq, desc } from "drizzle-orm";
import db from "../db/index.ts";
import * as schema from "../db/schema.ts";
import type { AuthEnv } from "../middleware/auth.ts";
import { getUser, requireRole } from "../auth.ts";

export const medicationRoutes = new Hono<AuthEnv>();

// GET /api/medications — list all medications
medicationRoutes.get("/", async (c) => {
  try {
    getUser(c);
    const medications = await db.select().from(schema.medications)
      .orderBy(desc(schema.medications.createdAt))
      .all();
    return c.json({ medications });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// GET /api/medications/stats — aggregate stats (registered before /:id)
medicationRoutes.get("/stats", async (c) => {
  try {
    getUser(c);
    const all = await db.select().from(schema.medications).all();

    const total = all.length;
    const active = all.filter((m) => m.isActive).length;
    const inactive = total - active;
    const totalValue = all.reduce((sum, m) => sum + m.price * m.quantity, 0);
    const totalQuantity = all.reduce((sum, m) => sum + m.quantity, 0);

    return c.json({ total, active, inactive, totalValue, totalQuantity });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// POST /api/medications — create a medication
medicationRoutes.post("/", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin", "manager"]);
    const { name, sku, description, price, quantity } = await c.req.json();

    if (!name) return c.json({ error: "name is required" }, 400);

    const medication = await db.insert(schema.medications).values({
      name,
      sku,
      description,
      price: price ?? 0,
      quantity: quantity ?? 0,
      isActive: true,
    }).returning().get();

    await db.insert(schema.activityLogs).values({
      userId: user.id,
      role: user.role,
      action: "medication.create",
      entityType: "medications",
      entityId: medication!.id,
      description: `Created medication "${name}"`,
    }).run();

    return c.json({ medication }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// PATCH /api/medications/:id — update a medication
medicationRoutes.patch("/:id", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin", "manager"]);
    const id = c.req.param("id");

    const existing = await db.select().from(schema.medications)
      .where(eq(schema.medications.id, id)).get();
    if (!existing) return c.json({ error: "Medication not found" }, 404);

    const body = await c.req.json();
    const updates: Record<string, any> = { updatedAt: Date.now() };
    for (const field of ["name", "sku", "description", "price", "quantity", "isActive"]) {
      if (body[field] !== undefined) updates[field] = body[field];
    }

    await db.update(schema.medications).set(updates).where(eq(schema.medications.id, id)).run();
    const medication = await db.select().from(schema.medications)
      .where(eq(schema.medications.id, id)).get();

    await db.insert(schema.activityLogs).values({
      userId: user.id,
      role: user.role,
      action: "medication.update",
      entityType: "medications",
      entityId: id,
      description: `Updated medication "${existing.name}"`,
    }).run();

    return c.json({ medication });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});
