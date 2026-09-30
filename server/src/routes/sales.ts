import { Hono } from "hono";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import db from "../db/index.ts";
import * as schema from "../db/schema.ts";
import { AuthEnv } from "../middleware/auth.ts";
import { getUser, requireRole } from "../auth.ts";

export const salesRoutes = new Hono<AuthEnv>();

// Reverse a completed sale: restore batch stock, record the cancellation,
// write a reverse ledger entry and log the activity.
type ReverseResult = { ok: true } | { ok: false; error: string; code: 400 | 404 };

async function reverseCompletedSale(
  user: { id: string; role: string },
  id: string,
  targetStatus: "voided" | "refunded",
  reason?: string
): Promise<ReverseResult> {
  const sale = await db.select().from(schema.sales).where(eq(schema.sales.id, id)).get();
  if (!sale) return { ok: false, error: "Sale not found", code: 404 };
  if (sale.status !== "completed") {
    return { ok: false, error: "Sale is not completed", code: 400 };
  }

  const originalData = JSON.stringify(sale);

  await db.update(schema.sales).set({
    status: targetStatus,
    cancelledAt: Date.now(),
    cancelledBy: user.id,
    cancelledReason: reason || "No reason provided",
  }).where(eq(schema.sales.id, id)).run();

  // Restore batches from sale item batches (mirrors /:id/cancel)
  const items = await db.select().from(schema.saleItems)
    .where(eq(schema.saleItems.saleId, id)).all();

  for (const si of items) {
    const itemBatches = await db.select().from(schema.saleItemBatches)
      .where(eq(schema.saleItemBatches.saleItemId, si.id)).all();

    for (const ib of itemBatches) {
      const batch = await db.select().from(schema.batches)
        .where(eq(schema.batches.id, ib.batchId)).get();
      if (batch) {
        await db.update(schema.batches)
          .set({ quantity: batch.quantity + ib.quantity })
          .where(eq(schema.batches.id, ib.batchId)).run();
      }
    }
  }

  await db.insert(schema.cancelledSales).values({
    originalSaleId: id,
    cancelledSaleId: id,
    cancelledAt: Date.now(),
    cancelledBy: user.id,
    reason: reason || "No reason",
    originalData,
  }).run();

  await db.insert(schema.ledgerEntries).values({
    storeId: sale.storeId,
    type: "expense",
    category: "cancellation",
    amount: sale.totalAmount,
    referenceType: "cancellation",
    cancelledSaleId: id,
    date: Date.now(),
  }).run();

  await db.insert(schema.activityLogs).values({
    userId: user.id,
    role: user.role,
    action: targetStatus === "voided" ? "sale.voided" : "sale.refunded",
    entityType: "sales",
    entityId: id,
    description: `Sale ${targetStatus}: ${reason || "No reason"}`,
  }).run();

  return { ok: true };
}

// GET /api/sales — list sales
salesRoutes.get("/", async (c) => {
  try {
    const user = getUser(c);
    const storeId = c.req.query("storeId");
    const status = c.req.query("status");
    const startDate = c.req.query("startDate");
    const endDate = c.req.query("endDate");

    let conditions = [];
    if (storeId) conditions.push(eq(schema.sales.storeId, storeId));
    if (status) conditions.push(eq(schema.sales.status, status as any));
    if (startDate) conditions.push(gte(schema.sales.createdAt, parseInt(startDate)));
    if (endDate) conditions.push(lte(schema.sales.createdAt, parseInt(endDate)));

    const query = db.select().from(schema.sales).orderBy(desc(schema.sales.createdAt));
    const allSales = conditions.length > 0
      ? await query.where(and(...conditions)).all()
      : await query.all();

    return c.json({ sales: allSales });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// ─── Shared enrichment ─────────────────────────────────────────────────────
// The Sales page renders full rows (store, customer, line items with product
// and department names), so we bulk-load the reference tables once and join in
// memory rather than issuing a query per sale.

type SaleStatus = "completed" | "refunded" | "voided" | "cancelled";

// Only the fields the Sales UI actually reads are projected onto the embedded
// store/customer objects. Embedding the full rows added ~1 MB to the response.
function slimStore(store: typeof schema.stores.$inferSelect | undefined) {
  return store
    ? { _id: store.id, name: store.name, address: store.address, phone: store.phone }
    : null;
}

function slimCustomer(customer: typeof schema.customers.$inferSelect | undefined) {
  return customer
    ? { _id: customer.id, name: customer.name, phone: customer.phone, email: customer.email }
    : null;
}

async function loadEnrichedSales(opts: { storeId?: string; status?: SaleStatus } = {}) {
  const conditions = [];
  if (opts.storeId) conditions.push(eq(schema.sales.storeId, opts.storeId));
  if (opts.status) conditions.push(eq(schema.sales.status, opts.status));

  let salesQuery = db.select().from(schema.sales);
  if (conditions.length > 0) salesQuery = salesQuery.where(and(...conditions)) as any;

  // Fetched concurrently — awaiting the sales page and the lookup tables one
  // after another used to roughly double the wall-clock time of this endpoint.
  const [salesRows, allProducts, allDepartments, allStores, allCustomers, allItems] =
    await Promise.all([
      salesQuery.orderBy(desc(schema.sales.createdAt)).all(),
      db.select().from(schema.products).all(),
      db.select().from(schema.departments).all(),
      db.select().from(schema.stores).all(),
      db.select().from(schema.customers).all(),
      db.select().from(schema.saleItems).all(),
    ]);

  const productById = new Map(allProducts.map((p) => [p.id, p]));
  const departmentNameById = new Map(allDepartments.map((d) => [d.id, d.name]));
  const storeById = new Map(allStores.map((s) => [s.id, s]));
  const customerById = new Map(allCustomers.map((cu) => [cu.id, cu]));

  const saleIds = new Set(salesRows.map((s) => s.id));
  const itemsBySale = new Map<string, any[]>();

  for (const item of allItems) {
    if (!saleIds.has(item.saleId)) continue;
    const product = productById.get(item.productId);
    const departmentId = product?.departmentId ?? null;
    const enrichedItem = {
      ...item,
      product: product ? { _id: product.id, name: product.name, sku: product.sku } : null,
      productName: product?.name ?? "Unknown",
      departmentId,
      departmentName: departmentId ? departmentNameById.get(departmentId) ?? null : null,
    };
    const existing = itemsBySale.get(item.saleId);
    if (existing) existing.push(enrichedItem);
    else itemsBySale.set(item.saleId, [enrichedItem]);
  }

  return salesRows.map((sale) => {
    const items = itemsBySale.get(sale.id) ?? [];
    const departments = [
      ...new Set(items.map((i) => i.departmentName).filter((d): d is string => Boolean(d))),
    ];
    return {
      ...sale,
      store: slimStore(storeById.get(sale.storeId)),
      customer: slimCustomer(sale.customerId ? customerById.get(sale.customerId) : undefined),
      items,
      departments,
    };
  });
}

// GET /api/sales/completed — every completed sale, fully enriched.
// NOTE: must be registered before `/:id` or that route would treat "completed"
// as a sale id.
salesRoutes.get("/completed", async (c) => {
  try {
    getUser(c);
    const sales = await loadEnrichedSales({ status: "completed" });
    return c.json({ sales });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// GET /api/sales/by-store/:storeId — enriched sales for one store.
salesRoutes.get("/by-store/:storeId", async (c) => {
  try {
    getUser(c);
    const sales = await loadEnrichedSales({ storeId: c.req.param("storeId") });
    return c.json({ sales });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// GET /api/sales/by-payment-method — revenue split by tender type.
salesRoutes.get("/by-payment-method", async (c) => {
  try {
    getUser(c);
    const { storeId, dateFrom, dateTo } = c.req.query();

    const conditions = [eq(schema.sales.status, "completed" as SaleStatus)];
    if (storeId) conditions.push(eq(schema.sales.storeId, storeId));
    if (dateFrom) conditions.push(gte(schema.sales.createdAt, parseInt(dateFrom)));
    if (dateTo) conditions.push(lte(schema.sales.createdAt, parseInt(dateTo)));

    const rows = await db.select().from(schema.sales).where(and(...conditions)).all();

    // Track both money and transaction count; the Sales page plots the count.
    const byMethod = new Map<string, { totalAmount: number; count: number }>();
    for (const row of rows) {
      const entry = byMethod.get(row.paymentMethod) ?? { totalAmount: 0, count: 0 };
      entry.totalAmount += row.totalAmount;
      entry.count += 1;
      byMethod.set(row.paymentMethod, entry);
    }

    const breakdown = [...byMethod.entries()]
      .map(([method, totals]) => ({
        method,
        totalAmount: totals.totalAmount,
        count: totals.count,
      }))
      .sort((a, b) => b.count - a.count);

    // Single-key object so the API client unwraps it to a bare array.
    return c.json({ breakdown });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// GET /api/sales/product-sales — per-product totals within a date range,
// each with its own payment-method split. Powers "Today's Product Sales".
salesRoutes.get("/product-sales", async (c) => {
  try {
    getUser(c);
    const { storeId, dateFrom, dateTo, departmentId } = c.req.query();

    const conditions = [eq(schema.sales.status, "completed" as SaleStatus)];
    if (storeId) conditions.push(eq(schema.sales.storeId, storeId));
    if (dateFrom) conditions.push(gte(schema.sales.createdAt, parseInt(dateFrom)));
    if (dateTo) conditions.push(lte(schema.sales.createdAt, parseInt(dateTo)));

    const salesRows = await db.select().from(schema.sales).where(and(...conditions)).all();
    const saleById = new Map(salesRows.map((s) => [s.id, s]));

    const [allItems, allProducts, allDepartments] = await Promise.all([
      db.select().from(schema.saleItems).all(),
      db.select().from(schema.products).all(),
      db.select().from(schema.departments).all(),
    ]);
    const productById = new Map(allProducts.map((p) => [p.id, p]));
    const departmentNameById = new Map(allDepartments.map((d) => [d.id, d.name]));

    const aggregated = new Map<
      string,
      {
        productId: string;
        productName: string;
        sku: string;
        department: string | null;
        totalQuantity: number;
        totalRevenue: number;
        paymentMethods: Map<string, { amount: number; quantity: number }>;
      }
    >();

    for (const item of allItems) {
      const sale = saleById.get(item.saleId);
      if (!sale) continue;

      const product = productById.get(item.productId);
      if (departmentId && product?.departmentId !== departmentId) continue;

      let entry = aggregated.get(item.productId);
      if (!entry) {
        entry = {
          productId: item.productId,
          productName: product?.name ?? "Unknown",
          sku: product?.sku ?? "",
          department: product?.departmentId
            ? departmentNameById.get(product.departmentId) ?? null
            : null,
          totalQuantity: 0,
          totalRevenue: 0,
          paymentMethods: new Map(),
        };
        aggregated.set(item.productId, entry);
      }

      const lineTotal = item.unitPrice * item.quantity;
      entry.totalQuantity += item.quantity;
      entry.totalRevenue += lineTotal;

      const pm = entry.paymentMethods.get(sale.paymentMethod) ?? { amount: 0, quantity: 0 };
      pm.amount += lineTotal;
      pm.quantity += item.quantity;
      entry.paymentMethods.set(sale.paymentMethod, pm);
    }

    const productSales = [...aggregated.values()]
      .map((entry) => ({
        ...entry,
        paymentMethods: [...entry.paymentMethods.entries()].map(([method, totals]) => ({
          method,
          ...totals,
        })),
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    return c.json({ productSales });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// GET /api/sales/product-performance — product-level volume analytics.
//
// Answers the questions the revenue reports can't: which products move, which
// barely move, and which have never sold at all. "Never sold" is relative to the
// requested date window, so with no dates it means "never sold, ever".
salesRoutes.get("/product-performance", async (c) => {
  try {
    getUser(c);
    const { storeId, dateFrom, dateTo, departmentId, limit } = c.req.query();
    const topN = Math.min(Math.max(parseInt(limit || "10") || 10, 1), 50);

    const salesConditions = [eq(schema.sales.status, "completed" as SaleStatus)];
    if (storeId) salesConditions.push(eq(schema.sales.storeId, storeId));
    if (dateFrom) salesConditions.push(gte(schema.sales.createdAt, parseInt(dateFrom)));
    if (dateTo) salesConditions.push(lte(schema.sales.createdAt, parseInt(dateTo)));

    const [saleRows, allProducts, allDepartments, allItems, allBatches] = await Promise.all([
      db
        .select({ id: schema.sales.id, createdAt: schema.sales.createdAt })
        .from(schema.sales)
        .where(and(...salesConditions))
        .all(),
      db.select().from(schema.products).all(),
      db.select().from(schema.departments).all(),
      db.select().from(schema.saleItems).all(),
      db.select().from(schema.batches).all(),
    ]);

    const saleById = new Map(saleRows.map((s) => [s.id, s]));
    const departmentNameById = new Map(allDepartments.map((d) => [d.id, d.name]));

    // Stock on hand comes from batch quantities (inventory only holds the
    // product/store link plus a reorder level).
    const stockByProduct = new Map<string, number>();
    for (const batch of allBatches) {
      if (storeId && batch.storeId !== storeId) continue;
      stockByProduct.set(batch.productId, (stockByProduct.get(batch.productId) ?? 0) + batch.quantity);
    }

    type ProductAgg = { units: number; revenue: number; transactions: number; lastSoldAt: number };
    const agg = new Map<string, ProductAgg>();
    for (const item of allItems) {
      const sale = saleById.get(item.saleId);
      if (!sale) continue;

      let entry = agg.get(item.productId);
      if (!entry) {
        entry = { units: 0, revenue: 0, transactions: 0, lastSoldAt: 0 };
        agg.set(item.productId, entry);
      }
      entry.units += item.quantity;
      entry.revenue += item.unitPrice * item.quantity;
      entry.transactions += 1;
      if (sale.createdAt > entry.lastSoldAt) entry.lastSoldAt = sale.createdAt;
    }

    const rows = allProducts
      .filter((product) => !departmentId || product.departmentId === departmentId)
      .map((product) => {
        const stats = agg.get(product.id);
        return {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          departmentId: product.departmentId,
          department: departmentNameById.get(product.departmentId) ?? null,
          isActive: product.isActive,
          addedAt: product.createdAt,
          units: stats?.units ?? 0,
          revenue: stats?.revenue ?? 0,
          transactions: stats?.transactions ?? 0,
          lastSoldAt: stats?.lastSoldAt ? stats.lastSoldAt : null,
          stockOnHand: stockByProduct.get(product.id) ?? 0,
        };
      });

    const sellers = rows.filter((row) => row.units > 0).sort((a, b) => b.units - a.units);

    // Least sellers: ascending, ties broken by name so the list is stable.
    const leastSellers = [...sellers]
      .sort((a, b) => (a.units - b.units) || a.productName.localeCompare(b.productName))
      .slice(0, topN);

    // Never sold, most actionable first: active before inactive, then the ones
    // sitting on stock (tied-up capital), then alphabetical.
    const neverSold = rows
      .filter((row) => row.units === 0)
      .sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        if (b.stockOnHand !== a.stockOnHand) return b.stockOnHand - a.stockOnHand;
        return a.productName.localeCompare(b.productName);
      });

    const departmentMap = new Map<
      string,
      { department: string; products: number; soldProducts: number; neverSoldCount: number; units: number }
    >();
    for (const row of rows) {
      const key = row.department ?? "Uncategorized";
      let entry = departmentMap.get(key);
      if (!entry) {
        entry = { department: key, products: 0, soldProducts: 0, neverSoldCount: 0, units: 0 };
        departmentMap.set(key, entry);
      }
      entry.products += 1;
      entry.units += row.units;
      if (row.units > 0) entry.soldProducts += 1;
      else entry.neverSoldCount += 1;
    }

    return c.json({
      summary: {
        totalProducts: rows.length,
        soldProducts: sellers.length,
        neverSoldCount: neverSold.length,
        deadStockCount: neverSold.filter((row) => row.stockOnHand > 0).length,
        inactiveCount: rows.filter((row) => !row.isActive).length,
        unitsSold: sellers.reduce((sum, row) => sum + row.units, 0),
        transactions: saleRows.length,
      },
      topSellers: sellers.slice(0, topN),
      leastSellers,
      neverSold,
      byDepartment: [...departmentMap.values()].sort((a, b) => b.units - a.units),
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// GET /api/sales/:id — get sale with items
salesRoutes.get("/:id", async (c) => {
  try {
    const user = getUser(c);
    const id = c.req.param("id");
    const sale = await db.select().from(schema.sales).where(eq(schema.sales.id, id)).get();
    if (!sale) return c.json({ error: "Sale not found" }, 404);

    const items = await db.select().from(schema.saleItems)
      .where(eq(schema.saleItems.saleId, id)).all();

    const itemsWithProducts = await Promise.all(items.map(async (item) => {
      const product = await db.select().from(schema.products)
        .where(eq(schema.products.id, item.productId)).get();
      return { ...item, product: product || null };
    }));

    const store = await db.select().from(schema.stores)
      .where(eq(schema.stores.id, sale.storeId)).get();
    const customer = sale.customerId
      ? await db.select().from(schema.customers).where(eq(schema.customers.id, sale.customerId)).get()
      : null;

    return c.json({ sale: { ...sale, store, customer, items: itemsWithProducts } });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// GET /api/sales/:id/edit-history — audit trail, newest first
salesRoutes.get("/:id/edit-history", async (c) => {
  try {
    getUser(c);
    const id = c.req.param("id");
    const edits = await db.select().from(schema.saleEdits)
      .where(eq(schema.saleEdits.saleId, id))
      .orderBy(desc(schema.saleEdits.editedAt))
      .all();
    return c.json({ edits });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// POST /api/sales — create sale
salesRoutes.post("/", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin", "manager", "cashier"]);
    const body = await c.req.json();

    const { storeId, items, payments, customerId, customerName, discountTotal, paymentMethod, amountReceived, changeDue } = body;

    if (!storeId || !items || !items.length) {
      return c.json({ error: "storeId and items are required" }, 400);
    }

    // Use a transaction-equivalent approach: all or nothing
    const totalAmount = items.reduce((sum: number, item: any) => sum + (item.unitPrice * item.quantity), 0);
    const netTotal = totalAmount - (discountTotal || 0);

    // Create sale record
    const result = await db.insert(schema.sales).values({
      storeId,
      customerId,
      totalAmount: netTotal,
      discountTotal: discountTotal || 0,
      paymentMethod: paymentMethod || payments?.[0]?.method || "Cash",
      paymentSplits: payments ? JSON.stringify(payments) : undefined,
      amountReceived,
      changeDue,
      status: "completed",
    }).returning().get();

    if (!result) return c.json({ error: "Failed to create sale" }, 500);

    // Create sale items and consume batch stock (FIFO)
    for (const item of items) {
      const saleItem = await db.insert(schema.saleItems).values({
        saleId: result.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        size: item.size,
        color: item.color,
        variant: item.variant,
      }).returning().get();

      if (!saleItem) continue;

      // FIFO batch consumption. For size-priced products the matching size is
      // drained first, so each size's stock moves independently; other sizes (and
      // un-sized batches) remain the fallback in FIFO order.
      let remaining = item.quantity;
      const storeBatches = await db.select().from(schema.batches)
        .where(and(
          eq(schema.batches.storeId, storeId),
          eq(schema.batches.productId, item.productId)
        ))
        .orderBy(schema.batches.receivedAt)
        .all();

      const orderedBatches = item.size
        ? [
            ...storeBatches.filter((b) => b.size === item.size),
            ...storeBatches.filter((b) => b.size !== item.size),
          ]
        : storeBatches;

      for (const batch of orderedBatches) {
        if (remaining <= 0) break;
        const consume = Math.min(remaining, batch.quantity);
        if (consume > 0) {
          await db.insert(schema.saleItemBatches).values({
            saleItemId: saleItem.id,
            batchId: batch.id,
            quantity: consume,
          }).run();

          await db.update(schema.batches)
            .set({ quantity: batch.quantity - consume })
            .where(eq(schema.batches.id, batch.id))
            .run();

          remaining -= consume;
        }
      }

      // Handle manual discounts
      if (item.manualDiscount && item.manualDiscount > 0) {
        await db.insert(schema.saleDiscounts).values({
          saleId: result.id,
          productId: item.productId,
          discountAmount: item.manualDiscount,
          reason: item.discountReason || "Manual",
        }).run();
      }
    }

    // Update customer stats
    if (customerId) {
      const customer = await db.select().from(schema.customers)
        .where(eq(schema.customers.id, customerId)).get();
      if (customer) {
        await db.update(schema.customers).set({
          totalSpent: (customer.totalSpent || 0) + netTotal,
          visitCount: (customer.visitCount || 0) + 1,
          lastPurchaseAt: Date.now(),
          loyaltyPoints: (customer.loyaltyPoints || 0) + Math.floor(netTotal / 100),
        }).where(eq(schema.customers.id, customerId)).run();
      }
    }

    // Create ledger entry
    await db.insert(schema.ledgerEntries).values({
      storeId,
      type: "income",
      category: "sales",
      amount: netTotal,
      referenceType: "sale",
      saleId: result.id,
      date: Date.now(),
    }).run();

    // Log activity
    await db.insert(schema.activityLogs).values({
      userId: user.id,
      role: user.role,
      action: "sale.created",
      entityType: "sales",
      entityId: result.id,
      description: `Sale of ${items.length} item(s) worth ${netTotal}`,
    }).run();

    return c.json({ sale: result }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// POST /api/sales/:id/cancel — cancel sale
salesRoutes.post("/:id/cancel", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin"]);
    const id = c.req.param("id");
    const { reason } = await c.req.json();

    const sale = await db.select().from(schema.sales).where(eq(schema.sales.id, id)).get();
    if (!sale) return c.json({ error: "Sale not found" }, 404);
    if (sale.status !== "completed") return c.json({ error: "Sale is not completed" }, 400);

    // Store original data
    const originalData = JSON.stringify(sale);

    // Update sale status
    await db.update(schema.sales).set({
      status: "cancelled",
      cancelledAt: Date.now(),
      cancelledBy: user.id,
      cancelledReason: reason || "No reason provided",
    }).where(eq(schema.sales.id, id)).run();

    // Restore batches from sale item batches
    const saleItems = await db.select().from(schema.saleItems)
      .where(eq(schema.saleItems.saleId, id)).all();

    for (const si of saleItems) {
      const itemBatches = await db.select().from(schema.saleItemBatches)
        .where(eq(schema.saleItemBatches.saleItemId, si.id)).all();

      for (const ib of itemBatches) {
        const batch = await db.select().from(schema.batches)
          .where(eq(schema.batches.id, ib.batchId)).get();
        if (batch) {
          await db.update(schema.batches)
            .set({ quantity: batch.quantity + ib.quantity })
            .where(eq(schema.batches.id, ib.batchId)).run();
        }
      }
    }

    // Create cancelled sale record
    await db.insert(schema.cancelledSales).values({
      originalSaleId: id,
      cancelledSaleId: id,
      cancelledAt: Date.now(),
      cancelledBy: user.id,
      reason: reason || "No reason",
      originalData,
    }).run();

    // Create reverse ledger entry
    await db.insert(schema.ledgerEntries).values({
      storeId: sale.storeId,
      type: "expense",
      category: "cancellation",
      amount: sale.totalAmount,
      referenceType: "cancellation",
      cancelledSaleId: id,
      date: Date.now(),
    }).run();

    await db.insert(schema.activityLogs).values({
      userId: user.id,
      role: user.role,
      action: "sale.cancelled",
      entityType: "sales",
      entityId: id,
      description: `Sale cancelled: ${reason || "No reason"}`,
    }).run();

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// PATCH /api/sales/:id/payment — update payment method
salesRoutes.patch("/:id/payment", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin"]);
    const id = c.req.param("id");
    const body = await c.req.json();

    const sale = await db.select().from(schema.sales).where(eq(schema.sales.id, id)).get();
    if (!sale) return c.json({ error: "Sale not found" }, 404);

    const originalData = JSON.stringify({ paymentMethod: sale.paymentMethod, paymentSplits: sale.paymentSplits });

    const updates: Record<string, any> = {};
    if (body.paymentMethod) updates.paymentMethod = body.paymentMethod;
    if (body.paymentSplits) updates.paymentSplits = JSON.stringify(body.paymentSplits);
    if (body.amountReceived) updates.amountReceived = body.amountReceived;
    if (body.changeDue !== undefined) updates.changeDue = body.changeDue;

    await db.update(schema.sales).set(updates).where(eq(schema.sales.id, id)).run();

    // Log the edit
    await db.insert(schema.saleEdits).values({
      saleId: id,
      editedBy: user.id,
      editedAt: Date.now(),
      reason: body.reason || "Payment method update",
      changes: JSON.stringify({
        paymentMethod: body.paymentMethod ? { from: sale.paymentMethod, to: body.paymentMethod } : undefined,
      }),
      originalData,
      newData: JSON.stringify(updates),
    }).run();

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// POST /api/sales/:id/void — void a completed sale and restore stock
salesRoutes.post("/:id/void", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin"]);
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => ({} as any));

    const result = await reverseCompletedSale(user, id, "voided", body?.reason);
    if (!result.ok) return c.json({ error: result.error }, result.code);

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// POST /api/sales/:id/refund — refund a completed sale and restore stock
salesRoutes.post("/:id/refund", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin"]);
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => ({} as any));

    const result = await reverseCompletedSale(user, id, "refunded", body?.reason);
    if (!result.ok) return c.json({ error: result.error }, result.code);

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});