import { Hono } from "hono";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import db from "../db/index.ts";
import * as schema from "../db/schema.ts";
import type { AuthEnv } from "../middleware/auth.ts";
import { getUser, requireRole } from "../auth.ts";

export const reportRoutes = new Hono<AuthEnv>();

function startOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function endOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

// GET /api/reports/daily-sales
reportRoutes.get("/daily-sales", async (c) => {
  try {
    const user = getUser(c);
    const storeId = c.req.query("storeId");
    const date = parseInt(c.req.query("date") || String(Date.now()));

    const from = startOfDay(date);
    const to = endOfDay(date);

    let conditions = [
      gte(schema.sales.createdAt, from),
      lte(schema.sales.createdAt, to),
      eq(schema.sales.status, "completed"),
    ];
    if (storeId) conditions.push(eq(schema.sales.storeId, storeId));

    const sales = await db.select().from(schema.sales)
      .where(and(...conditions)).all();

    const totalRevenue = sales.reduce((acc, s) => acc + s.totalAmount, 0);
    const totalSales = sales.length;
    const averageSale = totalSales > 0 ? totalRevenue / totalSales : 0;

    const byStore: Record<string, { revenue: number; count: number }> = {};
    for (const sale of sales) {
      if (!byStore[sale.storeId]) byStore[sale.storeId] = { revenue: 0, count: 0 };
      byStore[sale.storeId].revenue += sale.totalAmount;
      byStore[sale.storeId].count += 1;
    }

    const allStores = await db.select().from(schema.stores).all();
    const storeMap = Object.fromEntries(allStores.map(s => [s.id, s.name]));

    return c.json({
      totalRevenue, totalSales, averageSale,
      byStore: Object.entries(byStore).map(([id, data]) => ({
        storeId: id, storeName: storeMap[id] || "Unknown", ...data,
      })),
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// GET /api/reports/sales-by-product
reportRoutes.get("/sales-by-product", async (c) => {
  try {
    getUser(c);
    const storeId = c.req.query("storeId");
    const startDate = parseInt(c.req.query("startDate") || String(Date.now() - 30 * 86400000));
    const endDate = parseInt(c.req.query("endDate") || String(Date.now()));

    let salesConditions = [
      gte(schema.sales.createdAt, startDate),
      lte(schema.sales.createdAt, endDate),
      eq(schema.sales.status, "completed"),
    ];
    if (storeId) salesConditions.push(eq(schema.sales.storeId, storeId));

    const relevantSales = await db.select({ id: schema.sales.id }).from(schema.sales)
      .where(and(...salesConditions)).all();
    const saleIds = relevantSales.map(s => s.id);

    if (saleIds.length === 0) return c.json({ products: [] });

    const items = await db.select().from(schema.saleItems).all();
    const filteredItems = items.filter(i => saleIds.includes(i.saleId));

    const productAgg: Record<string, { quantity: number; revenue: number }> = {};
    for (const item of filteredItems) {
      if (!productAgg[item.productId]) productAgg[item.productId] = { quantity: 0, revenue: 0 };
      productAgg[item.productId].quantity += item.quantity;
      productAgg[item.productId].revenue += item.unitPrice * item.quantity;
    }

    const products = await Promise.all(
      Object.entries(productAgg).map(async ([productId, stats]) => {
        const product = await db.select().from(schema.products)
          .where(eq(schema.products.id, productId)).get();
        return { productId, productName: product?.name || "Unknown", ...stats };
      })
    );

    return c.json({ products: products.sort((a, b) => b.revenue - a.revenue) });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// GET /api/reports/cash-flow
reportRoutes.get("/cash-flow", async (c) => {
  try {
    getUser(c);
    const startDate = parseInt(c.req.query("startDate") || String(Date.now() - 30 * 86400000));
    const endDate = parseInt(c.req.query("endDate") || String(Date.now()));

    const entries = await db.select().from(schema.ledgerEntries)
      .where(and(
        gte(schema.ledgerEntries.date, startDate),
        lte(schema.ledgerEntries.date, endDate),
      ))
      .orderBy(schema.ledgerEntries.date)
      .all();

    const totalIncome = entries.filter(e => e.type === "income").reduce((s, e) => s + e.amount, 0);
    const totalExpenses = entries.filter(e => e.type === "expense").reduce((s, e) => s + e.amount, 0);

    return c.json({ entries, totalIncome, totalExpenses, netCashFlow: totalIncome - totalExpenses });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Additional reports consumed by src/routes/dashboard/reports/index.tsx
//
// NOTE ON SHAPES: the migrated caller reads these responses as *bare* arrays /
// objects (e.g. `salesByCategory?.map(...)`, `stockValuation.totalValue`,
// `topCustomers[0]?.totalSpent`). The responses below are therefore returned
// unwrapped.
// ─────────────────────────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;

/** Accepts `from`/`to` (current caller) with `startDate`/`endDate` fallbacks. */
function parseDateRange(c: any, defaultDays = 30) {
  const q = c.req.query();
  const from = parseInt(q.from ?? q.startDate ?? String(Date.now() - defaultDays * DAY_MS), 10);
  const to = parseInt(q.to ?? q.endDate ?? String(Date.now()), 10);
  return { from: Number.isNaN(from) ? 0 : from, to: Number.isNaN(to) ? Date.now() : to };
}

/** Completed sales (optionally scoped to a store) within a date range. */
async function completedSalesInRange(from: number, to: number, storeId?: string) {
  let conditions = [
    gte(schema.sales.createdAt, from),
    lte(schema.sales.createdAt, to),
    eq(schema.sales.status, "completed"),
  ];
  if (storeId) conditions.push(eq(schema.sales.storeId, storeId));

  return db.select().from(schema.sales).where(and(...conditions)).all();
}

/** Per-inventory-row stock position for a store (or all stores). */
async function buildStockRows(storeId?: string) {
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

  return inventoryRows.map((inv) => {
    const product = productIndex.get(inv.productId);
    const batches = allBatches.filter(
      (b) => b.productId === inv.productId && b.storeId === inv.storeId
    );
    const quantity = batches.reduce((sum, b) => sum + b.quantity, 0);
    const value = batches.reduce((sum, b) => sum + b.quantity * b.costPrice, 0);
    const reorderLevel = inv.reorderLevel ?? 0;

    return {
      inventoryId: inv.id,
      productId: inv.productId,
      storeId: inv.storeId,
      storeName: storeIndex.get(inv.storeId) ?? "Unknown",
      productName: product?.name ?? "Unknown",
      sku: product?.sku ?? "",
      quantity,
      value,
      reorderLevel,
      belowReorder: quantity <= reorderLevel,
    };
  });
}

// GET /api/reports/top-products — top N products by quantity sold
reportRoutes.get("/top-products", async (c) => {
  try {
    getUser(c);
    const storeId = c.req.query("storeId");
    const { from, to } = parseDateRange(c);
    const parsedLimit = parseInt(c.req.query("limit") || "10", 10);
    const limit = Number.isNaN(parsedLimit) ? 10 : parsedLimit;

    const sales = await completedSalesInRange(from, to, storeId);
    const saleIds = new Set(sales.map((s) => s.id));

    const products = await db.select().from(schema.products).all();
    const productIndex = new Map(products.map((p) => [p.id, p]));

    const map = new Map<string, { productId: string; name: string; sku: string; quantity: number; revenue: number }>();

    if (saleIds.size > 0) {
      const items = await db.select().from(schema.saleItems).all();
      for (const item of items) {
        if (!saleIds.has(item.saleId)) continue;
        const product = productIndex.get(item.productId);
        if (!product) continue;

        const entry = map.get(item.productId)
          ?? { productId: item.productId, name: product.name, sku: product.sku, quantity: 0, revenue: 0 };
        entry.quantity += item.quantity;
        entry.revenue += item.quantity * item.unitPrice;
        map.set(item.productId, entry);
      }
    }

    return c.json(
      Array.from(map.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, limit)
    );
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// GET /api/reports/sales-by-category
reportRoutes.get("/sales-by-category", async (c) => {
  try {
    getUser(c);
    const storeId = c.req.query("storeId");
    const { from, to } = parseDateRange(c);

    const sales = await completedSalesInRange(from, to, storeId);
    const saleIds = new Set(sales.map((s) => s.id));

    const [products, categories] = await Promise.all([
      db.select().from(schema.products).all(),
      db.select().from(schema.categories).all(),
    ]);
    const productIndex = new Map(products.map((p) => [p.id, p]));
    const categoryIndex = new Map(categories.map((cat) => [cat.id, cat.name]));

    const map = new Map<string, { name: string; quantity: number; revenue: number }>();

    if (saleIds.size > 0) {
      const items = await db.select().from(schema.saleItems).all();
      for (const item of items) {
        if (!saleIds.has(item.saleId)) continue;
        const product = productIndex.get(item.productId);
        if (!product) continue;

        const name = categoryIndex.get(product.categoryId) ?? "Uncategorized";
        const entry = map.get(product.categoryId) ?? { name, quantity: 0, revenue: 0 };
        entry.quantity += item.quantity;
        entry.revenue += item.quantity * item.unitPrice;
        map.set(product.categoryId, entry);
      }
    }

    return c.json(Array.from(map.values()).sort((a, b) => b.revenue - a.revenue));
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// GET /api/reports/current-stock
reportRoutes.get("/current-stock", async (c) => {
  try {
    getUser(c);
    const storeId = c.req.query("storeId");
    return c.json(await buildStockRows(storeId || undefined));
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// GET /api/reports/low-stock
reportRoutes.get("/low-stock", async (c) => {
  try {
    getUser(c);
    const storeId = c.req.query("storeId");
    const rows = await buildStockRows(storeId || undefined);
    return c.json(
      rows.filter((row) => row.quantity <= row.reorderLevel).sort((a, b) => a.quantity - b.quantity)
    );
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// GET /api/reports/out-of-stock
reportRoutes.get("/out-of-stock", async (c) => {
  try {
    getUser(c);
    const storeId = c.req.query("storeId");
    const rows = await buildStockRows(storeId || undefined);
    return c.json(rows.filter((row) => row.quantity === 0));
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// GET /api/reports/stock-valuation
reportRoutes.get("/stock-valuation", async (c) => {
  try {
    getUser(c);
    const storeId = c.req.query("storeId");

    const batches = storeId
      ? await db.select().from(schema.batches).where(eq(schema.batches.storeId, storeId)).all()
      : await db.select().from(schema.batches).all();
    const stores = await db.select().from(schema.stores).all();
    const storeIndex = new Map(stores.map((s) => [s.id, s.name]));

    const byStoreMap = new Map<string, number>();
    for (const batch of batches) {
      byStoreMap.set(batch.storeId, (byStoreMap.get(batch.storeId) ?? 0) + batch.quantity * batch.costPrice);
    }

    const totalValue = Array.from(byStoreMap.values()).reduce((a, b) => a + b, 0);
    const byStore = Array.from(byStoreMap.entries()).map(([id, value]) => ({
      storeId: id,
      storeName: storeIndex.get(id) ?? "Unknown",
      value,
    }));

    return c.json({ totalValue, byStore });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// GET /api/reports/inventory-by-department
reportRoutes.get("/inventory-by-department", async (c) => {
  try {
    getUser(c);
    const storeId = c.req.query("storeId");

    const batches = storeId
      ? await db.select().from(schema.batches).where(eq(schema.batches.storeId, storeId)).all()
      : await db.select().from(schema.batches).all();

    const [products, departments] = await Promise.all([
      db.select().from(schema.products).all(),
      db.select().from(schema.departments).all(),
    ]);
    const productIndex = new Map(products.map((p) => [p.id, p]));
    const departmentIndex = new Map(departments.map((d) => [d.id, d.name]));

    const map = new Map<string, { name: string; quantity: number; value: number }>();
    for (const batch of batches) {
      const product = productIndex.get(batch.productId);
      if (!product) continue;

      const name = departmentIndex.get(product.departmentId) ?? "Uncategorized";
      const entry = map.get(product.departmentId) ?? { name, quantity: 0, value: 0 };
      entry.quantity += batch.quantity;
      entry.value += batch.quantity * batch.costPrice;
      map.set(product.departmentId, entry);
    }

    return c.json(Array.from(map.values()).sort((a, b) => b.value - a.value));
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// GET /api/reports/top-customers
reportRoutes.get("/top-customers", async (c) => {
  try {
    getUser(c);
    const parsedLimit = parseInt(c.req.query("limit") || "20", 10);
    const limit = Number.isNaN(parsedLimit) ? 20 : parsedLimit;

    const customers = await db.select().from(schema.customers).all();
    return c.json(
      customers
        .filter((customer) => customer.isActive !== false)
        .sort((a, b) => (b.totalSpent ?? 0) - (a.totalSpent ?? 0))
        .slice(0, limit)
        .map((customer) => ({
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          totalSpent: customer.totalSpent ?? 0,
          visitCount: customer.visitCount ?? 0,
          lastPurchaseAt: customer.lastPurchaseAt ?? null,
          loyaltyPoints: customer.loyaltyPoints ?? 0,
        }))
    );
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// GET /api/reports/inactive-customers
reportRoutes.get("/inactive-customers", async (c) => {
  try {
    getUser(c);
    const parsedDays = parseInt(c.req.query("days") || "90", 10);
    const days = Number.isNaN(parsedDays) ? 90 : parsedDays;
    const cutoff = Date.now() - days * DAY_MS;

    const customers = await db.select().from(schema.customers).all();
    return c.json(
      customers
        .filter(
          (customer) =>
            customer.isActive !== false &&
            (customer.lastPurchaseAt == null || customer.lastPurchaseAt < cutoff)
        )
        .map((customer) => ({
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          totalSpent: customer.totalSpent ?? 0,
          visitCount: customer.visitCount ?? 0,
          lastPurchaseAt: customer.lastPurchaseAt ?? null,
        }))
        .sort((a, b) => (a.lastPurchaseAt ?? 0) - (b.lastPurchaseAt ?? 0))
    );
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// GET /api/reports/customer-visit-frequency
reportRoutes.get("/customer-visit-frequency", async (c) => {
  try {
    getUser(c);
    const customers = await db.select().from(schema.customers).all();

    const buckets: Record<string, number> = {
      "1 visit": 0,
      "2–5 visits": 0,
      "6–10 visits": 0,
      "11–20 visits": 0,
      "21+ visits": 0,
    };

    for (const customer of customers) {
      const visits = customer.visitCount ?? 0;
      if (visits === 1) buckets["1 visit"]++;
      else if (visits <= 5) buckets["2–5 visits"]++;
      else if (visits <= 10) buckets["6–10 visits"]++;
      else if (visits <= 20) buckets["11–20 visits"]++;
      else buckets["21+ visits"]++;
    }

    return c.json(Object.entries(buckets).map(([label, count]) => ({ label, count })));
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// GET /api/reports/profit-loss
reportRoutes.get("/profit-loss", async (c) => {
  try {
    getUser(c);
    const storeId = c.req.query("storeId");
    const { from, to } = parseDateRange(c);

    let conditions = [
      gte(schema.ledgerEntries.date, from),
      lte(schema.ledgerEntries.date, to),
    ];
    if (storeId) conditions.push(eq(schema.ledgerEntries.storeId, storeId));

    const entries = await db.select().from(schema.ledgerEntries).where(and(...conditions)).all();

    const income = entries.filter((e) => e.type === "income").reduce((sum, e) => sum + e.amount, 0);
    const expenses = entries.filter((e) => e.type === "expense").reduce((sum, e) => sum + e.amount, 0);

    const stores = await db.select().from(schema.stores).all();
    const storeIndex = new Map(stores.map((s) => [s.id, s.name]));

    const byStoreMap = new Map<string, { income: number; expenses: number }>();
    for (const entry of entries) {
      const bucket = byStoreMap.get(entry.storeId) ?? { income: 0, expenses: 0 };
      if (entry.type === "income") bucket.income += entry.amount;
      else bucket.expenses += entry.amount;
      byStoreMap.set(entry.storeId, bucket);
    }

    const byStore = Array.from(byStoreMap.entries()).map(([id, data]) => ({
      storeId: id,
      storeName: storeIndex.get(id) ?? "Unknown",
      income: data.income,
      expenses: data.expenses,
      profit: data.income - data.expenses,
    }));

    return c.json({ income, expenses, profit: income - expenses, byStore });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});