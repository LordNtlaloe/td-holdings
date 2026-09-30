import { Hono } from "hono";
import { eq, desc } from "drizzle-orm";
import db from "../db/index.ts";
import * as schema from "../db/schema.ts";
import type { AuthEnv } from "../middleware/auth.ts";
import { getUser, requireRole } from "../auth.ts";
import { describeTarget, parsePrintTarget, testPrinterTarget } from "../print-transport.ts";

export const storeRoutes = new Hono<AuthEnv>();

// GET /api/stores — list all stores
storeRoutes.get("/", async (c) => {
  try {
    const user = getUser(c);
    const stores = await db.select().from(schema.stores).orderBy(desc(schema.stores.createdAt)).all();
    return c.json({ stores });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// GET /api/stores/my — the signed-in user's assigned store.
// Returns bare `null` for super_admin/admin (they are not tied to one store),
// which is what the migrated POS/invoice callers rely on to fall back to the
// full store list. Otherwise returns the bare store object.
storeRoutes.get("/my", async (c) => {
  try {
    const user = getUser(c);

    if (user.role === "super_admin" || user.role === "admin") {
      return c.json(null);
    }

    let store: typeof schema.stores.$inferSelect | undefined;
    if (user.storeId) {
      store = await db.select().from(schema.stores).where(eq(schema.stores.id, user.storeId)).get();
    }

    if (!store) {
      const employee = await db.select().from(schema.employees)
        .where(eq(schema.employees.userId, user.id)).get();
      if (employee) {
        store = await db.select().from(schema.stores)
          .where(eq(schema.stores.id, employee.storeId)).get();
      }
    }

    if (!store) return c.json(null);
    // Returned both bare (`myStore._id`, which is what the POS/invoice callers
    // read) and under the documented `store` key.
    return c.json({ ...store, store });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// GET /api/stores/active — active stores only (used by the POS store picker).
// Must be registered before `/:id` or that route would treat "active" as an id.
storeRoutes.get("/active", async (c) => {
  try {
    getUser(c);
    const stores = await db.select().from(schema.stores)
      .where(eq(schema.stores.isActive, true))
      .orderBy(desc(schema.stores.createdAt))
      .all();
    return c.json({ stores });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// GET /api/stores/with-print-agents — every store with its printer address.
// The Store Printer Settings page reads this. Must be registered before `/:id`.
storeRoutes.get("/with-print-agents", async (c) => {
  try {
    getUser(c);
    const stores = await db.select().from(schema.stores).orderBy(desc(schema.stores.createdAt)).all();
    return c.json({ stores });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// GET /api/stores/:id/print-settings — what the POS reads to decide whether a
// printer is configured for the store it is selling from.
storeRoutes.get("/:id/print-settings", async (c) => {
  try {
    getUser(c);
    const id = c.req.param("id");
    const store = await db.select().from(schema.stores).where(eq(schema.stores.id, id)).get();
    if (!store) return c.json({ error: "Store not found" }, 404);

    return c.json({
      storeId: store.id,
      storeName: store.name,
      printAgentId: store.printAgentId,
      target: describeTarget(parsePrintTarget(store.printAgentId)),
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// POST /api/stores/test-print-connection — reachability probe used by the
// settings page before saving. Does not print anything.
storeRoutes.post("/test-print-connection", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin", "manager"]);
    const { storeId, agentId, printAgentId } = await c.req.json().catch(() => ({}) as any);
    if (!storeId) return c.json({ success: false, error: "storeId is required" }, 400);

    const store = await db.select().from(schema.stores).where(eq(schema.stores.id, storeId)).get();
    if (!store) return c.json({ success: false, error: "Store not found" }, 404);

    // An optional candidate address lets the settings page probe a value before
    // saving it. Falls back to whatever the store already has.
    const candidate = String(agentId ?? printAgentId ?? "").trim();
    const target = parsePrintTarget(candidate || store.printAgentId);
    const result = await testPrinterTarget(target);

    return c.json({
      success: result.ok,
      error: result.ok ? undefined : result.detail,
      detail: result.detail,
      target: describeTarget(target),
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

// GET /api/stores/:id
storeRoutes.get("/:id", async (c) => {
  try {
    const user = getUser(c);
    const id = c.req.param("id");
    const store = await db.select().from(schema.stores).where(eq(schema.stores.id, id)).get();
    if (!store) return c.json({ error: "Store not found" }, 404);
    return c.json({ store });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// POST /api/stores
storeRoutes.post("/", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin"]);
    const body = await c.req.json();
    const { name, type, address, phone, xCoordinates, yCoordinates, printAgentId } = body;

    if (!name || !type || !phone || !xCoordinates || !yCoordinates) {
      return c.json({ error: "Missing required fields: name, type, phone, xCoordinates, yCoordinates" }, 400);
    }

    const store = await db.insert(schema.stores).values({
      name,
      type,
      address,
      phone,
      xCoordinates,
      yCoordinates,
      printAgentId,
    }).returning().get();

    // Log activity
    await db.insert(schema.activityLogs).values({
      userId: user.id,
      role: user.role,
      action: "store.create",
      entityType: "stores",
      entityId: store!.id,
      description: `Created store "${name}"`,
    }).run();

    return c.json({ store }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// PATCH /api/stores/print-agent — set or clear a store's printer address.
// Must be registered before `PATCH /:id`, otherwise "print-agent" is taken as
// a store id.
storeRoutes.patch("/print-agent", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin"]);
    const body = await c.req.json().catch(() => ({}) as any);
    const storeId = body?.storeId;
    // The settings page posts `agentId`; accept `printAgentId` too.
    const rawAgentId = body?.agentId ?? body?.printAgentId ?? "";
    if (!storeId) return c.json({ error: "storeId is required" }, 400);

    const existing = await db.select().from(schema.stores).where(eq(schema.stores.id, storeId)).get();
    if (!existing) return c.json({ error: "Store not found" }, 404);

    const value = String(rawAgentId).trim();
    if (value && /\s/.test(value)) {
      return c.json({ error: "Printer address cannot contain spaces" }, 400);
    }

    await db
      .update(schema.stores)
      .set({ printAgentId: value || null, updatedAt: Date.now() })
      .where(eq(schema.stores.id, storeId))
      .run();

    const store = await db.select().from(schema.stores).where(eq(schema.stores.id, storeId)).get();

    await db.insert(schema.activityLogs).values({
      userId: user.id,
      role: user.role,
      action: "store.print_agent",
      entityType: "stores",
      entityId: storeId,
      description: `Set printer address for "${existing.name}" to ${value || "(cleared)"}`,
    }).run();

    return c.json({ store });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// PATCH /api/stores/:id
storeRoutes.patch("/:id", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin"]);
    const id = c.req.param("id");
    const body = await c.req.json();

    const existing = await db.select().from(schema.stores).where(eq(schema.stores.id, id)).get();
    if (!existing) return c.json({ error: "Store not found" }, 404);

    const { name, type, address, phone, xCoordinates, yCoordinates, isActive, printAgentId } = body;
    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name;
    if (type !== undefined) updates.type = type;
    if (address !== undefined) updates.address = address;
    if (phone !== undefined) updates.phone = phone;
    if (xCoordinates !== undefined) updates.xCoordinates = xCoordinates;
    if (yCoordinates !== undefined) updates.yCoordinates = yCoordinates;
    if (isActive !== undefined) updates.isActive = isActive;
    if (printAgentId !== undefined) updates.printAgentId = printAgentId;
    updates.updatedAt = Date.now();

    await db.update(schema.stores).set(updates).where(eq(schema.stores.id, id)).run();

    const store = await db.select().from(schema.stores).where(eq(schema.stores.id, id)).get();

    await db.insert(schema.activityLogs).values({
      userId: user.id,
      role: user.role,
      action: "store.update",
      entityType: "stores",
      entityId: id,
      description: `Updated store "${existing.name}"`,
    }).run();

    return c.json({ store });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// DELETE /api/stores/:id — soft-delete
storeRoutes.delete("/:id", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin"]);
    const id = c.req.param("id");

    const existing = await db.select().from(schema.stores).where(eq(schema.stores.id, id)).get();
    if (!existing) return c.json({ error: "Store not found" }, 404);

    await db.update(schema.stores).set({ isActive: false, updatedAt: Date.now() }).where(eq(schema.stores.id, id)).run();

    await db.insert(schema.activityLogs).values({
      userId: user.id,
      role: user.role,
      action: "store.deactivate",
      entityType: "stores",
      entityId: id,
      description: `Deactivated store "${existing.name}"`,
    }).run();

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});