import { Hono } from "hono";
import { eq, and, or, desc, gte, sql } from "drizzle-orm";
import db from "../db/index.ts";
import * as schema from "../db/schema.ts";
import type { AuthEnv } from "../middleware/auth.ts";
import { getUser, requireRole } from "../auth.ts";

export const transferRoutes = new Hono<AuthEnv>();

// GET /api/transfers
transferRoutes.get("/", async (c) => {
  try {
    getUser(c);
    const storeId = c.req.query("storeId");
    const status = c.req.query("status");

    let conditions = [];
    if (storeId) {
      conditions.push(
        or(eq(schema.transfers.fromStoreId, storeId), eq(schema.transfers.toStoreId, storeId))
      );
    }
    if (status) conditions.push(eq(schema.transfers.status, status as any));

    const query = db.select().from(schema.transfers).orderBy(desc(schema.transfers.createdAt));
    const allTransfers = conditions.length > 0
      ? await query.where(and(...conditions)).all()
      : await query.all();

    // Attach store names
    const withStores = await Promise.all(allTransfers.map(async (t) => {
      const fromStore = await db.select().from(schema.stores).where(eq(schema.stores.id, t.fromStoreId)).get();
      const toStore = await db.select().from(schema.stores).where(eq(schema.stores.id, t.toStoreId)).get();
      return { ...t, fromStore: fromStore?.name, toStore: toStore?.name };
    }));

    return c.json({ transfers: withStores });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// GET /api/transfers/stats/activity — per-weekday transfer activity for charts.
// Migrated callers feed the response straight into an ActivityBarChart, so this
// returns a bare array.
transferRoutes.get("/stats/activity", async (c) => {
  try {
    getUser(c);

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const logs = await db.select().from(schema.activityLogs)
      .where(and(
        eq(schema.activityLogs.entityType, "transfers"),
        gte(schema.activityLogs.createdAt, sevenDaysAgo),
      ))
      .all();

    const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const buckets = new Map<string, { Created: number; Shipped: number; Received: number; Cancelled: number }>();
    const days: { key: string; label: string }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toDateString();
      days.push({ key, label: dayLabels[d.getDay()] });
      buckets.set(key, { Created: 0, Shipped: 0, Received: 0, Cancelled: 0 });
    }

    for (const log of logs) {
      const bucket = buckets.get(new Date(log.createdAt).toDateString());
      if (!bucket) continue;

      const action = log.action || "";
      if (action === "transfer.create" || action === "transfer.created") bucket.Created++;
      else if (action === "transfer.ship" || action === "transfer.in_transit") bucket.Shipped++;
      else if (action === "transfer.receive" || action === "transfer.received") bucket.Received++;
      else if (action === "transfer.cancel" || action === "transfer.cancelled") bucket.Cancelled++;
    }

    return c.json(days.map(({ key, label }) => ({ label, ...buckets.get(key)! })));
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// GET /api/transfers/:id
transferRoutes.get("/:id", async (c) => {
  try {
    getUser(c);
    const id = c.req.param("id");
    const transfer = await db.select().from(schema.transfers).where(eq(schema.transfers.id, id)).get();
    if (!transfer) return c.json({ error: "Transfer not found" }, 404);

    const items = await db.select().from(schema.transferItems)
      .where(eq(schema.transferItems.transferId, id)).all();

    const itemsWithProducts = await Promise.all(items.map(async (item) => {
      const product = await db.select().from(schema.products)
        .where(eq(schema.products.id, item.productId)).get();
      return { ...item, product: product || null };
    }));

    const fromStore = await db.select().from(schema.stores).where(eq(schema.stores.id, transfer.fromStoreId)).get();
    const toStore = await db.select().from(schema.stores).where(eq(schema.stores.id, transfer.toStoreId)).get();

    return c.json({ transfer: { ...transfer, fromStore, toStore, items: itemsWithProducts } });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// POST /api/transfers
transferRoutes.post("/", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin", "manager"]);
    const body = await c.req.json();

    const { fromStoreId, toStoreId, items, notes } = body;
    if (!fromStoreId || !toStoreId || !items?.length) {
      return c.json({ error: "fromStoreId, toStoreId, and items required" }, 400);
    }

    const transfer = await db.insert(schema.transfers).values({
      fromStoreId,
      toStoreId,
      status: "pending",
      notes,
    }).returning().get();

    if (!transfer) return c.json({ error: "Failed to create transfer" }, 500);

    for (const item of items) {
      await db.insert(schema.transferItems).values({
        transferId: transfer.id,
        productId: item.productId,
        quantityRequested: item.quantityRequested,
      }).run();
    }

    await db.insert(schema.activityLogs).values({
      userId: user.id,
      role: user.role,
      action: "transfer.created",
      entityType: "transfers",
      entityId: transfer.id,
      description: `Transfer created from ${fromStoreId} to ${toStoreId}`,
    }).run();

    return c.json({ transfer }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// ─── Shared status-transition logic ─────────────────────────────────────────
//
// Used by PATCH /:id/status and by the /in-transit, /receive and /cancel
// aliases the migrated transfers UI calls. Keeping a single implementation
// guarantees stock moves identically no matter which entry point is used.

type ReceivedTransferItem = {
  transferItemId: string;
  quantityReceived: number;
  discrepancyReason?: string;
};

async function applyTransferStatus(
  user: ReturnType<typeof getUser>,
  id: string,
  status: string,
  receivedItems?: ReceivedTransferItem[]
): Promise<void> {
  const transfer = await db.select().from(schema.transfers).where(eq(schema.transfers.id, id)).get();
  if (!transfer) throw new Error("Transfer not found");

  // in_transit: deduct stock from source store
  if (status === "in_transit" && transfer.status === "pending") {
    const items = await db.select().from(schema.transferItems)
      .where(eq(schema.transferItems.transferId, id)).all();

    for (const item of items) {
      let remaining = item.quantityRequested;
      const sourceBatches = await db.select().from(schema.batches)
        .where(and(
          eq(schema.batches.storeId, transfer.fromStoreId),
          eq(schema.batches.productId, item.productId)
        ))
        .orderBy(schema.batches.receivedAt)
        .all();

      for (const batch of sourceBatches) {
        if (remaining <= 0) break;
        const consume = Math.min(remaining, batch.quantity);
        if (consume > 0) {
          await db.insert(schema.transferItemBatches).values({
            transferItemId: item.id,
            batchId: batch.id,
            side: "source",
            quantity: consume,
          }).run();

          await db.update(schema.batches)
            .set({ quantity: batch.quantity - consume })
            .where(eq(schema.batches.id, batch.id)).run();

          remaining -= consume;
        }
      }
    }

    await db.update(schema.transfers).set({ status: "in_transit" }).where(eq(schema.transfers.id, id)).run();
  }

  // received: add stock to destination store
  if (status === "received" && transfer.status === "in_transit") {
    const items = await db.select().from(schema.transferItems)
      .where(eq(schema.transferItems.transferId, id)).all();

    // Validate any explicitly-reported received quantities up-front.
    const receivedById = new Map<string, ReceivedTransferItem>();
    if (receivedItems && receivedItems.length > 0) {
      if (receivedItems.length !== items.length) {
        throw new Error("All transfer items must be accounted for when receiving");
      }
      for (const received of receivedItems) {
        const item = items.find((i) => i.id === received.transferItemId);
        if (!item) throw new Error("Transfer item not found on this transfer");
        if (received.quantityReceived < 0) {
          throw new Error("Quantity received cannot be negative");
        }
        if (received.quantityReceived > item.quantityRequested) {
          throw new Error("Quantity received cannot exceed quantity requested");
        }
        if (received.quantityReceived !== item.quantityRequested && !(received.discrepancyReason || "").trim()) {
          throw new Error("A reason is required when quantity received differs from quantity requested");
        }
        receivedById.set(received.transferItemId, received);
      }
    }

    for (const item of items) {
      const received = receivedById.get(item.id);
      const quantityReceived = received ? received.quantityReceived : item.quantityRequested;

      await db.update(schema.transferItems)
        .set({ quantityReceived })
        .where(eq(schema.transferItems.id, item.id)).run();

      if (quantityReceived !== item.quantityRequested) {
        await db.insert(schema.transferDiscrepancies).values({
          transferItemId: item.id,
          expectedQty: item.quantityRequested,
          receivedQty: quantityReceived,
          reason: (received?.discrepancyReason || "Quantity received differs from quantity requested").trim(),
          reportedBy: user.id,
          reportedAt: Date.now(),
        }).run();
      }

      if (quantityReceived <= 0) continue;

      // Distribute the received quantity across the same source batches it was
      // originally drawn from, preserving batchNumber/costPrice per portion.
      const sourceLinks = await db.select().from(schema.transferItemBatches)
        .where(and(
          eq(schema.transferItemBatches.transferItemId, item.id),
          eq(schema.transferItemBatches.side, "source")
        )).all();

      let remainingToReceive = quantityReceived;
      for (const link of sourceLinks) {
        if (remainingToReceive <= 0) break;
        const portion = Math.min(link.quantity, remainingToReceive);
        if (portion <= 0) continue;

        const sourceBatch = await db.select().from(schema.batches)
          .where(eq(schema.batches.id, link.batchId)).get();
        if (!sourceBatch) continue;

        const newBatch = await db.insert(schema.batches).values({
          productId: item.productId,
          storeId: transfer.toStoreId,
          batchNumber: sourceBatch.batchNumber,
          quantity: portion,
          costPrice: sourceBatch.costPrice,
          receivedAt: Date.now(),
        }).returning().get();

        if (newBatch) {
          await db.insert(schema.transferItemBatches).values({
            transferItemId: item.id,
            batchId: newBatch.id,
            side: "destination",
            quantity: portion,
          }).run();
        }

        remainingToReceive -= portion;
      }
    }

    await db.update(schema.transfers).set({
      status: "received",
      receivedAt: Date.now(),
    }).where(eq(schema.transfers.id, id)).run();
  }

  // cancelled from pending or in_transit
  if (status === "cancelled" && (transfer.status === "pending" || transfer.status === "in_transit")) {
    if (transfer.status === "in_transit") {
      // Restore stock to source store
      const items = await db.select().from(schema.transferItems)
        .where(eq(schema.transferItems.transferId, id)).all();

      for (const item of items) {
        const sourceItemBatches = await db.select().from(schema.transferItemBatches)
          .where(and(
            eq(schema.transferItemBatches.transferItemId, item.id),
            eq(schema.transferItemBatches.side, "source")
          )).all();

        for (const tb of sourceItemBatches) {
          const batch = await db.select().from(schema.batches)
            .where(eq(schema.batches.id, tb.batchId)).get();
          if (batch) {
            await db.update(schema.batches)
              .set({ quantity: batch.quantity + tb.quantity })
              .where(eq(schema.batches.id, tb.batchId)).run();
          }
        }
      }
    }

    await db.update(schema.transfers).set({ status: "cancelled" }).where(eq(schema.transfers.id, id)).run();
  }

  await db.insert(schema.activityLogs).values({
    userId: user.id,
    role: user.role,
    action: `transfer.${status}`,
    entityType: "transfers",
    entityId: id,
    description: `Transfer ${status}`,
  }).run();
}

// PATCH /api/transfers/:id/status
transferRoutes.patch("/:id/status", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin", "manager"]);
    const id = c.req.param("id");
    const { status } = await c.req.json();

    if (!status) return c.json({ error: "status is required" }, 400);

    await applyTransferStatus(user, id, status);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// PATCH /api/transfers/in-transit — alias: pending -> in_transit
transferRoutes.patch("/in-transit", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin", "manager"]);
    const { transferId } = await c.req.json();

    if (!transferId) return c.json({ error: "transferId is required" }, 400);

    await applyTransferStatus(user, transferId, "in_transit");
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// PATCH /api/transfers/receive — alias: in_transit -> received.
// Body: { transferId, items?: [{ transferItemId, quantityReceived, discrepancyReason? }] }
// When `items` is omitted every line is received in full.
transferRoutes.patch("/receive", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin", "manager"]);
    const body = await c.req.json();

    const { transferId, items } = body;
    if (!transferId) return c.json({ error: "transferId is required" }, 400);

    await applyTransferStatus(user, transferId, "received", items);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// PATCH /api/transfers/cancel — alias: pending | in_transit -> cancelled
transferRoutes.patch("/cancel", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin", "manager"]);
    const { transferId } = await c.req.json();

    if (!transferId) return c.json({ error: "transferId is required" }, 400);

    await applyTransferStatus(user, transferId, "cancelled");
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

