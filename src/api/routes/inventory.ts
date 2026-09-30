import { Hono } from "hono";
import { eq, and, desc, sql, sum } from "drizzle-orm";
import db from "../db/index.ts";
import * as schema from "../db/schema.ts";
import type { AuthEnv } from "../middleware/auth.ts";
import { getUser, requireRole } from "../auth.ts";
import { isLowStock } from "../inventory-utils.ts";

export const inventoryRoutes = new Hono<AuthEnv>();

// GET /api/inventory/store/:storeId — inventory with product details & batch quantities
inventoryRoutes.get("/store/:storeId", async (c) => {
  try {
    getUser(c);
    const storeId = c.req.param("storeId");

    const [rows, allProducts, storeBatches] = await Promise.all([
      db.select().from(schema.inventory)
        .where(eq(schema.inventory.storeId, storeId))
        .all(),
      db.select().from(schema.products).all(),
      db.select().from(schema.batches)
        .where(eq(schema.batches.storeId, storeId))
        .all(),
    ]);

    const productById = new Map(allProducts.map((p) => [p.id, p]));

    // Stock per product, plus a per-size breakdown for products whose price
    // varies by size (their batches carry a `size`; everything else has NULL).
    const stockByProduct = new Map<string, { quantity: number; sizes: [string, number][] }>();
    for (const batch of storeBatches) {
      let entry = stockByProduct.get(batch.productId);
      if (!entry) {
        entry = { quantity: 0, sizes: [] };
        stockByProduct.set(batch.productId, entry);
      }
      entry.quantity += batch.quantity;
      if (batch.size) {
        const existing = entry.sizes.find(([size]) => size === batch.size);
        if (existing) existing[1] += batch.quantity;
        else entry.sizes.push([batch.size, batch.quantity]);
      }
    }

    const results = rows
      .map((row) => {
        const product = productById.get(row.productId);
        if (!product) return null;
        const stock = stockByProduct.get(row.productId);
        return {
          inventoryId: row.id,
          productId: row.productId,
          product,
          quantity: stock?.quantity ?? 0,
          sizes: (stock?.sizes ?? []).map(([size, quantity]) => ({ size, quantity })),
          reorderLevel: row.reorderLevel,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    return c.json({ inventory: results });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// POST /api/inventory/assign — assign product to store
inventoryRoutes.post("/assign", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin", "manager"]);
    const { storeId, productId } = await c.req.json();

    if (!storeId || !productId) return c.json({ error: "storeId and productId required" }, 400);

    const existing = await db.select().from(schema.inventory)
      .where(and(eq(schema.inventory.storeId, storeId), eq(schema.inventory.productId, productId)))
      .get();

    if (existing) return c.json({ error: "Product already assigned to this store" }, 409);

    const inv = await db.insert(schema.inventory).values({ storeId, productId }).returning().get();

    await db.insert(schema.activityLogs).values({
      userId: user.id, role: user.role, action: "inventory.assign",
      entityType: "inventory", entityId: inv!.id,
      description: `Assigned product to store`,
    }).run();

    return c.json({ inventory: inv }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// ─── Helpers shared by the reorder/unassigned/low-stock routes ──────────────

// Rows whose total batch quantity is at or below the configured reorder level.
async function buildLowStockRows(storeId?: string) {
  const inventoryRows = storeId
    ? await db.select().from(schema.inventory).where(eq(schema.inventory.storeId, storeId)).all()
    : await db.select().from(schema.inventory).all();

  const [products, stores, allBatches] = await Promise.all([
    db.select().from(schema.products).all(),
    db.select().from(schema.stores).all(),
    db.select().from(schema.batches).all(),
  ]);

  const productIndex = new Map(products.map((p) => [p.id, p]));
  const storeIndex = new Map(stores.map((s) => [s.id, s.name]));

  return inventoryRows
    .map((inv) => {
      const product = productIndex.get(inv.productId) ?? null;
      const batches = allBatches.filter(
        (b) => b.productId === inv.productId && b.storeId === inv.storeId
      );
      const quantity = batches.reduce((sum, b) => sum + b.quantity, 0);
      const reorderLevel = inv.reorderLevel ?? 0;

      // Per-size breakdown, same shape as `GET /store/:storeId`. The receive
      // dialog opened from this list reads it, so without it every size showed
      // "Out of stock" even when sized stock existed.
      const sizes = new Map<string, number>();
      for (const batch of batches) {
        if (!batch.size) continue;
        sizes.set(batch.size, (sizes.get(batch.size) ?? 0) + batch.quantity);
      }

      return {
        id: inv.id,
        inventoryId: inv.id,
        productId: inv.productId,
        storeId: inv.storeId,
        storeName: storeIndex.get(inv.storeId) ?? "Unknown",
        product,
        productName: product?.name ?? "Unknown",
        sku: product?.sku ?? "",
        quantity,
        sizes: [...sizes.entries()].map(([size, sizeQuantity]) => ({
          size,
          quantity: sizeQuantity,
        })),
        reorderLevel,
        value: batches.reduce((sum, b) => sum + b.quantity * b.costPrice, 0),
      };
    })
    .filter((row) => row.product !== null && isLowStock(row.quantity, row.reorderLevel))
    .sort((a, b) => a.quantity - b.quantity);
}

// Active products that have no inventory row for the given store.
async function buildUnassignedProducts(storeId: string) {
  const [allProducts, inventoryRows] = await Promise.all([
    db.select().from(schema.products).all(),
    storeId
      ? db.select().from(schema.inventory).where(eq(schema.inventory.storeId, storeId)).all()
      : Promise.resolve([] as (typeof schema.inventory.$inferSelect)[]),
  ]);

  const assigned = new Set(inventoryRows.map((row) => row.productId));
  return allProducts.filter((p) => p.isActive && !assigned.has(p.id));
}

// GET /api/inventory/low-stock/:storeId — low / out-of-stock inventory.
// Also exposed as /low-stock?storeId=… for good measure.
inventoryRoutes.get("/low-stock", async (c) => {
  try {
    getUser(c);
    return c.json(await buildLowStockRows(c.req.query("storeId") || undefined));
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

inventoryRoutes.get("/low-stock/:storeId", async (c) => {
  try {
    getUser(c);
    return c.json(await buildLowStockRows(c.req.param("storeId")));
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// GET /api/inventory/unassigned-products?storeId=… (and /unassigned/:storeId)
inventoryRoutes.get("/unassigned-products", async (c) => {
  try {
    getUser(c);
    const storeId = c.req.query("storeId");
    if (!storeId) return c.json({ error: "storeId is required" }, 400);
    return c.json(await buildUnassignedProducts(storeId));
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

inventoryRoutes.get("/unassigned/:storeId", async (c) => {
  try {
    getUser(c);
    return c.json(await buildUnassignedProducts(c.req.param("storeId")));
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// PATCH /api/inventory/reorder-level — body { inventoryId | productId, storeId, reorderLevel }
inventoryRoutes.patch("/reorder-level", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin", "manager"]);
    const body = await c.req.json();

    const { inventoryId, storeId, productId } = body;
    const reorderLevel = body.reorderLevel;

    if (reorderLevel === undefined || reorderLevel === null) {
      return c.json({ error: "reorderLevel required" }, 400);
    }
    if (Number(reorderLevel) < 0) {
      return c.json({ error: "Reorder level cannot be negative" }, 400);
    }

    let existing = inventoryId
      ? await db.select().from(schema.inventory).where(eq(schema.inventory.id, inventoryId)).get()
      : undefined;

    if (!existing && storeId && productId) {
      existing = await db.select().from(schema.inventory)
        .where(and(eq(schema.inventory.storeId, storeId), eq(schema.inventory.productId, productId)))
        .get();
    }

    if (!existing) {
      return c.json({ error: "Product is not assigned to this store yet. Assign it first." }, 404);
    }

    await db.update(schema.inventory)
      .set({ reorderLevel: Number(reorderLevel), updatedAt: Date.now() })
      .where(eq(schema.inventory.id, existing.id))
      .run();

    await db.insert(schema.activityLogs).values({
      userId: user.id, role: user.role, action: "inventory.reorder_level",
      entityType: "inventory", entityId: existing.id,
      description: `Set reorder level from ${existing.reorderLevel ?? "unset"} to ${reorderLevel}`,
    }).run();

    const updated = await db.select().from(schema.inventory).where(eq(schema.inventory.id, existing.id)).get();
    return c.json({ inventory: updated, success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// DELETE /api/inventory/remove — body or query { inventoryId | productId, storeId }
inventoryRoutes.delete("/remove", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin", "manager"]);

    const query = c.req.query();
    let body: any = {};
    try {
      body = await c.req.json();
    } catch {
      body = {};
    }

    const inventoryId = body.inventoryId ?? query.inventoryId;
    const storeId = body.storeId ?? query.storeId;
    const productId = body.productId ?? query.productId;

    let existing = inventoryId
      ? await db.select().from(schema.inventory).where(eq(schema.inventory.id, inventoryId)).get()
      : undefined;

    if (!existing && storeId && productId) {
      existing = await db.select().from(schema.inventory)
        .where(and(eq(schema.inventory.storeId, storeId), eq(schema.inventory.productId, productId)))
        .get();
    }

    if (!existing) {
      return c.json({ error: "Product is not assigned to this store" }, 404);
    }

    // Refuse to unassign while stock remains, so batches can't be orphaned.
    const batches = await db.select().from(schema.batches)
      .where(and(eq(schema.batches.storeId, existing.storeId), eq(schema.batches.productId, existing.productId)))
      .all();
    const quantity = batches.reduce((sum, b) => sum + b.quantity, 0);
    if (quantity > 0) {
      return c.json({
        error: "Cannot unassign a product that still has stock at this store. Transfer or zero out stock first.",
      }, 400);
    }

    await db.delete(schema.inventory).where(eq(schema.inventory.id, existing.id)).run();

    await db.insert(schema.activityLogs).values({
      userId: user.id, role: user.role, action: "inventory.remove",
      entityType: "inventory", entityId: existing.id,
      description: `Removed product from store inventory`,
    }).run();

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// DELETE /api/inventory/:id — remove product from store
inventoryRoutes.delete("/:id", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin", "manager"]);
    const id = c.req.param("id");
    const existing = await db.select().from(schema.inventory).where(eq(schema.inventory.id, id)).get();
    if (!existing) return c.json({ error: "Inventory record not found" }, 404);

    await db.delete(schema.inventory).where(eq(schema.inventory.id, id)).run();

    await db.insert(schema.activityLogs).values({
      userId: user.id, role: user.role, action: "inventory.remove",
      entityType: "inventory", entityId: id,
      description: `Removed product from store inventory`,
    }).run();

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// PATCH /api/inventory/:id/reorder — update reorder level
inventoryRoutes.patch("/:id/reorder", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin", "manager"]);
    const id = c.req.param("id");
    const { reorderLevel } = await c.req.json();

    if (reorderLevel === undefined) return c.json({ error: "reorderLevel required" }, 400);

    const existing = await db.select().from(schema.inventory).where(eq(schema.inventory.id, id)).get();
    if (!existing) return c.json({ error: "Inventory record not found" }, 404);

    await db.update(schema.inventory).set({ reorderLevel, updatedAt: Date.now() }).where(eq(schema.inventory.id, id)).run();
    const updated = await db.select().from(schema.inventory).where(eq(schema.inventory.id, id)).get();

    return c.json({ inventory: updated });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});