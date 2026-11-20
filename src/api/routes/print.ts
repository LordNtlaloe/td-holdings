/**
 * Print routes — the original Convex print configuration, served over HTTP.
 *
 * Ported from `convex/print.ts` (`printReceipt`) and the print actions in
 * `convex/stores.ts` (`testPrintConnection`, `testPrint`). The behaviour is
 * unchanged: receipts are rendered with `react-thermal-printer`, and the
 * resulting ESC/POS bytes are posted to the Fly.io relay, which forwards them
 * over WebSocket to the Electron till registered as the store's `printAgentId`.
 */

import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import db from "../db/index.ts";
import * as schema from "../db/schema.ts";
import type { AuthEnv } from "../middleware/auth.ts";
import { getUser } from "../auth.ts";
import {
  fetchConnectedAgents,
  renderReceipt,
  sendToRelay,
  RELAY_URL,
  RELAY_SECRET,
  type PrintReceiptArgs,
} from "../print.ts";
import { formatReceiptDateTime } from "../../lib/datetime.ts";

export const printRoutes = new Hono<AuthEnv>();

/** Coerces the request body into the argument shape the renderer expects. */
function parseReceiptArgs(body: any): PrintReceiptArgs | { error: string } {
  if (!body || typeof body !== "object") return { error: "A JSON body is required" };

  const saleId = String(body.saleId ?? "").trim();
  if (!saleId) return { error: "saleId is required" };

  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) return { error: "items must be a non-empty array" };

  return {
    saleId,
    storeName: String(body.storeName ?? "TD Holdings"),
    storePhone: body.storePhone ? String(body.storePhone) : undefined,
    storeAddress: body.storeAddress ? String(body.storeAddress) : undefined,
    customerName: body.customerName ? String(body.customerName) : undefined,
    cashierName: body.cashierName ? String(body.cashierName) : undefined,
    paymentMethod: String(body.paymentMethod ?? "Unknown"),
    amountReceived: body.amountReceived != null ? Number(body.amountReceived) : undefined,
    changeDue: body.changeDue != null ? Number(body.changeDue) : undefined,
    items: items.map((item: any) => ({
      productId: String(item?.productId ?? ""),
      name: String(item?.name ?? "Unknown product"),
      sku: String(item?.sku ?? ""),
      size: item?.size ?? undefined,
      color: item?.color ?? undefined,
      variant: item?.variant ?? undefined,
      unitPrice: Number(item?.unitPrice) || 0,
      quantity: Number(item?.quantity) || 0,
      availableQuantity: Number(item?.availableQuantity) || 0,
      departmentId: String(item?.departmentId ?? ""),
      departmentName: String(item?.departmentName ?? ""),
    })),
    discounts: Array.isArray(body.discounts)
      ? body.discounts.map((d: any) => ({
        productId: String(d?.productId ?? ""),
        discountAmount: Number(d?.discountAmount) || 0,
        reason: d?.reason ?? undefined,
      }))
      : [],
    total: Number(body.total) || 0,
    itemCount: Number(body.itemCount) || 0,
    completedAt: Number(body.completedAt) || Date.now(),
    agentId: String(body.agentId ?? "").trim(),
  };
}

/**
 * Resolves the till to print on. The POS checkout passes `agentId` from the
 * store's print settings; a reprint from the Sales page does not, so the sale's
 * own store is looked up instead.
 */
async function resolveAgentId(
  args: PrintReceiptArgs,
  saleId: string
): Promise<string | null> {
  if (args.agentId) return args.agentId;

  const sale = await db.select().from(schema.sales).where(eq(schema.sales.id, saleId)).get();
  if (!sale) return null;

  const store = await db
    .select()
    .from(schema.stores)
    .where(eq(schema.stores.id, sale.storeId))
    .get();
  return store?.printAgentId ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/print/receipt — render the sale and hand it to the till.
// Mirrors `printReceipt` from convex/print.ts, including its return shape.
// ─────────────────────────────────────────────────────────────────────────────
type ReceiptUser = { id: string; role: string };

/**
 * The single path a receipt takes to the till. POS checkout and Sales > Reprint both end
 * here, so a reprint is rendered, addressed and logged exactly like the original print.
 */
async function deliverReceipt(
  args: PrintReceiptArgs,
  user: ReceiptUser,
  logAction: string,
  logNote: string
) {
  const agentId = await resolveAgentId(args, args.saleId);
  if (!agentId) {
    return {
      status: 400 as const,
      body: {
        success: false,
        error: "No printer configured for this store. Please set up a printer in store settings.",
      },
    };
  }

  const data = await renderReceipt({ ...args, agentId });
  await sendToRelay(data, agentId, args.paymentMethod);

  await db
    .insert(schema.activityLogs)
    .values({
      userId: user.id,
      role: user.role,
      action: logAction,
      entityType: "sales",
      entityId: args.saleId,
      description: `${logNote} ${agentId}`,
    })
    .run();

  return { status: 200 as const, body: { success: true, message: "Job sent to till" } };
}

/**
 * Rebuilds, from the database, the same receipt data the POS builds from its cart.
 * Used by reprint, where the browser only knows the sale id.
 */
async function buildReceiptArgsFromSale(
  saleId: string
): Promise<{ args: PrintReceiptArgs } | { error: string; status: 400 | 404 }> {
  const sale = await db.select().from(schema.sales).where(eq(schema.sales.id, saleId)).get();
  if (!sale) return { error: "Sale not found", status: 404 };
  if (sale.status !== "completed") {
    return { error: "Only completed sales can be printed", status: 400 };
  }

  const store = await db.select().from(schema.stores).where(eq(schema.stores.id, sale.storeId)).get();

  const saleItems = await db.select().from(schema.saleItems).where(eq(schema.saleItems.saleId, saleId)).all();
  const items = [];
  for (const item of saleItems) {
    const product = await db.select().from(schema.products).where(eq(schema.products.id, item.productId)).get();
    const department = product
      ? await db.select().from(schema.departments).where(eq(schema.departments.id, product.departmentId)).get()
      : null;
    items.push({
      productId: item.productId,
      name: product?.name ?? "Unknown product",
      sku: product?.sku ?? "",
      size: item.size ?? undefined,
      color: item.color ?? undefined,
      variant: item.variant ?? undefined,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      availableQuantity: 0,
      departmentId: product?.departmentId ?? "",
      departmentName: department?.name ?? "",
    });
  }

  const discountRows = await db
    .select()
    .from(schema.saleDiscounts)
    .where(eq(schema.saleDiscounts.saleId, saleId))
    .all();

  // The cashier is whoever created the sale (the sales table has no user column).
  const created = await db
    .select()
    .from(schema.activityLogs)
    .where(and(eq(schema.activityLogs.action, "sale.created"), eq(schema.activityLogs.entityId, saleId)))
    .get();
  const cashier = created
    ? await db.select().from(schema.users).where(eq(schema.users.id, created.userId)).get()
    : null;

  const customer = sale.customerId
    ? await db.select().from(schema.customers).where(eq(schema.customers.id, sale.customerId)).get()
    : null;

  // The POS prints "Cash + Card" for split payments; the sale row only keeps the first method.
  let paymentMethod = sale.paymentMethod;
  if (sale.paymentSplits) {
    try {
      const splits = JSON.parse(sale.paymentSplits);
      if (Array.isArray(splits) && splits.length > 0) {
        paymentMethod = splits.map((p: any) => String(p.method)).join(" + ");
      }
    } catch {
      // keep the stored method
    }
  }

  return {
    args: {
      saleId,
      storeName: store?.name ?? "TD Holdings",
      storePhone: store?.phone || undefined,
      storeAddress: store?.address || undefined,
      customerName: customer?.name || undefined,
      cashierName: cashier?.name || cashier?.email || undefined,
      paymentMethod,
      amountReceived: sale.amountReceived ?? undefined,
      changeDue: sale.changeDue ?? undefined,
      items,
      discounts: discountRows.map((d) => ({
        productId: d.productId,
        discountAmount: d.discountAmount,
        reason: d.reason ?? undefined,
      })),
      total: sale.totalAmount,
      itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
      completedAt: sale.createdAt,
      agentId: "", // resolved from the sale's store
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/print/receipt — render the sale and hand it to the till (POS checkout).
// Mirrors `printReceipt` from convex/print.ts, including its return shape.
// ─────────────────────────────────────────────────────────────────────────────
printRoutes.post("/receipt", async (c) => {
  try {
    const user = getUser(c);
    const body = await c.req.json().catch(() => null);

    const parsed = parseReceiptArgs(body);
    if ("error" in parsed) {
      return c.json({ success: false, error: parsed.error }, 400);
    }

    // The sale's stored timestamp is the single source of truth. The browser's clock can
    // differ from the server's, which is what made receipts disagree with the sales records.
    const sale = await db.select().from(schema.sales).where(eq(schema.sales.id, parsed.saleId)).get();
    const args = sale ? { ...parsed, completedAt: sale.createdAt } : parsed;

    const result = await deliverReceipt(args, user, "print.receipt", "Receipt sent to till");
    return c.json(result.body, result.status);
  } catch (error) {
    console.error("Print error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/print/reprint/:saleId — Sales page "Reprint receipt". Same renderer, same
// delivery path as the POS; only the data comes from the saved sale instead of the cart.
// ─────────────────────────────────────────────────────────────────────────────
printRoutes.post("/reprint/:saleId", async (c) => {
  try {
    const user = getUser(c);
    const built = await buildReceiptArgsFromSale(c.req.param("saleId"));
    if ("error" in built) {
      return c.json({ success: false, error: built.error }, built.status);
    }

    const result = await deliverReceipt(built.args, user, "print.reprint", "Receipt reprinted on till");
    return c.json(result.body, result.status);
  } catch (error) {
    console.error("Reprint error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/print/agents — which tills the relay currently has connected.
// ─────────────────────────────────────────────────────────────────────────────
printRoutes.get("/agents", async (c) => {
  try {
    getUser(c);
    const connectedAgents = await fetchConnectedAgents();
    return c.json({ success: true, connectedAgents });
  } catch (error) {
    return c.json({
      success: false,
      connectedAgents: [],
      error: error instanceof Error ? error.message : "Relay unreachable",
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/print/test — send a plain test page to a store's till.
// Mirrors the `testPrint` action from the original convex/stores.ts.
// ─────────────────────────────────────────────────────────────────────────────
printRoutes.post("/test", async (c) => {
  try {
    getUser(c);
    const body = await c.req.json().catch(() => ({}) as any);
    const storeId: string | undefined = body?.storeId;
    if (!storeId) return c.json({ success: false, error: "storeId is required" }, 400);

    const store = await db
      .select()
      .from(schema.stores)
      .where(eq(schema.stores.id, storeId))
      .get();
    if (!store) return c.json({ success: false, error: "Store not found" }, 404);
    if (!store.printAgentId) {
      return c.json({ success: false, error: "No printer agent configured for this store" });
    }

    if (!RELAY_URL || !RELAY_SECRET) {
      return c.json({ success: false, error: "Relay not configured" });
    }

    const testReceiptData = `
==============================
      TEST PRINT
==============================
Store: ${store.name}
Agent ID: ${store.printAgentId}
Time: ${formatReceiptDateTime(Date.now())}
==============================
This is a test print to verify
the printer connection is working
correctly.
==============================
Thank you for testing!
    `.trim();

    const testData = Buffer.from(testReceiptData).toString("base64");

    const response = await fetch(`${RELAY_URL}/print/${store.printAgentId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RELAY_SECRET}`,
      },
      body: JSON.stringify({
        receiptData: testData,
        paymentMethod: "Test",
      }),
    });

    if (response.ok) {
      return c.json({ success: true, message: "Test print sent successfully!" });
    }

    const errorText = await response.text();
    return c.json({
      success: false,
      error: `Test print failed (${response.status}): ${errorText}`,
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Test print failed",
    });
  }
});