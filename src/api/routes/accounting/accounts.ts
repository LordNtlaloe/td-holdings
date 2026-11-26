import { Hono } from "hono";
import { asc, eq, sql } from "drizzle-orm";
import db from "../../db/index.ts";
import * as schema from "../../db/schema.ts";
import type { AuthEnv } from "../../middleware/auth.ts";
import { getUser } from "../../auth.ts";
import {
    AccountingError, defaultNormalBalance, fail, logActivity, qnum, signedBalance, sumByAccount,
} from "../lib/accounting.ts";

export const accountsRoutes = new Hono<AuthEnv>();

const TYPES = ["asset", "liability", "equity", "revenue", "expense"];

// [code, name, type, normal balance]
const DEFAULT_ACCOUNTS: [string, string, string, string][] = [
    ["1000", "Cash on hand", "asset", "debit"],
    ["1010", "Mpesa", "asset", "debit"],
    ["1020", "Ecocash", "asset", "debit"],
    ["1030", "Bank", "asset", "debit"],
    ["1100", "Accounts receivable", "asset", "debit"],
    ["1300", "Inventory", "asset", "debit"],
    ["2000", "Accounts payable", "liability", "credit"],
    ["2100", "Vouchers outstanding", "liability", "credit"],
    ["3000", "Owner's equity", "equity", "credit"],
    ["3100", "Owner drawings", "equity", "debit"],
    ["4000", "Sales revenue", "revenue", "credit"],
    ["5100", "Returns & cancellations", "revenue", "debit"], // contra revenue
    ["5000", "Cost of goods sold", "expense", "debit"],
    ["6000", "Rent", "expense", "debit"],
    ["6100", "Salaries", "expense", "debit"],
    ["6200", "Utilities", "expense", "debit"],
    ["6900", "Other expenses", "expense", "debit"],
];

// mapping key → account code. The sales / purchase posting code looks accounts up by key.
const DEFAULT_MAPPINGS: [string, string][] = [
    ["payment:Cash", "1000"],
    ["payment:Mpesa", "1010"],
    ["payment:Mobile Payment", "1010"],
    ["payment:Ecocash", "1020"],
    ["payment:Bank Transfer", "1030"],
    ["payment:Card", "1030"],
    ["payment:Credit", "1100"],
    ["payment:Voucher", "2100"],
    ["sales:revenue", "4000"],
    ["sales:returns", "5100"],
    ["inventory", "1300"],
    ["cogs", "5000"],
    ["payables", "2000"],
    ["receivable", "1100"],
    ["equity:drawings", "3100"],
];

// GET /api/accounting/accounts?asOf=&storeId=&includeInactive=1 — chart of accounts with balances
accountsRoutes.get("/", async (c) => {
    try {
        const asOf = qnum(c.req.query("asOf")) ?? Date.now();
        const storeId = c.req.query("storeId") || undefined;
        const includeInactive = c.req.query("includeInactive") === "1";

        const [accounts, sums] = await Promise.all([
            db.select().from(schema.accounts).orderBy(asc(schema.accounts.code)).all(),
            sumByAccount({ to: asOf, storeId }),
        ]);

        return c.json({
            accounts: accounts
                .filter((a) => includeInactive || a.isActive)
                .map((a) => {
                    const s = sums.get(a.id) ?? { debit: 0, credit: 0 };
                    return { ...a, debit: s.debit, credit: s.credit, balance: signedBalance(a.normalBalance, s.debit, s.credit) };
                }),
        });
    } catch (error) {
        return fail(c, error);
    }
});

// GET /api/accounting/accounts/mappings — which account each posting event uses
accountsRoutes.get("/mappings", async (c) => {
    try {
        const rows = await db.select({
            id: schema.accountMappings.id,
            key: schema.accountMappings.key,
            accountId: schema.accountMappings.accountId,
            code: schema.accounts.code,
            name: schema.accounts.name,
        }).from(schema.accountMappings)
            .innerJoin(schema.accounts, eq(schema.accountMappings.accountId, schema.accounts.id))
            .orderBy(asc(schema.accountMappings.key)).all();
        return c.json({ mappings: rows });
    } catch (error) {
        return fail(c, error);
    }
});

// PUT /api/accounting/accounts/mappings/:key — point an event at another account
accountsRoutes.put("/mappings/:key", async (c) => {
    try {
        const user = getUser(c);
        const key = decodeURIComponent(c.req.param("key"));
        const { accountId } = await c.req.json();

        const account = await db.select().from(schema.accounts).where(eq(schema.accounts.id, accountId)).get();
        if (!account) throw new AccountingError("Account not found", 404);

        const existing = await db.select().from(schema.accountMappings).where(eq(schema.accountMappings.key, key)).get();
        if (existing) {
            await db.update(schema.accountMappings).set({ accountId, updatedAt: Date.now() })
                .where(eq(schema.accountMappings.id, existing.id)).run();
        } else {
            await db.insert(schema.accountMappings).values({ key, accountId }).run();
        }

        await logActivity(user, {
            action: "account.mapping_changed", entityType: "account_mappings", entityId: key,
            description: `Mapping "${key}" now uses ${account.code} ${account.name}`,
            metadata: { before: existing?.accountId ?? null, after: accountId },
        });

        return c.json({ success: true });
    } catch (error) {
        return fail(c, error);
    }
});

// POST /api/accounting/accounts/seed — default chart of accounts + mappings (only on an empty chart)
accountsRoutes.post("/seed", async (c) => {
    try {
        const user = getUser(c);
        const count = await db.select({ n: sql<number>`count(*)` }).from(schema.accounts).get();
        if (Number(count?.n) > 0) throw new AccountingError("The chart of accounts already has accounts", 409);

        const mappedCodes = new Set(DEFAULT_MAPPINGS.map(([, code]) => code));
        const created = await db.insert(schema.accounts).values(
            DEFAULT_ACCOUNTS.map(([code, name, type, normalBalance]) => ({
                code, name, type: type as any, normalBalance: normalBalance as any, isSystem: mappedCodes.has(code),
            }))
        ).returning().all();

        const idByCode = new Map(created.map((a) => [a.code, a.id]));
        await db.insert(schema.accountMappings).values(
            DEFAULT_MAPPINGS.map(([key, code]) => ({ key, accountId: idByCode.get(code)! }))
        ).run();

        await logActivity(user, {
            action: "account.seeded", entityType: "accounts",
            description: `Created default chart of accounts (${created.length} accounts)`,
        });

        return c.json({ accounts: created.length, mappings: DEFAULT_MAPPINGS.length }, 201);
    } catch (error) {
        return fail(c, error);
    }
});

// GET /api/accounting/accounts/:id
accountsRoutes.get("/:id", async (c) => {
    try {
        const id = c.req.param("id");
        const account = await db.select().from(schema.accounts).where(eq(schema.accounts.id, id)).get();
        if (!account) throw new AccountingError("Account not found", 404);

        const sums = await sumByAccount({});
        const s = sums.get(id) ?? { debit: 0, credit: 0 };
        return c.json({ account: { ...account, ...s, balance: signedBalance(account.normalBalance, s.debit, s.credit) } });
    } catch (error) {
        return fail(c, error);
    }
});

// POST /api/accounting/accounts
accountsRoutes.post("/", async (c) => {
    try {
        const user = getUser(c);
        const { code, name, type, normalBalance, description, parentId } = await c.req.json();

        if (!code || !name || !type) throw new AccountingError("code, name and type are required");
        if (!TYPES.includes(type)) throw new AccountingError(`type must be one of: ${TYPES.join(", ")}`);
        const normal = normalBalance ?? defaultNormalBalance(type);
        if (normal !== "debit" && normal !== "credit") throw new AccountingError("normalBalance must be debit or credit");

        const duplicate = await db.select().from(schema.accounts).where(eq(schema.accounts.code, String(code))).get();
        if (duplicate) throw new AccountingError(`Account code ${code} already exists`, 409);

        const account = await db.insert(schema.accounts)
            .values({ code: String(code), name, type, normalBalance: normal, description, parentId: parentId ?? null })
            .returning().get();

        await logActivity(user, {
            action: "account.created", entityType: "accounts", entityId: account!.id,
            description: `Created account ${code} "${name}"`, metadata: { before: null, after: account },
        });

        return c.json({ account }, 201);
    } catch (error) {
        return fail(c, error);
    }
});

// PATCH /api/accounting/accounts/:id
// name / description / isActive are always editable. code / type / normalBalance only
// while the account is not a system account and has no postings.
accountsRoutes.patch("/:id", async (c) => {
    try {
        const user = getUser(c);
        const id = c.req.param("id");
        const existing = await db.select().from(schema.accounts).where(eq(schema.accounts.id, id)).get();
        if (!existing) throw new AccountingError("Account not found", 404);

        const body = await c.req.json();
        const updates: Record<string, any> = { updatedAt: Date.now() };
        if (body.name !== undefined) updates.name = body.name;
        if (body.description !== undefined) updates.description = body.description;
        if (body.parentId !== undefined) updates.parentId = body.parentId;

        if (body.isActive !== undefined) {
            if (existing.isSystem && body.isActive === false) throw new AccountingError("System accounts can't be deactivated");
            updates.isActive = Boolean(body.isActive);
        }

        const structural = ["code", "type", "normalBalance"].filter(
            (k) => body[k] !== undefined && body[k] !== (existing as any)[k]
        );
        if (structural.length > 0) {
            if (existing.isSystem) throw new AccountingError("System accounts can't change code, type or normal balance");
            const used = await db.select({ n: sql<number>`count(*)` }).from(schema.journalLines)
                .where(eq(schema.journalLines.accountId, id)).get();
            if (Number(used?.n) > 0) throw new AccountingError("This account has postings, so its code and type are locked", 409);

            if (body.type !== undefined && !TYPES.includes(body.type)) throw new AccountingError("Invalid type");
            if (body.normalBalance !== undefined && !["debit", "credit"].includes(body.normalBalance)) {
                throw new AccountingError("normalBalance must be debit or credit");
            }
            if (body.code !== undefined) {
                const clash = await db.select().from(schema.accounts).where(eq(schema.accounts.code, String(body.code))).get();
                if (clash && clash.id !== id) throw new AccountingError(`Account code ${body.code} already exists`, 409);
                updates.code = String(body.code);
            }
            if (body.type !== undefined) updates.type = body.type;
            if (body.normalBalance !== undefined) updates.normalBalance = body.normalBalance;
        }

        await db.update(schema.accounts).set(updates).where(eq(schema.accounts.id, id)).run();
        const account = await db.select().from(schema.accounts).where(eq(schema.accounts.id, id)).get();

        await logActivity(user, {
            action: "account.updated", entityType: "accounts", entityId: id,
            description: `Updated account ${existing.code} "${existing.name}"`, metadata: { before: existing, after: account },
        });

        return c.json({ account });
    } catch (error) {
        return fail(c, error);
    }
});