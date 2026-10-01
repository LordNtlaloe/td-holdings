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
import { eq } from "drizzle-orm";
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
printRoutes.post("/receipt", async (c) => {
  try {
    const user = getUser(c);
    const body = await c.req.json().catch(() => null);

    const parsed = parseReceiptArgs(body);
    if ("error" in parsed) {
      return c.json({ success: false, error: parsed.error }, 400);
    }

    const agentId = await resolveAgentId(parsed, parsed.saleId);
    if (!agentId) {
      return c.json(
        {
          success: false,
          error:
            "No printer configured for this store. Please set up a printer in store settings.",
        },
        400
      );
    }

    const data = await renderReceipt({ ...parsed, agentId });
    await sendToRelay(data, agentId, parsed.paymentMethod);

    await db
      .insert(schema.activityLogs)
      .values({
        userId: user.id,
        role: user.role,
        action: "print.receipt",
        entityType: "sales",
        entityId: parsed.saleId,
        description: `Receipt sent to till ${agentId}`,
      })
      .run();

    return c.json({ success: true, message: "Job sent to till" });
  } catch (error) {
    console.error("Print error:", error);
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
Time: ${new Date().toLocaleString()}
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
