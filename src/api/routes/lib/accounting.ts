import type { Context } from "hono";
import { and, desc, eq, gte, inArray, like, lt, lte, sql } from "drizzle-orm";
import db from "../../db/index.ts";
import * as schema from "../../db/schema.ts";

// ─── Constants ──────────────────────────────────────────────────────────────

/** Entries that count towards balances. A "reversed" entry still counts: its reversal nets it to zero. */
export const POSTED_STATUSES = ["posted", "reversed"] as const;

/** Lesotho is UTC+2 all year (no DST). Change this if the stores ever move time zone. */
export const STORE_UTC_OFFSET_HOURS = 2;
const HOUR = 3_600_000;
export const DAY = 24 * HOUR;

/** Payment methods whose mapped account counts as "cash" for the cash-flow report. */
export const CASH_METHODS = ["Cash", "Mpesa", "Ecocash", "Bank Transfer", "Card", "Mobile Payment"];

// ─── Errors & small utils ───────────────────────────────────────────────────

export class AccountingError extends Error {
  status: 400 | 403 | 404 | 409;
  constructor(message: string, status: 400 | 403 | 404 | 409 = 400) {
    super(message);
    this.status = status;
  }
}

/** Uniform error response for every accounting route. */
export function fail(c: Context, error: unknown) {
  if (error instanceof AccountingError) return c.json({ error: error.message }, error.status);
  console.error(error);
  return c.json({ error: error instanceof Error ? error.message : "Request failed" }, 400);
}

export const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

/** Query-string number, or undefined when missing / not numeric. */
export function qnum(value: string | undefined): number | undefined {
  if (value === undefined || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** Accepts epoch ms (number or numeric string) or an ISO date string. */
export function toMs(value: unknown, field = "date"): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const asNumber = Number(value);
    if (Number.isFinite(asNumber)) return asNumber;
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  throw new AccountingError(`Invalid ${field}`);
}

export function chunk<T>(items: T[], size = 400): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Signed balance in the account's own direction (debit-normal: Dr − Cr, credit-normal: Cr − Dr). */
export const signedBalance = (normal: string, debit: number, credit: number) =>
  round2(normal === "debit" ? debit - credit : credit - debit);

export const defaultNormalBalance = (type: string): "debit" | "credit" =>
  type === "asset" || type === "expense" ? "debit" : "credit";

// ─── Periods ────────────────────────────────────────────────────────────────

export function monthRange(year: number, month: number) {
  return {
    start: Date.UTC(year, month - 1, 1) - STORE_UTC_OFFSET_HOURS * HOUR,
    end: Date.UTC(year, month, 1) - STORE_UTC_OFFSET_HOURS * HOUR - 1,
  };
}

export function monthOf(ms: number) {
  const d = new Date(ms + STORE_UTC_OFFSET_HOURS * HOUR);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

export const periodLabel = (p: { year: number; month: number }) =>
  `${p.year}-${String(p.month).padStart(2, "0")}`;

/** Returns the period containing `date`, creating it (open) the first time it is needed. */
export async function ensurePeriod(date: number) {
  const { year, month } = monthOf(date);
  const existing = await db.select().from(schema.accountingPeriods)
    .where(and(eq(schema.accountingPeriods.year, year), eq(schema.accountingPeriods.month, month))).get();
  if (existing) return existing;

  const { start, end } = monthRange(year, month);
  const created = await db.insert(schema.accountingPeriods)
    .values({ year, month, startDate: start, endDate: end }).returning().get();
  return created!;
}

/** Throws 409 when `date` falls in a closed period. Call before ANY posting. */
export async function assertPeriodOpen(date: number) {
  const period = await ensurePeriod(date);
  if (period.status === "closed") {
    throw new AccountingError(
      `Period ${periodLabel(period)} is closed. Post into an open period or ask a super admin to reopen it.`,
      409
    );
  }
  return period;
}

// ─── Journal helpers ────────────────────────────────────────────────────────

export interface LineInput {
  accountId: string;
  debit: number;
  credit: number;
  description?: string;
}

/** Validates shape, one-sided lines, active accounts and balance. Returns clean lines. */
export async function normalizeLines(raw: unknown): Promise<LineInput[]> {
  if (!Array.isArray(raw) || raw.length < 2) {
    throw new AccountingError("A journal entry needs at least two lines");
  }

  const lines: LineInput[] = raw.map((line: any, index: number) => {
    if (!line?.accountId) throw new AccountingError(`Line ${index + 1} has no account`);
    const debit = round2(Number(line.debit) || 0);
    const credit = round2(Number(line.credit) || 0);
    if (debit < 0 || credit < 0) throw new AccountingError(`Line ${index + 1} has a negative amount`);
    if ((debit > 0) === (credit > 0)) {
      throw new AccountingError(`Line ${index + 1} needs either a debit or a credit, not both and not neither`);
    }
    return {
      accountId: String(line.accountId),
      debit,
      credit,
      description: line.description ? String(line.description) : undefined,
    };
  });

  const totalDebit = round2(lines.reduce((s, l) => s + l.debit, 0));
  const totalCredit = round2(lines.reduce((s, l) => s + l.credit, 0));
  if (Math.abs(totalDebit - totalCredit) > 0.005) {
    throw new AccountingError(
      `Entry is not balanced: debits ${totalDebit.toFixed(2)} vs credits ${totalCredit.toFixed(2)}`
    );
  }

  const ids = [...new Set(lines.map((l) => l.accountId))];
  const found = await db.select().from(schema.accounts).where(inArray(schema.accounts.id, ids)).all();
  const byId = new Map(found.map((a) => [a.id, a]));
  for (const id of ids) {
    const account = byId.get(id);
    if (!account) throw new AccountingError(`Unknown account ${id}`);
    if (!account.isActive) throw new AccountingError(`Account ${account.code} ${account.name} is inactive`);
  }

  return lines;
}

/** Next "JE-0001" style number for a prefix (JE manual, RV reversal, BK bank, ...). */
export async function nextEntryNumber(prefix: string) {
  const last = await db.select({ n: schema.journalEntries.entryNumber }).from(schema.journalEntries)
    .where(like(schema.journalEntries.entryNumber, `${prefix}-%`))
    .orderBy(desc(sql`length(${schema.journalEntries.entryNumber})`), desc(schema.journalEntries.entryNumber))
    .limit(1).get();
  const next = last ? parseInt(last.n.slice(prefix.length + 1), 10) + 1 : 1;
  return `${prefix}-${String(Number.isFinite(next) ? next : 1).padStart(4, "0")}`;
}

export interface CreateJournalInput {
  date: number;
  memo?: string | null;
  storeId?: string | null;
  sourceType: "sale" | "cancellation" | "purchase" | "manual" | "adjustment" | "bank";
  saleId?: string | null;
  purchaseId?: string | null;
  cancelledSaleId?: string | null;
  reversalOfId?: string | null;
  lines: unknown;
  createdBy: string;
  /** true = post immediately (checks the period lock); false = save as a draft. */
  post: boolean;
  prefix?: string;
}

/**
 * The ONE way to write a journal entry. Reuse it from the sales / purchase routes
 * so every posting is validated, balanced and period-checked the same way.
 */
export async function createJournal(input: CreateJournalInput) {
  const lines = await normalizeLines(input.lines);
  const period = input.post ? await assertPeriodOpen(input.date) : null;
  const entryNumber = await nextEntryNumber(input.prefix ?? "JE");
  const now = Date.now();

  const entry = await db.insert(schema.journalEntries).values({
    entryNumber,
    storeId: input.storeId ?? null,
    date: input.date,
    memo: input.memo ?? null,
    status: input.post ? "posted" : "draft",
    sourceType: input.sourceType,
    saleId: input.saleId ?? null,
    purchaseId: input.purchaseId ?? null,
    cancelledSaleId: input.cancelledSaleId ?? null,
    periodId: period?.id ?? null,
    reversalOfId: input.reversalOfId ?? null,
    createdBy: input.createdBy,
    postedBy: input.post ? input.createdBy : null,
    postedAt: input.post ? now : null,
  }).returning().get();

  try {
    const saved = await db.insert(schema.journalLines).values(
      lines.map((l) => ({
        entryId: entry!.id,
        accountId: l.accountId,
        description: l.description ?? null,
        debit: l.debit,
        credit: l.credit,
      }))
    ).returning().all();
    return { entry: entry!, lines: saved };
  } catch (error) {
    // No multi-statement transaction here, so undo the header ourselves.
    await db.delete(schema.journalEntries).where(eq(schema.journalEntries.id, entry!.id)).run();
    throw error;
  }
}

// ─── Balances & mappings ────────────────────────────────────────────────────

export interface SumOptions {
  from?: number; // date >= from
  to?: number; // date <= to
  before?: number; // date < before (opening balances)
  storeId?: string;
}

/** Debit / credit totals per account over posted entries. */
export async function sumByAccount(opts: SumOptions = {}) {
  const conds: any[] = [inArray(schema.journalEntries.status, [...POSTED_STATUSES])];
  if (opts.from !== undefined) conds.push(gte(schema.journalEntries.date, opts.from));
  if (opts.to !== undefined) conds.push(lte(schema.journalEntries.date, opts.to));
  if (opts.before !== undefined) conds.push(lt(schema.journalEntries.date, opts.before));
  if (opts.storeId) conds.push(eq(schema.journalEntries.storeId, opts.storeId));

  const rows = await db.select({
    accountId: schema.journalLines.accountId,
    debit: sql<number>`coalesce(sum(${schema.journalLines.debit}), 0)`,
    credit: sql<number>`coalesce(sum(${schema.journalLines.credit}), 0)`,
  }).from(schema.journalLines)
    .innerJoin(schema.journalEntries, eq(schema.journalLines.entryId, schema.journalEntries.id))
    .where(and(...conds))
    .groupBy(schema.journalLines.accountId)
    .all();

  return new Map(
    rows.map((r) => [r.accountId, { debit: round2(Number(r.debit)), credit: round2(Number(r.credit)) }])
  );
}

/** key → accountId, e.g. "payment:Mpesa" → <id of 1010>. */
export async function getMappings() {
  const rows = await db.select().from(schema.accountMappings).all();
  return new Map(rows.map((r) => [r.key, r.accountId]));
}

export async function cashAccountIds() {
  const mappings = await getMappings();
  const ids = new Set<string>();
  for (const method of CASH_METHODS) {
    const id = mappings.get(`payment:${method}`);
    if (id) ids.add(id);
  }
  return ids;
}

// ─── Audit ──────────────────────────────────────────────────────────────────

export async function logActivity(
  user: { id: string; role: string },
  entry: {
    action: string;
    entityType: string;
    entityId?: string;
    description: string;
    metadata?: unknown;
    storeId?: string | null;
  }
) {
  await db.insert(schema.activityLogs).values({
    userId: user.id,
    role: user.role,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    description: entry.description,
    storeId: entry.storeId ?? null,
    metadata: entry.metadata === undefined ? null : JSON.stringify(entry.metadata),
  }).run();
}