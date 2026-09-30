import { Hono } from "hono";
import { eq, and, desc, sql } from "drizzle-orm";
import db from "../db/index.ts";
import * as schema from "../db/schema.ts";
import { AuthEnv } from "../middleware/auth.ts";
import { getUser, requireRole } from "../auth.ts";

export const invoiceRoutes = new Hono<AuthEnv>();

// GET /api/invoices
invoiceRoutes.get("/", async (c) => {
  try {
    const user = getUser(c);
    const storeId = c.req.query("storeId");
    const docType = c.req.query("docType");
    const status = c.req.query("status");

    let conditions = [];
    if (storeId) conditions.push(eq(schema.invoices.storeId, storeId));
    if (docType) conditions.push(eq(schema.invoices.docType, docType as any));
    if (status) conditions.push(eq(schema.invoices.status, status as any));

    const query = db.select().from(schema.invoices).orderBy(desc(schema.invoices.createdAt));
    const allInvoices = conditions.length > 0 ? await query.where(and(...conditions)).all() : await query.all();
    return c.json({ invoices: allInvoices });
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
    if (!invoice) return c.json({ error: "Invoice not found" }, 404);

    const items = await db.select().from(schema.invoiceItems)
      .where(eq(schema.invoiceItems.invoiceId, id)).all();

    const itemsWithProducts = await Promise.all(items.map(async (item) => {
      const product = await db.select().from(schema.products)
        .where(eq(schema.products.id, item.productId)).get();
      return { ...item, product: product || null };
    }));

    return c.json({ invoice: { ...invoice, items: itemsWithProducts } });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// POST /api/invoices
invoiceRoutes.post("/", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin", "manager"]);
    const body = await c.req.json();

    const { storeId, docType, customerId, customerName, customerPhone, items, discountTotal, validUntil, notes } = body;

    // Generate invoice number
    const prefix = docType === "quotation" ? "QUO" : docType === "proforma" ? "PRO" : "INV";
    const existing = await db.select().from(schema.invoices)
      .where(eq(schema.invoices.docType, docType)).all();
    const nextNum = String(existing.length + 1).padStart(4, "0");
    const invoiceNumber = `${prefix}-${nextNum}`;

    const totalAmount = items.reduce((sum: number, item: any) => sum + (item.unitPrice * item.quantity), 0);

    const invoice = await db.insert(schema.invoices).values({
      storeId, docType, invoiceNumber,
      customerId, customerName, customerPhone,
      totalAmount: totalAmount - (discountTotal || 0),
      discountTotal: discountTotal || 0,
      validUntil, notes,
      createdBy: user.id,
      status: "unpaid",
    }).returning().get();

    if (!invoice) return c.json({ error: "Failed to create invoice" }, 500);

    for (const item of items) {
      await db.insert(schema.invoiceItems).values({
        invoiceId: invoice.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        size: item.size, color: item.color, variant: item.variant,
      }).run();
    }

    return c.json({ invoice }, 201);
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

    await db.update(schema.invoices)
      .set({ status: "paid", paidAt: Date.now(), updatedAt: Date.now() })
      .where(eq(schema.invoices.id, id))
      .run();

    await db.insert(schema.activityLogs).values({
      userId: user.id, role: user.role, action: "invoice.markPaid",
      entityType: "invoices", entityId: id,
      description: `Marked ${invoice.invoiceNumber} as paid`,
    }).run();

    const updated = await db.select().from(schema.invoices).where(eq(schema.invoices.id, id)).get();
    return c.json({ success: true, invoice: updated });
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

    await db.update(schema.invoices)
      .set({ status: "cancelled", updatedAt: Date.now() })
      .where(eq(schema.invoices.id, id))
      .run();

    await db.insert(schema.activityLogs).values({
      userId: user.id, role: user.role, action: "invoice.cancel",
      entityType: "invoices", entityId: id,
      description: `Cancelled ${invoice.invoiceNumber}${reason ? `: ${reason}` : ""}`,
    }).run();

    const updated = await db.select().from(schema.invoices).where(eq(schema.invoices.id, id)).get();
    return c.json({ success: true, invoice: updated });
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
    await db.update(schema.invoices).set(body).where(eq(schema.invoices.id, id)).run();
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// POST /api/invoices/:id/convert
invoiceRoutes.post("/:id/convert", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin", "manager"]);
    const id = c.req.param("id");
    const { docType } = await c.req.json();

    const invoice = await db.select().from(schema.invoices).where(eq(schema.invoices.id, id)).get();
    if (!invoice) return c.json({ error: "Invoice not found" }, 404);

    // Generate new number for new doc type
    const prefix = docType === "quotation" ? "QUO" : docType === "proforma" ? "PRO" : "INV";
    const existing = await db.select().from(schema.invoices)
      .where(eq(schema.invoices.docType, docType)).all();
    const nextNum = String(existing.length + 1).padStart(4, "0");

    const newInvoice = await db.insert(schema.invoices).values({
      storeId: invoice.storeId,
      docType,
      invoiceNumber: `${prefix}-${nextNum}`,
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
    }).returning().get();

    return c.json({ invoice: newInvoice }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// POST /api/invoices/:id/convert-to-sale
invoiceRoutes.post("/:id/convert-to-sale", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin", "manager", "cashier"]);
    const id = c.req.param("id");

    const invoice = await db.select().from(schema.invoices).where(eq(schema.invoices.id, id)).get();
    if (!invoice) return c.json({ error: "Invoice not found" }, 404);

    const items = await db.select().from(schema.invoiceItems)
      .where(eq(schema.invoiceItems.invoiceId, id)).all();

    const sale = await db.insert(schema.sales).values({
      storeId: invoice.storeId,
      customerId: invoice.customerId,
      totalAmount: invoice.totalAmount,
      discountTotal: invoice.discountTotal || 0,
      paymentMethod: "Invoice",
      status: "completed",
    }).returning().get();

    if (!sale) return c.json({ error: "Failed to create sale" }, 500);

    for (const item of items) {
      await db.insert(schema.saleItems).values({
        saleId: sale.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        size: item.size, color: item.color, variant: item.variant,
      }).run();
    }

    await db.update(schema.invoices).set({
      status: "paid",
      paidAt: Date.now(),
      convertedToSaleId: sale.id,
    }).where(eq(schema.invoices.id, id)).run();

    return c.json({ sale }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});