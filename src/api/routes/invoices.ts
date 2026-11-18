import { Hono } from "hono";
import { eq, and, desc } from "drizzle-orm";
import db from "../db/index.ts";
import * as schema from "../db/schema.ts";
import type { AuthEnv } from "../middleware/auth.ts";
import { getUser, requireRole } from "../auth.ts";
import { availableStock, consumeStockFifo } from "./stock.ts";

export const invoiceRoutes = new Hono<AuthEnv>();

// Frontend (migrated from Convex) uses `_id`, so expose it alongside `id`
const withId = <T extends { id: string }>(row: T) => ({ ...row, _id: row.id });

const docPrefix = (docType: string) =>
  docType === "quotation" ? "QUO" : docType === "proforma" ? "PRO" : "INV";

async function nextInvoiceNumber(docType: string) {
  const existing = await db
    .select()
    .from(schema.invoices)
    .where(eq(schema.invoices.docType, docType as any))
    .all();
  const nextNum = String(existing.length + 1).padStart(4, "0");
  return `${docPrefix(docType)}-${nextNum}`;
}

// GET /api/invoices
invoiceRoutes.get("/", async (c) => {
  try {
    getUser(c);
    const storeId = c.req.query("storeId");
    const docType = c.req.query("docType");
    const status = c.req.query("status");

    const conditions = [];
    if (storeId) conditions.push(eq(schema.invoices.storeId, storeId));
    if (docType) conditions.push(eq(schema.invoices.docType, docType as any));
    if (status) conditions.push(eq(schema.invoices.status, status as any));

    const query = db.select().from(schema.invoices).orderBy(desc(schema.invoices.createdAt));
    const allInvoices =
      conditions.length > 0 ? await query.where(and(...conditions)).all() : await query.all();
    return c.json({ invoices: allInvoices.map(withId) });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// GET /api/invoices/list/:storeId/:docType  (used by the list page)
invoiceRoutes.get("/list/:storeId/:docType", async (c) => {
  try {
    getUser(c);
    const storeId = c.req.param("storeId");
    const docType = c.req.param("docType");

    const rows = await db
      .select()
      .from(schema.invoices)
      .where(
        and(
          eq(schema.invoices.storeId, storeId),
          eq(schema.invoices.docType, docType as any)
        )
      )
      .orderBy(desc(schema.invoices.createdAt))
      .all();

    return c.json(rows.map(withId));
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// GET /api/invoices/next-number/:docType  -> the number the next document will get (preview only)
invoiceRoutes.get("/next-number/:docType", async (c) => {
  try {
    getUser(c);
    const docType = c.req.param("docType");
    if (!["quotation", "proforma", "invoice"].includes(docType)) return c.json({ error: "Invalid docType" }, 400);
    return c.json(await nextInvoiceNumber(docType));
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// GET /api/invoices/:id
invoiceRoutes.get("/:id", async (c) => {
  try {
    getUser(c);
    const id = c.req.param("id");
    const invoice = await db.select().from(schema.invoices).where(eq(schema.invoices.id, id)).get();
    // Frontend treats null as "not found"
    if (!invoice) return c.json(null);

    const items = await db
      .select()
      .from(schema.invoiceItems)
      .where(eq(schema.invoiceItems.invoiceId, id))
      .all();

    const itemsWithProducts = await Promise.all(
      items.map(async (item) => {
        const product = await db
          .select()
          .from(schema.products)
          .where(eq(schema.products.id, item.productId))
          .get();
        const availableQuantity = invoice.convertedToSaleId
          ? null
          : await availableStock(invoice.storeId, item.productId);
        return { ...withId(item), product: product ? withId(product) : null, availableQuantity };
      })
    );

    // The print templates read invoice.store; the detail page shows creator and source document.
    const store = await db.select().from(schema.stores).where(eq(schema.stores.id, invoice.storeId)).get();
    const creator = await db.select().from(schema.users).where(eq(schema.users.id, invoice.createdBy)).get();
    const source = invoice.convertedFromId
      ? await db.select().from(schema.invoices).where(eq(schema.invoices.id, invoice.convertedFromId)).get()
      : null;

    return c.json({
      ...withId(invoice),
      items: itemsWithProducts,
      store: store ? { name: store.name, address: store.address, phone: store.phone } : null,
      createdByName: creator?.name ?? null,
      convertedFrom: source ? { id: source.id, invoiceNumber: source.invoiceNumber, docType: source.docType } : null,
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// POST /api/invoices  -> returns the new invoice id
invoiceRoutes.post("/", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin", "manager"]);
    const body = await c.req.json();

    const {
      storeId,
      docType,
      customerId,
      customerName,
      customerPhone,
      items,
      discountTotal,
      validUntil,
      notes,
    } = body;

    if (!storeId || !["quotation", "proforma", "invoice"].includes(docType)) {
      return c.json({ error: "storeId and a valid docType are required" }, 400);
    }
    if (!Array.isArray(items) || items.length === 0) {
      return c.json({ error: "Add at least one item" }, 400);
    }

    // Same rule as POST /api/sales: per-line manualDiscount is a fixed amount,
    // clamped to the line total. Falls back to a document-level discount for old clients.
    const gross = items.reduce((sum: number, item: any) => sum + item.unitPrice * item.quantity, 0);
    const lineDiscounts = items.reduce((sum: number, item: any) => {
      const lineGross = item.unitPrice * item.quantity;
      return sum + Math.min(Math.max(Number(item.manualDiscount) || 0, 0), lineGross);
    }, 0);
    const appliedDiscount = items.some((i: any) => i.manualDiscount != null)
      ? lineDiscounts
      : Math.min(Math.max(Number(discountTotal) || 0, 0), gross);

    const invoiceNumber = await nextInvoiceNumber(docType);

    const invoice = await db
      .insert(schema.invoices)
      .values({
        storeId,
        docType,
        invoiceNumber,
        customerId,
        customerName,
        customerPhone,
        totalAmount: gross - appliedDiscount,
        discountTotal: appliedDiscount,
        validUntil,
        notes,
        createdBy: user.id,
        status: "unpaid",
      })
      .returning()
      .get();

    if (!invoice) return c.json({ error: "Failed to create invoice" }, 500);

    for (const item of items) {
      await db
        .insert(schema.invoiceItems)
        .values({
          invoiceId: invoice.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          size: item.size,
          color: item.color,
          variant: item.variant,
        })
        .run();
    }

    // Frontend navigates with this value as the route id
    return c.json(invoice.id, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// PATCH /api/invoices/:id/pay — mark a document as paid
invoiceRoutes.patch("/:id/pay", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin", "manager", "cashier"]);
    const id = c.req.param("id");

    const invoice = await db.select().from(schema.invoices).where(eq(schema.invoices.id, id)).get();
    if (!invoice) return c.json({ error: "Document not found" }, 404);
    if (invoice.status === "cancelled") {
      return c.json({ error: "Cannot mark a cancelled document as paid" }, 400);
    }

    await db
      .update(schema.invoices)
      .set({ status: "paid", paidAt: Date.now(), updatedAt: Date.now() })
      .where(eq(schema.invoices.id, id))
      .run();

    await db
      .insert(schema.activityLogs)
      .values({
        userId: user.id,
        role: user.role,
        action: "invoice.markPaid",
        entityType: "invoices",
        entityId: id,
        description: `Marked ${invoice.invoiceNumber} as paid`,
      })
      .run();

    const updated = await db.select().from(schema.invoices).where(eq(schema.invoices.id, id)).get();
    return c.json({ success: true, invoice: updated ? withId(updated) : null });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// PATCH /api/invoices/:id/cancel — cancel a document
invoiceRoutes.patch("/:id/cancel", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin", "manager", "cashier"]);
    const id = c.req.param("id");

    const invoice = await db.select().from(schema.invoices).where(eq(schema.invoices.id, id)).get();
    if (!invoice) return c.json({ error: "Document not found" }, 404);

    let reason: string | undefined;
    try {
      const body = await c.req.json();
      reason = body?.reason;
    } catch {
      reason = undefined;
    }

    await db
      .update(schema.invoices)
      .set({ status: "cancelled", updatedAt: Date.now() })
      .where(eq(schema.invoices.id, id))
      .run();

    await db
      .insert(schema.activityLogs)
      .values({
        userId: user.id,
        role: user.role,
        action: "invoice.cancel",
        entityType: "invoices",
        entityId: id,
        description: `Cancelled ${invoice.invoiceNumber}${reason ? `: ${reason}` : ""}`,
      })
      .run();

    const updated = await db.select().from(schema.invoices).where(eq(schema.invoices.id, id)).get();
    return c.json({ success: true, invoice: updated ? withId(updated) : null });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// PATCH /api/invoices/:id
invoiceRoutes.patch("/:id", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin", "manager"]);
    const id = c.req.param("id");
    const body = await c.req.json();
    // Only descriptive fields are editable here; status, totals and links go through their own routes.
    const allowed = ["customerName", "customerPhone", "notes", "validUntil"] as const;
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    for (const key of allowed) if (key in body) patch[key] = body[key];
    await db.update(schema.invoices).set(patch).where(eq(schema.invoices.id, id)).run();
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// POST /api/invoices/:id/convert  -> returns the new invoice id
invoiceRoutes.post("/:id/convert", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin", "manager"]);
    const id = c.req.param("id");
    const body = await c.req.json();
    // Frontend sends `toDocType`; keep `docType` for backwards compatibility
    const docType: string | undefined = body.toDocType ?? body.docType;
    if (!docType) return c.json({ error: "Target document type is required" }, 400);

    const invoice = await db.select().from(schema.invoices).where(eq(schema.invoices.id, id)).get();
    if (!invoice) return c.json({ error: "Invoice not found" }, 404);

    const invoiceNumber = await nextInvoiceNumber(docType);

    const newInvoice = await db
      .insert(schema.invoices)
      .values({
        storeId: invoice.storeId,
        docType: docType as any,
        invoiceNumber,
        customerId: invoice.customerId,
        customerName: invoice.customerName,
        customerPhone: invoice.customerPhone,
        status: "unpaid",
        totalAmount: invoice.totalAmount,
        discountTotal: invoice.discountTotal,
        validUntil: invoice.validUntil,
        notes: invoice.notes,
        createdBy: user.id,
        convertedFromId: id,
      })
      .returning()
      .get();

    if (!newInvoice) return c.json({ error: "Failed to convert document" }, 500);

    // Copy line items so the converted document isn't empty
    const items = await db
      .select()
      .from(schema.invoiceItems)
      .where(eq(schema.invoiceItems.invoiceId, id))
      .all();

    for (const item of items) {
      await db
        .insert(schema.invoiceItems)
        .values({
          invoiceId: newInvoice.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          size: item.size,
          color: item.color,
          variant: item.variant,
        })
        .run();
    }

    return c.json(newInvoice.id, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// POST /api/invoices/:id/convert-to-sale  -> checks stock, creates the sale and deducts batches
invoiceRoutes.post("/:id/convert-to-sale", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin", "manager", "cashier"]);
    const id = c.req.param("id");

    const invoice = await db.select().from(schema.invoices).where(eq(schema.invoices.id, id)).get();
    if (!invoice) return c.json({ error: "Invoice not found" }, 404);
    if (invoice.docType !== "invoice") return c.json({ error: "Only invoices can be converted to a sale" }, 400);
    if (invoice.status !== "paid") return c.json({ error: "Mark the invoice as paid first" }, 400);
    if (invoice.convertedToSaleId) return c.json({ error: "This invoice has already been converted" }, 400);

    const items = await db.select().from(schema.invoiceItems).where(eq(schema.invoiceItems.invoiceId, id)).all();

    // Check every product before writing anything. Lines of the same product share one stock pool.
    const demand = new Map<string, number>();
    for (const item of items) demand.set(item.productId, (demand.get(item.productId) ?? 0) + item.quantity);

    const shortages: { productId: string; name: string; requested: number; available: number }[] = [];
    for (const [productId, requested] of demand) {
      const available = await availableStock(invoice.storeId, productId);
      if (available < requested) {
        const product = await db.select().from(schema.products).where(eq(schema.products.id, productId)).get();
        shortages.push({ productId, name: product?.name ?? "Unknown product", requested, available });
      }
    }
    if (shortages.length > 0) {
      const summary = shortages.map((s) => `${s.name} (need ${s.requested}, have ${s.available})`).join(", ");
      return c.json({ error: `Not enough stock: ${summary}`, shortages }, 409);
    }

    const sale = await db
      .insert(schema.sales)
      .values({
        storeId: invoice.storeId,
        customerId: invoice.customerId,
        totalAmount: invoice.totalAmount,
        discountTotal: invoice.discountTotal || 0,
        paymentMethod: "Invoice",
        status: "completed",
      })
      .returning()
      .get();
    if (!sale) return c.json({ error: "Failed to create sale" }, 500);

    for (const item of items) {
      const saleItem = await db
        .insert(schema.saleItems)
        .values({
          saleId: sale.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          size: item.size,
          color: item.color,
          variant: item.variant,
        })
        .returning()
        .get();
      if (!saleItem) continue;

      await consumeStockFifo({
        storeId: invoice.storeId,
        saleItemId: saleItem.id,
        productId: item.productId,
        quantity: item.quantity,
        size: item.size,
      });
    }

    await db
      .update(schema.invoices)
      .set({ convertedToSaleId: sale.id, paidAt: invoice.paidAt ?? Date.now(), updatedAt: Date.now() })
      .where(eq(schema.invoices.id, id))
      .run();

    await db
      .insert(schema.activityLogs)
      .values({
        userId: user.id,
        role: user.role,
        action: "invoice.convertToSale",
        entityType: "invoices",
        entityId: id,
        description: `Converted ${invoice.invoiceNumber} to a sale`,
      })
      .run();

    return c.json(sale.id, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});