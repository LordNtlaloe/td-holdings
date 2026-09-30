import { Hono, type Context } from "hono";
import { eq, and, desc } from "drizzle-orm";
import db from "../db/index.ts";
import * as schema from "../db/schema.ts";
import { AuthEnv } from "../middleware/auth.ts";
import { getUser, requireRole } from "../auth.ts";

export const batchRoutes = new Hono<AuthEnv>();

// GET /api/batches — filterable by storeId, productId.
// GET /api/batches/store/:storeId — the same list scoped to one store; the
// inventory UI calls this path, which did not exist and returned a silent 404.
const listBatches = async (c: Context<AuthEnv>) => {
  try {
    getUser(c);
    const storeId = c.req.query("storeId") || c.req.param("storeId");
    const productId = c.req.query("productId");

    const conditions = [];
    if (storeId) conditions.push(eq(schema.batches.storeId, storeId));
    if (productId) conditions.push(eq(schema.batches.productId, productId));

    let query = db.select().from(schema.batches);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    // Bulk-load the lookup tables. This used to issue a product + store query
    // per batch — an N+1 that is brutal over Turso's round-trip latency.
    const [batches, products, stores] = await Promise.all([
      query.orderBy(desc(schema.batches.receivedAt)).all(),
      db.select().from(schema.products).all(),
      db.select().from(schema.stores).all(),
    ]);

    const productById = new Map(products.map((p) => [p.id, p]));
    const storeById = new Map(stores.map((s) => [s.id, s]));

    return c.json({
      batches: batches.map((batch) => ({
        ...batch,
        product: productById.get(batch.productId) ?? null,
        store: storeById.get(batch.storeId) ?? null,
      })),
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
};

batchRoutes.get("/", listBatches);
batchRoutes.get("/store/:storeId", listBatches);

// POST /api/batches — receive stock.
/** Sizes from a product's `sizePricing` JSON column, or [] when not size-priced. */
function parsePricedSizes(sizePricing: string | null): string[] {
  if (!sizePricing) return [];
  try {
    const parsed = JSON.parse(sizePricing);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row: any) => row?.size)
      .filter((s: any): s is string => typeof s === "string" && s.length > 0);
  } catch {
    return [];
  }
}

// Shared with the /api/batches/receive alias used by the migrated inventory UI.
const receiveBatchHandler = async (c: Context<AuthEnv>) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin", "manager"]);
    const { storeId, productId, batchNumber, quantity, costPrice, size } = await c.req.json();

    if (!storeId || !productId || !batchNumber || quantity === undefined || costPrice === undefined) {
      return c.json({ error: "Missing required fields" }, 400);
    }
    if (quantity <= 0) return c.json({ error: "Quantity must be greater than zero" }, 400);
    if (costPrice < 0) return c.json({ error: "Cost price cannot be negative" }, 400);

    const [product, store] = await Promise.all([
      db.select().from(schema.products).where(eq(schema.products.id, productId)).get(),
      db.select().from(schema.stores).where(eq(schema.stores.id, storeId)).get(),
    ]);
    if (!product) return c.json({ error: "Product not found" }, 404);
    if (!store) return c.json({ error: "Store not found" }, 404);

    // Products whose price varies by size hold stock per size, so the size is
    // mandatory and must match one of the product's priced sizes. Everything
    // else stays product-level and any incoming size is ignored.
    const pricedSizes = parsePricedSizes(product.sizePricing);
    let batchSize: string | null = null;
    if (pricedSizes.length > 0) {
      if (!size) return c.json({ error: "Size is required for this product" }, 400);
      if (!pricedSizes.includes(size)) {
        return c.json({ error: `Unknown size "${size}" for this product` }, 400);
      }
      batchSize = size;
    }

    // 7-day gap between batches. Scoped to the same size when the product is
    // size-priced, so each size can be restocked independently.
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const existingBatches = await db.select().from(schema.batches)
      .where(and(eq(schema.batches.storeId, storeId), eq(schema.batches.productId, productId)))
      .all();
    const recent = existingBatches.find(
      (b) => (b.size ?? null) === batchSize && b.receivedAt > Date.now() - ONE_WEEK_MS
    );
    if (recent) {
      const daysAgo = ((Date.now() - recent.receivedAt) / (1000 * 60 * 60 * 24)).toFixed(1);
      const forSize = batchSize ? ` (size ${batchSize})` : "";
      return c.json({ error: `A batch for this product${forSize} was received ${daysAgo} day(s) ago. Batches must be at least 7 days apart.` }, 400);
    }

    const batch = await db.insert(schema.batches).values({
      storeId, productId, batchNumber, quantity, costPrice,
      size: batchSize,
      receivedAt: Date.now(),
    }).returning().get();

    await db.insert(schema.activityLogs).values({
      userId: user.id, role: user.role, action: "batch.receive",
      entityType: "batches", entityId: batch!.id,
      description: `Received batch "${batchNumber}" for ${product.name}${batchSize ? ` (${batchSize})` : ""} at ${store.name} (qty: ${quantity}, cost: ${costPrice})`,
    }).run();

    return c.json({ batch }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
};

batchRoutes.post("/", receiveBatchHandler);

// POST /api/batches/receive — alias of POST /api/batches
batchRoutes.post("/receive", receiveBatchHandler);

// PATCH /api/batches/adjust — set a batch's quantity to an absolute value.
// Accepts `newQuantity` (migrated caller) or `quantity` (task spec).
batchRoutes.patch("/adjust", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin", "manager"]);
    const body = await c.req.json();

    const { batchId, reason } = body;
    const newQuantity = body.newQuantity ?? body.quantity;

    if (!batchId) return c.json({ error: "batchId required" }, 400);
    if (newQuantity === undefined || newQuantity === null) {
      return c.json({ error: "newQuantity (or quantity) required" }, 400);
    }
    if (Number(newQuantity) < 0) return c.json({ error: "Quantity cannot be negative" }, 400);

    const batch = await db.select().from(schema.batches).where(eq(schema.batches.id, batchId)).get();
    if (!batch) return c.json({ error: "Batch not found" }, 404);

    const previousQuantity = batch.quantity;

    await db.update(schema.batches)
      .set({ quantity: Number(newQuantity), updatedAt: Date.now() })
      .where(eq(schema.batches.id, batchId))
      .run();

    await db.insert(schema.activityLogs).values({
      userId: user.id, role: user.role, action: "batch.adjust",
      entityType: "batches", entityId: batchId,
      description: `Adjusted batch "${batch.batchNumber}" quantity from ${previousQuantity} to ${newQuantity}${reason ? ` — reason: ${reason}` : ""}`,
    }).run();

    const updated = await db.select().from(schema.batches).where(eq(schema.batches.id, batchId)).get();
    return c.json({ batch: updated, success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// PATCH /api/batches/:id
batchRoutes.patch("/:id", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin", "manager"]);
    const id = c.req.param("id");
    const existing = await db.select().from(schema.batches).where(eq(schema.batches.id, id)).get();
    if (!existing) return c.json({ error: "Batch not found" }, 404);

    const { quantity, costPrice, batchNumber } = await c.req.json();
    if (quantity !== undefined && quantity < 0) return c.json({ error: "Quantity cannot be negative" }, 400);

    const updates: Record<string, any> = { updatedAt: Date.now() };
    if (quantity !== undefined) updates.quantity = quantity;
    if (costPrice !== undefined) updates.costPrice = costPrice;
    if (batchNumber !== undefined) updates.batchNumber = batchNumber;

    await db.update(schema.batches).set(updates).where(eq(schema.batches.id, id)).run();
    const batch = await db.select().from(schema.batches).where(eq(schema.batches.id, id)).get();

    return c.json({ batch });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// DELETE /api/batches/:id — hard-delete a batch
batchRoutes.delete("/:id", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin", "manager"]);
    const id = c.req.param("id");

    const existing = await db.select().from(schema.batches).where(eq(schema.batches.id, id)).get();
    if (!existing) return c.json({ error: "Batch not found" }, 404);

    await db.delete(schema.batches).where(eq(schema.batches.id, id)).run();

    await db.insert(schema.activityLogs).values({
      userId: user.id, role: user.role, action: "batch.delete",
      entityType: "batches", entityId: id,
      description: `Deleted batch "${existing.batchNumber}" (qty: ${existing.quantity})`,
    }).run();

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});