import { Hono } from "hono";
import { and, eq, inArray } from "drizzle-orm";
import db from "../db/index.ts";
import * as schema from "../db/schema.ts";
import { AuthEnv } from "../middleware/auth.ts";
import { getUser } from "../auth.ts";
import { describeTarget, listCupsQueues, parsePrintTarget, sendToPrinter } from "../print-transport.ts";
import {
  buildReceiptBlocks,
  renderReceiptEscPos,
  renderReceiptText,
  type ReceiptInput,
  type ReceiptItem,
} from "../receipt.ts";

export const printRoutes = new Hono<AuthEnv>();

/**
 * Characters per line: 80mm paper fits 48, 58mm fits 32.
 *
 * 80mm (48) is the default because it is what receipt printers are normally
 * spec'd at — printing 32 columns on 80mm paper leaves the right third of the
 * paper blank. A caller can override per request with `paperWidth`.
 */
const DEFAULT_WIDTH = 48;

/**
 * Whether a payment method should kick the cash drawer.
 *
 * Matched exactly rather than by substring: "Ecocash" is mobile money, but a
 * naive `/cash/i` test treats it as cash and pops the drawer on every Ecocash
 * sale. Split payments arrive joined with " + ".
 */
function isCashPayment(method: string | null | undefined): boolean {
  return String(method ?? "")
    .split("+")
    .map((part) => part.trim().toLowerCase())
    .some((part) => part === "cash");
}

/** Receipts show only the cashier's first name; a full name crowds the line. */
function firstName(value: string | null | undefined): string | null {
  const trimmed = String(value ?? "").trim();
  return trimmed ? trimmed.split(/\s+/)[0] : null;
}

/**
 * The cashier who actually served the sale, taken from the activity log rather
 * than from whoever happens to be printing. A receipt reprinted from the Sales
 * page is usually printed by a manager, and it should still name the cashier
 * who made the sale. Falls back to the caller.
 *
 * Both action names are accepted: the migrated Convex data logs `sale.create`,
 * while sales created by this API log `sale.created`.
 */
async function resolveCashier(
  saleId: string,
  fallback: string | null
): Promise<string | null> {
  const log = await db
    .select()
    .from(schema.activityLogs)
    .where(
      and(
        eq(schema.activityLogs.entityId, saleId),
        inArray(schema.activityLogs.action, ["sale.created", "sale.create"])
      )
    )
    .get();
  if (!log) return fallback;

  const cashier = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, log.userId))
    .get();
  return cashier?.name ?? cashier?.email ?? fallback;
}

/**
 * Build the receipt from the database rather than the request body, so a
 * manipulated client payload can never print a receipt that disagrees with the
 * recorded sale.
 */
async function loadReceipt(
  saleId: string,
  fallbackCashier?: string | null
): Promise<{ receipt: ReceiptInput; printAgentId: string | null } | null> {
  const sale = await db.select().from(schema.sales).where(eq(schema.sales.id, saleId)).get();
  if (!sale) return null;

  const [store, items, products, departments] = await Promise.all([
    db.select().from(schema.stores).where(eq(schema.stores.id, sale.storeId)).get(),
    db.select().from(schema.saleItems).where(eq(schema.saleItems.saleId, saleId)).all(),
    db.select().from(schema.products).all(),
    db.select().from(schema.departments).all(),
  ]);

  const customer = sale.customerId
    ? await db
        .select()
        .from(schema.customers)
        .where(eq(schema.customers.id, sale.customerId))
        .get()
    : undefined;

  const productById = new Map(products.map((product) => [product.id, product]));
  const departmentById = new Map(departments.map((department) => [department.id, department.name]));
  const cashierName = firstName(await resolveCashier(saleId, fallbackCashier ?? null));

  // A sale normally sits in one department, but can span several. Collect the
  // distinct names so the header stays truthful either way.
  const saleDepartments = [
    ...new Set(
      items
        .map((item) => {
          const product = productById.get(item.productId);
          return product ? departmentById.get(product.departmentId) ?? null : null;
        })
        .filter((name): name is string => Boolean(name))
    ),
  ].join(", ");

  let paymentSplits: Array<{ method: string; amount: number }> | null = null;
  if (sale.paymentSplits) {
    try {
      const parsed = JSON.parse(sale.paymentSplits);
      if (Array.isArray(parsed)) {
        paymentSplits = parsed.map((split: any) => ({
          method: String(split?.method ?? "Unknown"),
          amount: Number(split?.amount ?? 0),
        }));
      }
    } catch {
      paymentSplits = null;
    }
  }

  return {
    printAgentId: store?.printAgentId ?? null,
    receipt: {
      storeName: store?.name ?? "Store",
      storeAddress: store?.address ?? null,
      storePhone: store?.phone ?? null,
      department: saleDepartments || null,
      saleId: sale.id,
      createdAt: sale.createdAt,
      paymentMethod: sale.paymentMethod,
      paymentSplits,
      amountReceived: sale.amountReceived,
      changeDue: sale.changeDue,
      discountTotal: sale.discountTotal,
      cashierName: cashierName,
      customerName: customer?.name ?? null,
      items: items.map((item) => {
        const product = productById.get(item.productId);
        return {
          name: product?.name ?? "Unknown product",
          sku: product?.sku ?? null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          size: item.size,
          color: item.color,
          variant: item.variant,
        };
      }),
      // Only an actual cash payment should pop the drawer.
      openCashDrawer: isCashPayment(sale.paymentMethod),
    },
  };
}

async function logPrint(
  user: { id: string; role: string },
  action: string,
  saleId: string,
  description: string
) {
  await db
    .insert(schema.activityLogs)
    .values({
      userId: user.id,
      role: user.role,
      action,
      entityType: "sales",
      entityId: saleId,
      description,
    })
    .run();
}

// GET /api/print/cups-queues — the CUPS queues on the machine running the
// server, so the settings page can suggest valid `cups:<queue>` values instead
// of making the user guess.
printRoutes.get("/cups-queues", async (c) => {
  try {
    getUser(c);
    return c.json({ queues: await listCupsQueues() });
  } catch (error: any) {
    return c.json({ queues: [], error: error.message });
  }
});

// GET /api/print/receipt/:saleId/preview — the receipt as plain text.
// Lets the layout be checked against real sales without any printer attached.
printRoutes.get("/receipt/:saleId/preview", async (c) => {
  try {
    getUser(c);
    const width = Number(c.req.query("width")) || DEFAULT_WIDTH;
    const loaded = await loadReceipt(c.req.param("saleId"));
    if (!loaded) return c.json({ error: "Sale not found" }, 404);

    return c.json({
      saleId: loaded.receipt.saleId,
      printAgentId: loaded.printAgentId,
      target: describeTarget(parsePrintTarget(loaded.printAgentId)),
      width,
      receiptText: renderReceiptText(buildReceiptBlocks(loaded.receipt), width),
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// POST /api/print/receipt — render the sale and send it to the store's printer.
printRoutes.post("/receipt", async (c) => {
  try {
    const user = getUser(c);
    const body = await c.req.json().catch(() => ({}) as any);
    const saleId: string | undefined = body?.saleId;
    if (!saleId) return c.json({ error: "saleId is required" }, 400);

    const width = Number(body?.paperWidth) || DEFAULT_WIDTH;
    const loaded = await loadReceipt(saleId, user.name ?? user.email);
    if (!loaded) return c.json({ error: "Sale not found" }, 404);

    const blocks = buildReceiptBlocks(loaded.receipt);
    const receiptText = renderReceiptText(blocks, width);
    const target = parsePrintTarget(loaded.printAgentId);

    try {
      const result = await sendToPrinter(target, renderReceiptEscPos(blocks, width));
      await logPrint(
        user,
        result.sent ? "print.receipt" : "print.failed",
        saleId,
        `Receipt ${result.detail}`
      );

      // A dry-run target (no printer configured) and a legacy agent id both
      // resolve without throwing but send nothing. Reporting those as a success
      // would tell the cashier a receipt printed when it never left the server.
      if (!result.sent) {
        return c.json(
          {
            success: false,
            sent: false,
            target: describeTarget(target),
            bytes: 0,
            error: result.detail,
            receiptText,
          },
          502
        );
      }

      return c.json({
        success: true,
        sent: true,
        target: describeTarget(target),
        bytes: result.bytes,
        message: result.detail,
        receiptText,
      });
    } catch (printError: any) {
      await logPrint(
        user,
        "print.failed",
        saleId,
        `Receipt failed for ${describeTarget(target)}: ${printError.message}`
      );
      return c.json(
        {
          success: false,
          sent: false,
          target: describeTarget(target),
          error: `Could not reach the printer: ${printError.message}`,
          receiptText,
        },
        502
      );
    }
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// POST /api/print/test — send a self-test page to a store's printer.
// Accepts an optional hard-coded `items` array so a realistic multi-line basket
// can be exercised without creating a sale, and `logActivity: false` to leave
// the activity log untouched when only the printer is being tested.
printRoutes.post("/test", async (c) => {
  try {
    const user = getUser(c);
    const body = await c.req.json().catch(() => ({}) as any);
    const storeId: string | undefined = body?.storeId;
    const width = Number(body?.paperWidth) || DEFAULT_WIDTH;

    const store = storeId
      ? await db.select().from(schema.stores).where(eq(schema.stores.id, storeId)).get()
      : undefined;
    if (storeId && !store) return c.json({ error: "Store not found" }, 404);

    const target = parsePrintTarget(store?.printAgentId);

    const items: ReceiptItem[] =
      Array.isArray(body?.items) && body.items.length > 0
        ? body.items.map((item: any) => ({
            name: String(item?.name ?? "Unknown product"),
            sku: item?.sku ?? null,
            quantity: Number(item?.quantity) || 1,
            unitPrice: Number(item?.unitPrice) || 0,
            size: item?.size ?? null,
            color: item?.color ?? null,
            variant: item?.variant ?? null,
            departmentName: item?.departmentName ?? null,
          }))
        : [{ name: "Test print", quantity: 1, unitPrice: 0 }];

    const blocks = buildReceiptBlocks({
      storeName: store?.name ?? "TD Holdings",
      storeAddress: store?.address ?? null,
      storePhone: store?.phone ?? null,
      department: body?.department ? String(body.department) : null,
      saleId: body?.saleId ? String(body.saleId) : "TEST-0000",
      createdAt: Date.now(),
      paymentMethod: body?.paymentMethod ? String(body.paymentMethod) : "Cash",
      amountReceived: body?.amountReceived != null ? Number(body.amountReceived) : undefined,
      changeDue: body?.changeDue != null ? Number(body.changeDue) : undefined,
      items,
      cashierName: firstName(user.name ?? user.email),
      customerName: body?.customerName ? String(body.customerName) : "Printer test",
      footer: body?.footer ? String(body.footer) : "Printer test successful",
      openCashDrawer: false,
    });

    const result = await sendToPrinter(target, renderReceiptEscPos(blocks, width));

    if (body?.logActivity !== false) {
      await logPrint(
        user,
        result.sent ? "print.test" : "print.failed",
        "TEST-0000",
        `Test print ${result.detail}`
      );
    }

    // As with a receipt, a target that sends nothing must not be reported as a
    // success.
    if (!result.sent) {
      return c.json(
        {
          success: false,
          sent: false,
          target: describeTarget(target),
          bytes: 0,
          error: result.detail,
          receiptText: renderReceiptText(blocks, width),
        },
        502
      );
    }

    return c.json({
      success: true,
      sent: true,
      target: describeTarget(target),
      bytes: result.bytes,
      message: result.detail,
      receiptText: renderReceiptText(blocks, width),
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 502);
  }
});
