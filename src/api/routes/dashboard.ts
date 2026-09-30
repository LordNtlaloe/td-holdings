import { Hono } from "hono";
import { eq, or, desc, count } from "drizzle-orm";
import db from "../db/index.ts";
import * as schema from "../db/schema.ts";
import type { AuthEnv } from "../middleware/auth.ts";
import { getUser, requireRole } from "../auth.ts";
import { isLowStock } from "../inventory-utils.ts";

export const dashboardRoutes = new Hono<AuthEnv>();

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

function dateKey(ts: number) {
  return new Date(ts).toISOString().slice(0, 10);
}

// GET /api/dashboard
dashboardRoutes.get("/", async (c) => {
  try {
    const user = getUser(c);
    const isGlobal = user.role === "super_admin" || user.role === "admin";

    // Get user's store if manager/cashier
    let userStoreId: string | null = null;
    if (!isGlobal) {
      const employee = await db.select().from(schema.employees)
        .where(eq(schema.employees.userId, user.id)).get();
      userStoreId = employee?.storeId || user.storeId || null;
    }

    const now = Date.now();
    const todayStart = startOfDay(now);
    const nowDate = new Date(now);
    const monthStart = startOfDay(new Date(nowDate.getFullYear(), nowDate.getMonth(), 1).getTime());
    const weekStart = startOfDay(now - 7 * 86400000);

    // Sales stats
    let salesQuery = db.select().from(schema.sales);
    if (userStoreId) {
      salesQuery = salesQuery.where(eq(schema.sales.storeId, userStoreId)) as any;
    }
    const allSales = await salesQuery.where(eq(schema.sales.status, "completed")).all();

    // Bulk-load the reference rows once. The previous implementation issued a
    // separate query per inventory row (~700 sequential round trips to Turso),
    // which made this endpoint time out.
    const [allProducts, allCategories, allBatches, allCustomers, inventoryRows, allLedger, allSaleDiscounts, salesStatusCounts] =
      await Promise.all([
        db.select().from(schema.products).all(),
        db.select().from(schema.categories).all(),
        db.select().from(schema.batches).all(),
        db.select().from(schema.customers).all(),
        db.select().from(schema.inventory).all(),
        db.select().from(schema.ledgerEntries).all(),
        db.select().from(schema.saleDiscounts).all(),
        db.select({ status: schema.sales.status, total: count() })
          .from(schema.sales)
          .groupBy(schema.sales.status)
          .all(),
      ]);

    const saleIdSet = new Set(allSales.map((s) => s.id));
    const productById = new Map(allProducts.map((p) => [p.id, p]));
    const categoryNameById = new Map(allCategories.map((cat) => [cat.id, cat.name]));
    const customerById = new Map(allCustomers.map((cu) => [cu.id, cu]));

    const stockByStoreProduct = new Map<string, number>();
    for (const b of allBatches) {
      const key = `${b.storeId}:${b.productId}`;
      stockByStoreProduct.set(key, (stockByStoreProduct.get(key) ?? 0) + b.quantity);
    }

    const totalRevenue = allSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalSales = allSales.length;
    const avgTransactionValue = totalSales > 0 ? totalRevenue / totalSales : 0;

    // Daily series (last 30 days)
    const dailyBuckets: Record<string, { date: string; revenue: number; salesCount: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const key = dateKey(now - i * 86400000);
      dailyBuckets[key] = { date: key, revenue: 0, salesCount: 0 };
    }
    for (const sale of allSales) {
      const key = dateKey(sale.createdAt);
      if (dailyBuckets[key]) {
        dailyBuckets[key].revenue += sale.totalAmount;
        dailyBuckets[key].salesCount += 1;
      }
    }

    // Top products
    const saleItems = (await db.select().from(schema.saleItems).all())
      .filter((si) => saleIdSet.has(si.saleId));
    const productSales: Record<string, { revenue: number; quantity: number }> = {};
    for (const si of saleItems) {
      if (!productSales[si.productId]) productSales[si.productId] = { revenue: 0, quantity: 0 };
      productSales[si.productId].revenue += si.unitPrice * si.quantity;
      productSales[si.productId].quantity += si.quantity;
    }
    const topProducts = Object.entries(productSales)
      .sort(([, a], [, b]) => b.revenue - a.revenue)
      .slice(0, 10)
      .map(([productId, stats]) => ({
        name: productById.get(productId)?.name || "Unknown",
        ...stats,
      }));

    // Store breakdown
    const stores = await db.select().from(schema.stores).all();
    const storeBreakdown = await Promise.all(stores.map(async (store) => {
      const storeSales = allSales.filter(s => s.storeId === store.id);
      const revenue = storeSales.reduce((sum, s) => sum + s.totalAmount, 0);
      return {
        storeName: store.name,
        revenue,
        salesCount: storeSales.length,
        lowStockCount: 0,
        avgTransaction: storeSales.length > 0 ? revenue / storeSales.length : 0,
      };
    }));

    // Low stock items — aggregated in memory from the bulk-loaded rows.
    // The rule lives in `isLowStock` so this can never disagree with
    // /api/inventory/low-stock.
    const lowStockItems: any[] = [];
    for (const row of inventoryRows) {
      const quantity = stockByStoreProduct.get(`${row.storeId}:${row.productId}`) ?? 0;
      if (isLowStock(quantity, row.reorderLevel)) {
        lowStockItems.push({
          productId: row.productId,
          productName: productById.get(row.productId)?.name || "Unknown",
          storeName: stores.find((s) => s.id === row.storeId)?.name || "Unknown",
          storeId: row.storeId,
          quantity,
          reorderLevel: row.reorderLevel,
        });
      }
    }

    // Transfers summary
    let transfersQuery = db.select().from(schema.transfers);
    if (userStoreId) {
      transfersQuery = transfersQuery.where(
        or(eq(schema.transfers.fromStoreId, userStoreId), eq(schema.transfers.toStoreId, userStoreId))
      ) as any;
    }
    const allTransfers = await transfersQuery.orderBy(desc(schema.transfers.createdAt)).all();
    const pendingCount = allTransfers.filter(t => t.status === "pending").length;
    const inTransitCount = allTransfers.filter(t => t.status === "in_transit").length;

    // Recent activity
    const recentActivity = await db.select().from(schema.activityLogs)
      .orderBy(desc(schema.activityLogs.createdAt)).limit(20).all();

    const activityWithUsers = await Promise.all(recentActivity.map(async (log) => {
      const u = await db.select().from(schema.users).where(eq(schema.users.id, log.userId)).get();
      return { ...log, userName: u?.name || "Unknown" };
    }));

    // Recent sales
    const recentSales = await Promise.all(
      allSales.sort((a, b) => b.createdAt - a.createdAt).slice(0, 10).map(async (sale) => {
        const store = stores.find(s => s.id === sale.storeId);
        const customer = sale.customerId ? customerById.get(sale.customerId) : null;
        return {
          _id: sale.id,
          storeName: store?.name || "Unknown",
          customerName: customer?.name || "Walk-in",
          paymentMethod: sale.paymentMethod,
          totalAmount: sale.totalAmount,
          status: sale.status,
          createdAt: sale.createdAt,
        };
      })
    );

    // ─── Alerts ────────────────────────────────────────────────────────────
    // Shape must match the UI: `id`, `type` (critical|warning|info) and `title`
    // are all required, otherwise the alerts banner throws while rendering.
    const alerts: any[] = [];
    for (const item of lowStockItems.slice(0, 5)) {
      alerts.push({
        id: `low-stock-${item.storeId}-${item.productId}`,
        type: item.quantity === 0 ? "critical" : "warning",
        title: `Low stock: ${item.productName}`,
        message: `${item.quantity} left at ${item.storeName} (reorder at ${item.reorderLevel})`,
        action: "Reorder",
      });
    }

    // ─── Hourly + payment breakdown ────────────────────────────────────────
    const hourBuckets = new Map<number, { hour: number; revenue: number; count: number }>();
    for (let h = 0; h < 24; h++) hourBuckets.set(h, { hour: h, revenue: 0, count: 0 });
    const payMap = new Map<string, number>();
    for (const sale of allSales) {
      const bucket = hourBuckets.get(new Date(sale.createdAt).getHours());
      if (bucket) {
        bucket.revenue += sale.totalAmount;
        bucket.count += 1;
      }
      payMap.set(sale.paymentMethod, (payMap.get(sale.paymentMethod) ?? 0) + sale.totalAmount);
    }
    const hourlyBuckets = [...hourBuckets.values()];
    const paymentBreakdown = [...payMap.entries()]
      .map(([method, amount]) => ({ method, amount }))
      .sort((a, b) => b.amount - a.amount);

    // ─── Customers ─────────────────────────────────────────────────────────
    const tierOf = (spent: number) =>
      spent >= 5000 ? "platinum" : spent >= 2000 ? "gold" : spent >= 500 ? "silver" : "bronze";

    const tierDistribution = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
    for (const cu of allCustomers) {
      tierDistribution[tierOf(cu.totalSpent ?? 0)] += 1;
    }

    const customersSummary = {
      total: allCustomers.length,
      newThisMonth: allCustomers.filter((cu) => (cu.createdAt ?? 0) >= monthStart).length,
      acquisitionRate: allCustomers.length > 0
        ? (allCustomers.filter((cu) => (cu.createdAt ?? 0) >= monthStart).length / allCustomers.length) * 100
        : 0,
      tierDistribution,
      topSpenders: [...allCustomers]
        .sort((a, b) => (b.totalSpent ?? 0) - (a.totalSpent ?? 0))
        .slice(0, 5)
        .map((cu) => ({
          id: cu.id,
          name: cu.name,
          totalSpent: cu.totalSpent ?? 0,
          loyaltyPoints: cu.loyaltyPoints ?? 0,
          visitCount: cu.visitCount ?? 0,
          tier: tierOf(cu.totalSpent ?? 0),
        })),
      atRisk: allCustomers
        .filter((cu) => (cu.lastPurchaseAt ?? 0) > 0 && now - (cu.lastPurchaseAt ?? 0) > 30 * 86400000)
        .map((cu) => ({
          id: cu.id,
          name: cu.name,
          lastPurchaseAt: cu.lastPurchaseAt ?? 0,
          daysSinceLastPurchase: Math.floor((now - (cu.lastPurchaseAt ?? 0)) / 86400000),
        })),
      birthdaysThisWeek: [],
    };

    // ─── Inventory ─────────────────────────────────────────────────────────
    const soldQtyByProduct = new Map<string, number>();
    for (const si of saleItems) {
      soldQtyByProduct.set(si.productId, (soldQtyByProduct.get(si.productId) ?? 0) + si.quantity);
    }

    const stockQtyByProduct = new Map<string, number>();
    let totalStockValue = 0;
    let totalStockQty = 0;
    for (const b of allBatches) {
      stockQtyByProduct.set(b.productId, (stockQtyByProduct.get(b.productId) ?? 0) + b.quantity);
      totalStockValue += b.quantity * b.costPrice;
      totalStockQty += b.quantity;
    }

    const turnoverByCategoryMap = new Map<string, number>();
    let totalSoldQty = 0;
    for (const si of saleItems) {
      totalSoldQty += si.quantity;
      const categoryId = productById.get(si.productId)?.categoryId;
      if (!categoryId) continue;
      turnoverByCategoryMap.set(categoryId, (turnoverByCategoryMap.get(categoryId) ?? 0) + si.quantity);
    }

    const inventorySummary = {
      totalProducts: allProducts.length,
      totalStockValue,
      lowStockCount: lowStockItems.length,
      deadStockCount: [...stockQtyByProduct.entries()]
        .filter(([productId, qty]) => qty > 0 && !soldQtyByProduct.has(productId)).length,
      expiringSoon: [],
      stockCoverageDays: [...stockQtyByProduct.entries()]
        .filter(([, qty]) => qty > 0)
        .slice(0, 10)
        .map(([productId, currentStock]) => {
          const avgDailySales = (soldQtyByProduct.get(productId) ?? 0) / 30;
          return {
            productId,
            productName: productById.get(productId)?.name || "Unknown",
            currentStock,
            avgDailySales,
            coverageDays: avgDailySales > 0 ? currentStock / avgDailySales : 0,
          };
        }),
      turnoverByCategory: [...turnoverByCategoryMap.entries()].map(([categoryId, turnover]) => ({
        category: categoryNameById.get(categoryId) || "Uncategorised",
        turnover,
      })),
    };

    // ─── Financials ────────────────────────────────────────────────────────
    const totalExpenses = allLedger
      .filter((l) => l.type === "expense")
      .reduce((sum, l) => sum + l.amount, 0);

    let cogs = 0;
    for (const si of saleItems) {
      cogs += (productById.get(si.productId)?.costPrice ?? 0) * si.quantity;
    }
    const grossProfit = totalRevenue - cogs;
    const netProfit = grossProfit - totalExpenses;

    const expenseByCategory = new Map<string, number>();
    for (const l of allLedger) {
      if (l.type !== "expense") continue;
      expenseByCategory.set(l.category, (expenseByCategory.get(l.category) ?? 0) + l.amount);
    }

    const cashFlowBuckets = new Map<string, { date: string; inflow: number; outflow: number; balance: number }>();
    for (let i = 29; i >= 0; i--) {
      const key = dateKey(now - i * 86400000);
      cashFlowBuckets.set(key, { date: key, inflow: 0, outflow: 0, balance: 0 });
    }
    for (const l of allLedger) {
      const bucket = cashFlowBuckets.get(dateKey(l.date));
      if (!bucket) continue;
      if (l.type === "income") bucket.inflow += l.amount;
      else bucket.outflow += l.amount;
    }
    let runningBalance = 0;
    const cashFlow = [...cashFlowBuckets.values()].map((b) => {
      runningBalance += b.inflow - b.outflow;
      return { ...b, balance: runningBalance };
    });

    const financialSummary = {
      grossProfit,
      grossProfitMargin: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
      netProfit,
      netProfitMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
      totalExpenses,
      cashFlow,
      expenseBreakdown: [...expenseByCategory.entries()].map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
      })),
    };

    const stockTurnover = totalStockQty > 0 ? totalSoldQty / totalStockQty : 0;

    // ─── Non-revenue performance indicators ────────────────────────────────
    // Deliberately volume / efficiency based rather than money based.
    const completedCount = salesStatusCounts.find((r) => r.status === "completed")?.total ?? 0;
    const totalAllSales = salesStatusCounts.reduce((sum, r) => sum + r.total, 0);
    const notCompletedCount = totalAllSales - completedCount;

    const totalDiscount = allSaleDiscounts.reduce((sum, d) => sum + d.discountAmount, 0);
    const grossSales = totalRevenue + totalDiscount;

    const performance = {
      /** Total units moved across all completed sales. */
      unitsSold: totalSoldQty,
      /** Average basket size (units per completed sale). */
      itemsPerSale: totalSales > 0 ? totalSoldQty / totalSales : 0,
      /** Share of everything that could have sold that actually sold. */
      sellThroughRate:
        totalSoldQty + totalStockQty > 0
          ? (totalSoldQty / (totalSoldQty + totalStockQty)) * 100
          : 0,
      /** Units sold relative to units currently in stock. */
      stockTurnover,
      deadStockCount: inventorySummary.deadStockCount,
      /** How much of gross sales was given away as discount. */
      discountRate: grossSales > 0 ? (totalDiscount / grossSales) * 100 : 0,
      /** Cancelled + refunded + voided sales as a share of all sales. */
      cancellationRate: totalAllSales > 0 ? (notCompletedCount / totalAllSales) * 100 : 0,
      activeProducts: allProducts.filter((p) => p.isActive).length,
      totalProducts: allProducts.length,
    };

    // Top 10 by units sold — the volume counterpart to the revenue ranking.
    const topProductsByUnits = Object.entries(productSales)
      .sort(([, a], [, b]) => b.quantity - a.quantity)
      .slice(0, 10)
      .map(([productId, stats]) => ({
        name: productById.get(productId)?.name || "Unknown",
        ...stats,
      }));

    return c.json({
      role: user.role,
      scope: isGlobal ? "global" : userStoreId ? "store" : "none",
      stats: {
        totalRevenue,
        totalSales,
        lowStockCount: lowStockItems.length,
        activeStores: stores.filter(s => s.isActive).length,
        avgTransactionValue,
        grossProfitMargin: financialSummary.grossProfitMargin,
        stockTurnover,
      },
      dailySeries: Object.values(dailyBuckets),
      topProducts,
      lowStockItems,
      recentSales,
      storeBreakdown,
      transfers: {
        pendingCount,
        inTransitCount,
        recent: allTransfers.slice(0, 5).map(t => ({
          _id: t.id,
          fromStore: stores.find(s => s.id === t.fromStoreId)?.name || "Unknown",
          toStore: stores.find(s => s.id === t.toStoreId)?.name || "Unknown",
          status: t.status,
          createdAt: t.createdAt,
        })),
      },
      activityFeed: activityWithUsers.map(a => ({
        _id: a.id,
        userName: a.userName,
        role: a.role,
        action: a.action,
        entityType: a.entityType,
        description: a.description,
        createdAt: a.createdAt,
      })),
      purchases: {
        totalThisMonth: 0,
        pendingCount: 0,
        recent: [],
      },
      hourlyBuckets,
      paymentBreakdown,
      topProductsByUnits,
      performance,
      customers: customersSummary,
      inventory: inventorySummary,
      financial: financialSummary,
      alerts,
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

