import { Hono } from "hono";
import { and, desc, eq, gte, lte, sql, or, asc, inArray, like } from "drizzle-orm";
import db from "../../db/index.ts";
import * as schema from "../../db/schema.ts";
import type { AuthEnv } from "../../middleware/auth.ts";
import { getUser, requireRole } from "../../auth.ts";
import {
  AccountingError,
  createJournal,
  defaultNormalBalance,
  fail,
  getMappings,
  logActivity,
  monthOf,
  POSTED_STATUSES,
  round2,
  signedBalance,
  sumByAccount,
} from "../lib/accounting.ts";

export const journalRoutes = new Hono<AuthEnv>();

// ══════════════════════════════════════════════════════════════════════════════
// JOURNAL ENTRIES
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/accounting/journal — list journal entries with optional filters
journalRoutes.get("/", async (c) => {
  try {
    const user = getUser(c);
    const isGlobal = user.role === "super_admin" || user.role === "admin";

    const from = c.req.query("from");
    const to = c.req.query("to");
    const storeId = c.req.query("storeId") || undefined;
    const sourceType = c.req.query("sourceType") || undefined;
    const status = c.req.query("status") || undefined;
    const search = c.req.query("search") || undefined;

    const conditions: any[] = [inArray(schema.journalEntries.status, ["draft", "posted", "reversed"])];
    if (from) conditions.push(gte(schema.journalEntries.date, Number(from)));
    if (to) conditions.push(lte(schema.journalEntries.date, Number(to)));
    if (storeId) conditions.push(eq(schema.journalEntries.storeId, storeId));
    if (sourceType) conditions.push(eq(schema.journalEntries.sourceType, sourceType as any));
    if (status) conditions.push(eq(schema.journalEntries.status, status as any));

    if (!isGlobal) {
      const employee = await db.select().from(schema.employees)
        .where(eq(schema.employees.userId, user.id)).get();
      const empStoreId = employee?.storeId || user.storeId;
      if (empStoreId) conditions.push(eq(schema.journalEntries.storeId, empStoreId));
    }

    if (search) {
      conditions.push(
        or(
          like(schema.journalEntries.entryNumber, `%${search}%`),
          like(schema.journalEntries.memo, `%${search}%`)
        )
      );
    }

    const entries = await db.select()
      .from(schema.journalEntries)
      .where(and(...conditions))
      .orderBy(desc(schema.journalEntries.createdAt))
      .all();

    const userIds = [...new Set(entries.map((e) => e.createdBy).filter(Boolean))] as string[];
    const users = await db.select().from(schema.users).where(inArray(schema.users.id, userIds)).all();
    const userById = new Map(users.map((u) => [u.id, u.name]));

    const result = await Promise.all(entries.map(async (entry) => {
      const lines = await db.select().from(schema.journalLines)
        .where(eq(schema.journalLines.entryId, entry.id))
        .orderBy(asc(schema.journalLines.createdAt))
        .all();
      return {
        ...entry,
        createdByName: userById.get(entry.createdBy) ?? "Unknown",
        lineCount: lines.length,
        totalDebit: round2(lines.reduce((s, l) => s + l.debit, 0)),
        totalCredit: round2(lines.reduce((s, l) => s + l.credit, 0)),
        lines,
      };
    }));

    return c.json({ entries: result });
  } catch (error) {
    return fail(c, error);
  }
});

// GET /api/accounting/journal/:id — single entry with lines
journalRoutes.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const entry = await db.select().from(schema.journalEntries)
      .where(eq(schema.journalEntries.id, id)).get();
    if (!entry) throw new AccountingError("Journal entry not found", 404);

    const lines = await db.select().from(schema.journalLines)
      .where(eq(schema.journalLines.entryId, id))
      .orderBy(asc(schema.journalLines.createdAt))
      .all();

    const accountIds = [...new Set(lines.map((l) => l.accountId))];
    const accounts = await db.select().from(schema.accounts)
      .where(inArray(schema.accounts.id, accountIds)).all();
    const accountById = new Map(accounts.map((a) => [a.id, a]));

    const user = await db.select().from(schema.users)
      .where(eq(schema.users.id, entry.createdBy)).get();

    return c.json({
      entry: {
        ...entry,
        createdByName: user?.name ?? "Unknown",
      },
      lines: lines.map((l) => ({
        ...l,
        account: accountById.get(l.accountId) ?? null,
      })),
    });
  } catch (error) {
    return fail(c, error);
  }
});

// POST /api/accounting/journal — create a manual journal entry
journalRoutes.post("/", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin", "accountant"] as any);

    const body = await c.req.json();
    const { date, memo, storeId, sourceType, lines, post } = body;

    if (!date || !sourceType || !Array.isArray(lines) || lines.length < 2) {
      throw new AccountingError("date, sourceType, and at least two lines are required");
    }

    const validSources = ["manual", "adjustment", "bank"] as const;
    if (!validSources.includes(sourceType)) {
      throw new AccountingError(`sourceType must be one of: ${validSources.join(", ")}`);
    }

    const journal = await createJournal({
      date: Number(date),
      memo: memo ?? null,
      storeId: storeId ?? null,
      sourceType: sourceType as any,
      lines,
      createdBy: user.id,
      post: post !== false,
      prefix: "JE",
    });

    await logActivity(user, {
      action: "journal.created",
      entityType: "journal_entries",
      entityId: journal.entry.id,
      description: `Created journal entry ${journal.entry.entryNumber}`,
      metadata: { entryNumber: journal.entry.entryNumber, status: journal.entry.status },
    });

    return c.json({ entry: journal.entry, lines: journal.lines }, 201);
  } catch (error) {
    return fail(c, error);
  }
});

// POST /api/accounting/journal/:id/reverse — create a reversing entry
journalRoutes.post("/:id/reverse", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin", "accountant"] as any);

    const id = c.req.param("id");
    const { date, reason } = await c.req.json();

    const original = await db.select().from(schema.journalEntries)
      .where(eq(schema.journalEntries.id, id)).get();
    if (!original) throw new AccountingError("Journal entry not found", 404);
    if (original.status === "reversed") throw new AccountingError("Entry is already reversed", 409);

    const lines = await db.select().from(schema.journalLines)
      .where(eq(schema.journalLines.entryId, id)).all();

    const reversalLines = lines.map((l) => ({
      accountId: l.accountId,
      debit: l.credit,
      credit: l.debit,
      description: `Reversal of ${original.entryNumber}: ${reason ?? ""}`,
    }));

    const reversal = await createJournal({
      date: date ? Number(date) : Date.now(),
      memo: `Reversal of ${original.entryNumber}`,
      storeId: original.storeId ?? undefined,
      sourceType: "adjustment",
      reversalOfId: id,
      lines: reversalLines,
      createdBy: user.id,
      post: true,
      prefix: "RV",
    });

    await db.update(schema.journalEntries)
      .set({ status: "reversed" })
      .where(eq(schema.journalEntries.id, id))
      .run();

    await logActivity(user, {
      action: "journal.reversed",
      entityType: "journal_entries",
      entityId: id,
      description: `Reversed journal entry ${original.entryNumber}`,
      metadata: { before: { status: "posted" }, after: { status: "reversed", reversalId: reversal.entry.id } },
    });

    return c.json({
      reversal: reversal.entry,
      lines: reversal.lines,
    }, 201);
  } catch (error) {
    return fail(c, error);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// TRIAL BALANCE
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/accounting/reports/trial-balance
journalRoutes.get("/reports/trial-balance", async (c) => {
  try {
    const asOf = c.req.query("asOf") ? Number(c.req.query("asOf")) : Date.now();
    const storeId = c.req.query("storeId") || undefined;

    const [accounts, sums] = await Promise.all([
      db.select().from(schema.accounts).orderBy(asc(schema.accounts.code)).all(),
      sumByAccount({ to: asOf, storeId }),
    ]);

    const rows = accounts
      .filter((a) => a.isActive)
      .map((a) => {
        const s = sums.get(a.id) ?? { debit: 0, credit: 0 };
        const balance = signedBalance(a.normalBalance, s.debit, s.credit);
        return {
          id: a.id, code: a.code, name: a.name, type: a.type,
          normalBalance: a.normalBalance, debit: s.debit, credit: s.credit, balance,
        };
      });

    const totalDebit = round2(rows.reduce((s, r) => s + r.debit, 0));
    const totalCredit = round2(rows.reduce((s, r) => s + r.credit, 0));

    return c.json({
      asOf, storeId, rows, totalDebit, totalCredit,
      outOfBalance: Math.abs(totalDebit - totalCredit) > 0.01,
    });
  } catch (error) {
    return fail(c, error);
  }
});

// GET /api/accounting/reports/balance-sheet
journalRoutes.get("/reports/balance-sheet", async (c) => {
  try {
    const asOf = c.req.query("asOf") ? Number(c.req.query("asOf")) : Date.now();
    const storeId = c.req.query("storeId") || undefined;

    const [accounts, sums] = await Promise.all([
      db.select().from(schema.accounts).orderBy(asc(schema.accounts.code)).all(),
      sumByAccount({ to: asOf, storeId }),
    ]);

    const byType = (type: string) => accounts
      .filter((a) => a.type === type && a.isActive)
      .map((a) => {
        const s = sums.get(a.id) ?? { debit: 0, credit: 0 };
        return {
          code: a.code, name: a.name,
          balance: signedBalance(a.normalBalance, s.debit, s.credit),
        };
      });

    const assets = byType("asset");
    const liabilities = byType("liability");
    const equity = byType("equity");

    const totalAssets = round2(assets.reduce((s, a) => s + a.balance, 0));
    const totalLiabilities = round2(liabilities.reduce((s, a) => s + a.balance, 0));
    const totalEquity = round2(equity.reduce((s, a) => s + a.balance, 0));

    return c.json({
      asOf, storeId, assets, liabilities, equity,
      totalAssets, totalLiabilities, totalEquity,
      balances: totalAssets - (totalLiabilities + totalEquity),
    });
  } catch (error) {
    return fail(c, error);
  }
});

// GET /api/accounting/reports/profit-loss
journalRoutes.get("/reports/profit-loss", async (c) => {
  try {
    const from = c.req.query("from") ? Number(c.req.query("from")) : Date.now() - 30 * 86_400_000;
    const to = c.req.query("to") ? Number(c.req.query("to")) : Date.now();
    const storeId = c.req.query("storeId") || undefined;

    const [accounts, sums] = await Promise.all([
      db.select().from(schema.accounts).orderBy(asc(schema.accounts.code)).all(),
      sumByAccount({ from, to, storeId }),
    ]);

    const revenueAccounts = accounts.filter((a) => a.type === "revenue" && a.isActive);
    const expenseAccounts = accounts.filter((a) => a.type === "expense" && a.isActive);

    const revenue = revenueAccounts.map((a) => {
      const s = sums.get(a.id) ?? { debit: 0, credit: 0 };
      return { code: a.code, name: a.name, amount: signedBalance(a.normalBalance, s.debit, s.credit) };
    });
    const expenses = expenseAccounts.map((a) => {
      const s = sums.get(a.id) ?? { debit: 0, credit: 0 };
      return { code: a.code, name: a.name, amount: signedBalance(a.normalBalance, s.debit, s.credit) };
    });

    const totalRevenue = round2(revenue.reduce((s, r) => s + r.amount, 0));
    const totalExpenses = round2(expenses.reduce((s, r) => s + r.amount, 0));

    return c.json({
      from, to, storeId, revenue, expenses,
      totalRevenue, totalExpenses,
      netProfit: round2(totalRevenue - totalExpenses),
    });
  } catch (error) {
    return fail(c, error);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ACCOUNTING PERIODS
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/accounting/periods
journalRoutes.get("/periods", async (c) => {
  try {
    const periods = await db.select().from(schema.accountingPeriods)
      .orderBy(desc(schema.accountingPeriods.year), desc(schema.accountingPeriods.month))
      .all();

    const userIds = [...new Set(
      [...periods.map((p) => p.closedBy), ...periods.map((p) => p.reopenedBy)].filter(Boolean)
    )] as string[];
    const users = await db.select().from(schema.users).where(inArray(schema.users.id, userIds)).all();
    const userById = new Map(users.map((u) => [u.id, u.name]));

    return c.json({
      periods: periods.map((p) => ({
        ...p,
        closedByName: p.closedBy ? userById.get(p.closedBy) ?? "Unknown" : null,
        reopenedByName: p.reopenedBy ? userById.get(p.reopenedBy) ?? "Unknown" : null,
      })),
    });
  } catch (error) {
    return fail(c, error);
  }
});

// POST /api/accounting/periods/:id/close
journalRoutes.post("/periods/:id/close", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin"]);

    const id = c.req.param("id");
    const period = await db.select().from(schema.accountingPeriods)
      .where(eq(schema.accountingPeriods.id, id)).get();
    if (!period) throw new AccountingError("Period not found", 404);
    if (period.status === "closed") throw new AccountingError("Period is already closed", 409);

    await db.update(schema.accountingPeriods)
      .set({ status: "closed", closedAt: Date.now(), closedBy: user.id })
      .where(eq(schema.accountingPeriods.id, id))
      .run();

    await logActivity(user, {
      action: "period.closed",
      entityType: "accounting_periods",
      entityId: id,
      description: `Closed accounting period ${period.year}-${String(period.month).padStart(2, "0")}`,
    });

    return c.json({ success: true });
  } catch (error) {
    return fail(c, error);
  }
});

// POST /api/accounting/periods/:id/reopen
journalRoutes.post("/periods/:id/reopen", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin"]);

    const id = c.req.param("id");
    const period = await db.select().from(schema.accountingPeriods)
      .where(eq(schema.accountingPeriods.id, id)).get();
    if (!period) throw new AccountingError("Period not found", 404);
    if (period.status === "open") throw new AccountingError("Period is already open", 409);

    await db.update(schema.accountingPeriods)
      .set({ status: "open", reopenedAt: Date.now(), reopenedBy: user.id })
      .where(eq(schema.accountingPeriods.id, id))
      .run();

    await logActivity(user, {
      action: "period.reopened",
      entityType: "accounting_periods",
      entityId: id,
      description: `Reopened accounting period ${period.year}-${String(period.month).padStart(2, "0")}`,
    });

    return c.json({ success: true });
  } catch (error) {
    return fail(c, error);
  }
});