// ─────────────────────────────────────────────────────────────────────────────
// Expenses routes — sales vs expenses dashboard + expense records
//
// Expenses are stored as `ledger_entries` rows with `type = "expense"` and
// `reference_type = "manual"`, so they flow into the Profit & Loss, Cash Flow
// and Expense Breakdown reports without a second data model.
//
// Access is open to every authenticated role. Non-admin users are scoped to
// their own store.
//
// Timezones: the browser sends exact millisecond timestamps for the range
// (`from`, `to`) and for every chart bucket (`buckets`). The server never
// calls setHours(), so its timezone can't shift a day or month boundary.
// ─────────────────────────────────────────────────────────────────────────────

import { Hono } from "hono";
import type { Context } from "hono";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import db from "../db/index.ts";
import * as schema from "../db/schema.ts";
import type { AuthEnv } from "../middleware/auth.ts";
import { getUser } from "../auth.ts";

export const expenseRoutes = new Hono<AuthEnv>();

const DAY_MS = 86_400_000;
const MAX_RANGE_DAYS = 366;
const MAX_BUCKETS = 400;
const MAX_LIST_ROWS = 5000;
const MAX_CATEGORY_LENGTH = 60;

function isGlobal(user: { role: string }) {
  return user.role === "super_admin" || user.role === "admin";
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function parseTimestamp(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Returns the signed-in user, or null if the request isn't authenticated. */
function authedUser(c: Context<AuthEnv>) {
  try {
    return getUser(c) ?? null;
  } catch {
    return null;
  }
}

/** Global roles may pick any store; everyone else is pinned to their own. */
async function resolveStoreScope(user: { id: string; role: string; storeId?: string | null }) {
  if (isGlobal(user)) {
    return { isGlobal: true, storeId: undefined as string | undefined };
  }
  const employee = await db
    .select()
    .from(schema.employees)
    .where(eq(schema.employees.userId, user.id))
    .get();
  return {
    isGlobal: false,
    storeId: employee?.storeId || user.storeId || undefined,
  };
}

/** Parses and validates `from` / `to`. Returns an error message instead if invalid. */
function parseRange(c: Context<AuthEnv>): { from: number; to: number } | { error: string } {
  const from = parseTimestamp(c.req.query("from"));
  const to = parseTimestamp(c.req.query("to"));
  if (from === null || to === null) {
    return { error: "from and to are required (millisecond timestamps)" };
  }
  if (to < from) return { error: "to must not be before from" };
  if (to - from > MAX_RANGE_DAYS * DAY_MS) {
    return { error: `Range can't be longer than ${MAX_RANGE_DAYS} days` };
  }
  return { from, to };
}

/**
 * `buckets` is a comma-separated, strictly ascending list of timestamps.
 * Bucket i covers boundaries[i] <= t < boundaries[i + 1].
 * Returns undefined when absent, null when malformed.
 */
function parseBoundaries(raw: string | undefined): number[] | null | undefined {
  if (!raw) return undefined;
  const values = raw.split(",").map(Number);
  if (values.length < 2 || values.length > MAX_BUCKETS + 1) return null;
  for (let i = 0; i < values.length; i++) {
    if (!Number.isFinite(values[i])) return null;
    if (i > 0 && values[i] <= values[i - 1]) return null;
  }
  return values;
}

/** Index of the bucket containing `ts`, or -1 if it falls outside all buckets. */
function bucketIndex(boundaries: number[], ts: number) {
  const last = boundaries.length - 1;
  if (ts < boundaries[0] || ts >= boundaries[last]) return -1;
  let lo = 0;
  let hi = last - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (boundaries[mid] <= ts) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** Activity logging must never turn a successful write into an error response. */
async function logActivity(values: typeof schema.activityLogs.$inferInsert) {
  try {
    await db.insert(schema.activityLogs).values(values).run();
  } catch (error) {
    console.error("Failed to write activity log", error);
  }
}

// GET /api/expenses/summary?from=<ms>&to=<ms>&buckets=<ms,ms,...>&storeId=<id>
//
// Totals for sales and expenses between `from` and `to`, an optional series
// split into the buckets the client asked for (days or months), and expenses
// grouped by category.
expenseRoutes.get("/summary", async (c) => {
  const user = authedUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const range = parseRange(c);
    if ("error" in range) return c.json({ error: range.error }, 400);
    const { from, to } = range;

    const boundaries = parseBoundaries(c.req.query("buckets"));
    if (boundaries === null) return c.json({ error: "buckets is not a valid timestamp list" }, 400);

    const scope = await resolveStoreScope(user);
    const storeId = scope.isGlobal ? c.req.query("storeId") || undefined : scope.storeId;

    if (!scope.isGlobal && !storeId) {
      return c.json({ from, to, totals: { sales: 0, expenses: 0 }, series: [], categories: [] });
    }

    const salesConditions = [
      eq(schema.sales.status, "completed"),
      gte(schema.sales.createdAt, from),
      lte(schema.sales.createdAt, to),
    ];
    if (storeId) salesConditions.push(eq(schema.sales.storeId, storeId));

    const expenseConditions = [
      eq(schema.ledgerEntries.type, "expense"),
      eq(schema.ledgerEntries.referenceType, "manual"),
      gte(schema.ledgerEntries.date, from),
      lte(schema.ledgerEntries.date, to),
    ];
    if (storeId) expenseConditions.push(eq(schema.ledgerEntries.storeId, storeId));

    const [salesRows, expenseRows] = await Promise.all([
      db
        .select({ createdAt: schema.sales.createdAt, totalAmount: schema.sales.totalAmount })
        .from(schema.sales)
        .where(and(...salesConditions))
        .all(),
      db
        .select({
          date: schema.ledgerEntries.date,
          amount: schema.ledgerEntries.amount,
          category: schema.ledgerEntries.category,
        })
        .from(schema.ledgerEntries)
        .where(and(...expenseConditions))
        .all(),
    ]);

    const bucketCount = boundaries ? boundaries.length - 1 : 0;
    const salesByBucket = new Array<number>(bucketCount).fill(0);
    const expensesByBucket = new Array<number>(bucketCount).fill(0);
    const byCategory = new Map<string, number>();

    let totalSales = 0;
    for (const row of salesRows) {
      totalSales += row.totalAmount;
      if (boundaries) {
        const i = bucketIndex(boundaries, row.createdAt);
        if (i >= 0) salesByBucket[i] += row.totalAmount;
      }
    }

    let totalExpenses = 0;
    for (const row of expenseRows) {
      totalExpenses += row.amount;
      byCategory.set(row.category, (byCategory.get(row.category) ?? 0) + row.amount);
      if (boundaries) {
        const i = bucketIndex(boundaries, row.date);
        if (i >= 0) expensesByBucket[i] += row.amount;
      }
    }

    const series = boundaries
      ? salesByBucket.map((sales, i) => ({
        from: boundaries[i],
        to: boundaries[i + 1] - 1,
        sales: round2(sales),
        expenses: round2(expensesByBucket[i]),
      }))
      : [];

    const categories = [...byCategory.entries()]
      .map(([category, amount]) => ({ category, amount: round2(amount) }))
      .sort((a, b) => b.amount - a.amount);

    return c.json({
      from,
      to,
      totals: { sales: round2(totalSales), expenses: round2(totalExpenses) },
      series,
      categories,
    });
  } catch (error: any) {
    console.error("GET /api/expenses/summary failed", error);
    return c.json({ error: error.message ?? "Failed to load summary" }, 500);
  }
});

// GET /api/expenses/list?from=<ms>&to=<ms>&storeId=<id>
// The individual expense records between `from` and `to`, newest first.
expenseRoutes.get("/list", async (c) => {
  const user = authedUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const range = parseRange(c);
    if ("error" in range) return c.json({ error: range.error }, 400);
    const { from, to } = range;

    const scope = await resolveStoreScope(user);
    const storeId = scope.isGlobal ? c.req.query("storeId") || undefined : scope.storeId;

    if (!scope.isGlobal && !storeId) return c.json({ from, to, expenses: [], total: 0 });

    const conditions = [
      eq(schema.ledgerEntries.type, "expense"),
      eq(schema.ledgerEntries.referenceType, "manual"),
      gte(schema.ledgerEntries.date, from),
      lte(schema.ledgerEntries.date, to),
    ];
    if (storeId) conditions.push(eq(schema.ledgerEntries.storeId, storeId));

    const [rows, stores] = await Promise.all([
      db
        .select()
        .from(schema.ledgerEntries)
        .where(and(...conditions))
        // Every manual expense on a day shares the same `date` (noon), so
        // createdAt is the tie-breaker that keeps the order stable.
        .orderBy(desc(schema.ledgerEntries.date), desc(schema.ledgerEntries.createdAt))
        .limit(MAX_LIST_ROWS)
        .all(),
      db.select().from(schema.stores).all(),
    ]);

    const storeIndex = new Map(stores.map((s) => [s.id, s.name]));
    const expenses = rows.map((e) => ({
      id: e.id,
      storeName: storeIndex.get(e.storeId) ?? "Unknown",
      category: e.category,
      description: e.description,
      amount: e.amount,
      date: e.date,
      createdAt: e.createdAt,
    }));

    return c.json({
      from,
      to,
      expenses,
      total: round2(expenses.reduce((sum, e) => sum + e.amount, 0)),
    });
  } catch (error: any) {
    console.error("GET /api/expenses/list failed", error);
    return c.json({ error: error.message ?? "Failed to load expenses" }, 500);
  }
});

// POST /api/expenses — record an expense
expenseRoutes.post("/", async (c) => {
  const user = authedUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const body = await c.req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return c.json({ error: "Invalid request body" }, 400);
    }

    const amount = Number(body.amount);
    const category = String(body.category ?? "").trim();
    const description = String(body.description ?? "").trim();
    const date = body.date ? Number(body.date) : Date.now();

    const scope = await resolveStoreScope(user);
    const storeId = scope.isGlobal ? body.storeId || undefined : scope.storeId;

    if (!storeId) return c.json({ error: "No store is associated with your account" }, 400);
    if (!Number.isFinite(amount) || amount <= 0) {
      return c.json({ error: "Amount must be greater than zero" }, 400);
    }
    if (!category) return c.json({ error: "Category is required" }, 400);
    if (category.length > MAX_CATEGORY_LENGTH) {
      return c.json({ error: `Category can't be longer than ${MAX_CATEGORY_LENGTH} characters` }, 400);
    }
    if (!Number.isFinite(date)) return c.json({ error: "Invalid date" }, 400);

    const entry = await db
      .insert(schema.ledgerEntries)
      .values({
        storeId,
        type: "expense",
        category,
        amount: round2(amount),
        description: description || null,
        referenceType: "manual",
        date,
      })
      .returning()
      .get();

    if (!entry) return c.json({ error: "Failed to record expense" }, 500);

    await logActivity({
      userId: user.id,
      role: user.role,
      action: "expense.created",
      entityType: "expense",
      entityId: entry.id,
      description: `Expense recorded: ${category} (${amount})`,
    });

    return c.json({ expense: entry }, 201);
  } catch (error: any) {
    console.error("POST /api/expenses failed", error);
    return c.json({ error: error.message ?? "Failed to record expense" }, 500);
  }
});

// DELETE /api/expenses?id=... — remove a manually recorded expense
//
// Reads the id from the query string (rather than the path) to match how the
// shared `useApiMutation` hook forwards DELETE variables as query params.
expenseRoutes.delete("/", async (c) => {
  const user = authedUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const id = c.req.query("id");
    if (!id) return c.json({ error: "Expense id is required" }, 400);

    const entry = await db
      .select()
      .from(schema.ledgerEntries)
      .where(eq(schema.ledgerEntries.id, id))
      .get();
    if (!entry) return c.json({ error: "Expense not found" }, 404);
    if (entry.type !== "expense" || entry.referenceType !== "manual") {
      return c.json({ error: "Only manually recorded expenses can be deleted" }, 400);
    }

    const scope = await resolveStoreScope(user);
    if (!scope.isGlobal && entry.storeId !== scope.storeId) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    await db.delete(schema.ledgerEntries).where(eq(schema.ledgerEntries.id, id)).run();

    await logActivity({
      userId: user.id,
      role: user.role,
      action: "expense.deleted",
      entityType: "expense",
      entityId: id,
      description: `Expense deleted: ${entry.category} (${entry.amount})`,
    });

    return c.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/expenses failed", error);
    return c.json({ error: error.message ?? "Failed to delete expense" }, 500);
  }
});