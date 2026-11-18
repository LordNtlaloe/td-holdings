import { and, eq } from "drizzle-orm";
import db from "../db/index.ts";
import * as schema from "../db/schema.ts";

/** Units on hand for a product in a store (sum of batch quantities, as the inventory page does). */
export async function availableStock(storeId: string, productId: string): Promise<number> {
  const rows = await db
    .select()
    .from(schema.batches)
    .where(and(eq(schema.batches.storeId, storeId), eq(schema.batches.productId, productId)))
    .all();
  return rows.reduce((sum, b) => sum + b.quantity, 0);
}

/**
 * Consume stock FIFO for one sale item and record which batches were used.
 * Mirrors the loop in POST /api/sales: the matching size drains first, then the
 * remaining batches in received order. Returns the quantity that could not be covered.
 */
export async function consumeStockFifo(opts: {
  storeId: string;
  saleItemId: string;
  productId: string;
  quantity: number;
  size?: string | null;
}): Promise<number> {
  const { storeId, saleItemId, productId, quantity, size } = opts;
  const storeBatches = await db
    .select()
    .from(schema.batches)
    .where(and(eq(schema.batches.storeId, storeId), eq(schema.batches.productId, productId)))
    .orderBy(schema.batches.receivedAt)
    .all();

  const ordered = size
    ? [...storeBatches.filter((b) => b.size === size), ...storeBatches.filter((b) => b.size !== size)]
    : storeBatches;

  let remaining = quantity;
  for (const batch of ordered) {
    if (remaining <= 0) break;
    const consume = Math.min(remaining, batch.quantity);
    if (consume <= 0) continue;
    await db.insert(schema.saleItemBatches).values({ saleItemId, batchId: batch.id, quantity: consume }).run();
    await db.update(schema.batches).set({ quantity: batch.quantity - consume }).where(eq(schema.batches.id, batch.id)).run();
    remaining -= consume;
  }
  return remaining;
}