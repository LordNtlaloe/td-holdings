// ─────────────────────────────────────────────────────────────────────────────
// Backfill journal entries for all existing sales that don't have one yet.
//
// Reads every sale, and when no journal entry links to it (via
// ledger_entries.journalEntryId or journal_entries.saleId), posts a balanced
// double-entry entry:
//
//   Dr: Payment account (Cash / Mpesa / ...) = netTotal
//   Cr: Sales Revenue                         = netTotal
//   Dr: COGS                                  = cost of items sold
//   Cr: Inventory                             = cost of items sold
//
// Usage:
//   npx tsx scripts/backfill-journal-entries.ts           # dry-run (no writes)
//   npx tsx scripts/backfill-journal-entries.ts --write   # actually write
// ─────────────────────────────────────────────────────────────────────────────

import "../src/api/env.ts";

import { eq, desc, sql } from "drizzle-orm";
import db from "../src/api/db/index.ts";
import * as schema from "../src/api/db/schema.ts";
import {
  createJournal,
  getMappings,
  round2,
  ensurePeriod,
} from "../src/api/routes/lib/accounting.ts";

// ─── Default chart of accounts (same as src/api/routes/accounting/accounts.ts) ──
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
  ["5100", "Returns & cancellations", "revenue", "debit"],
  ["5000", "Cost of goods sold", "expense", "debit"],
  ["6000", "Rent", "expense", "debit"],
  ["6100", "Salaries", "expense", "debit"],
  ["6200", "Utilities", "expense", "debit"],
  ["6900", "Other expenses", "expense", "debit"],
];

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

async function ensureSeed() {
  const count = await db
    .select({ n: sql<number>`count(*)` })
    .from(schema.accounts)
    .get();
  if (Number(count?.n) > 0) return;

  console.log("   🌱 Seeding default chart of accounts...");
  const mappedCodes = new Set(DEFAULT_MAPPINGS.map(([, code]) => code));
  const created = await db
    .insert(schema.accounts)
    .values(
      DEFAULT_ACCOUNTS.map(([code, name, type, normalBalance]) => ({
        code,
        name,
        type: type as any,
        normalBalance: normalBalance as any,
        isSystem: mappedCodes.has(code),
      }))
    )
    .returning()
    .all();

  const idByCode = new Map(created.map((a) => [a.code, a.id]));
  await db
    .insert(schema.accountMappings)
    .values(
      DEFAULT_MAPPINGS.map(([key, code]) => ({ key, accountId: idByCode.get(code)! }))
    )
    .run();

  console.log(`   ✓ Seeded ${created.length} accounts, ${DEFAULT_MAPPINGS.length} mappings`);
}

const WRITE = process.argv.includes("--write");
const DRY_RUN = !WRITE;

async function main() {
  console.log(
    `🔄 Backfilling journal entries for sales (${DRY_RUN ? "DRY RUN" : "WRITE MODE"})`
  );

  // Ensure chart of accounts is seeded
  await ensureSeed();

  // Ensure account mappings exist
  const mappings = await getMappings();
  const required = [
    "payment:Cash",
    "payment:Mpesa",
    "payment:Ecocash",
    "payment:Bank Transfer",
    "payment:Card",
    "payment:Mobile Payment",
    "sales:revenue",
    "cogs",
    "inventory",
  ];
  const missing = required.filter((k) => !mappings.has(k));
  if (missing.length > 0) {
    console.error(
      `❌ Missing account mappings: ${missing.join(", ")}. ` +
        `Seed the chart of accounts first: POST /api/accounting/accounts/seed`
    );
    process.exit(1);
  }

  // Find a system user to act as createdBy (FK requires a real user)
  const systemUser = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .limit(1)
    .get();
  if (!systemUser) {
    console.error("❌ No users found in database — cannot create journal entries.");
    process.exit(1);
  }
  const createdBy = systemUser.id;

  // Find all sales
  const allSales = await db
    .select()
    .from(schema.sales)
    .orderBy(desc(schema.sales.createdAt))
    .all();
  console.log(`   Found ${allSales.length} sales total`);

  // Find which sales already have journal entries
  const existing = await db
    .select({ saleId: schema.journalEntries.saleId })
    .from(schema.journalEntries)
    .where(eq(schema.journalEntries.sourceType, "sale"));
  const journalledSaleIds = new Set(existing.map((r) => r.saleId).filter(Boolean));

  const salesToProcess = allSales.filter((s) => !journalledSaleIds.has(s.id));
  console.log(`   ${salesToProcess.length} sales need journal entries`);

  if (salesToProcess.length === 0) {
    console.log("   ✓ Nothing to do — every sale already has a journal entry.");
    process.exit(0);
  }

  // Load all products once for COGS lookups
  const allProducts = await db.select().from(schema.products).all();
  const productById = new Map(allProducts.map((p) => [p.id, p]));

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const sale of salesToProcess) {
    const items = await db
      .select()
      .from(schema.saleItems)
      .where(eq(schema.saleItems.saleId, sale.id))
      .all();

    if (items.length === 0) {
      console.log(`   ⚠️  Sale ${sale.id} has no items — skipping`);
      skipped++;
      continue;
    }

    // Calculate COGS
    let totalCogs = 0;
    for (const item of items) {
      const product = productById.get(item.productId);
      if (product) {
        totalCogs += product.costPrice * item.quantity;
      }
    }
    totalCogs = round2(totalCogs);

    const netTotal = round2(sale.totalAmount);

    const paymentAccountId = mappings.get(`payment:${sale.paymentMethod}`);
    const revenueAccountId = mappings.get("sales:revenue");
    const cogsAccountId = mappings.get("cogs");
    const inventoryAccountId = mappings.get("inventory");

    if (!paymentAccountId) {
      console.log(
        `   ⚠️  Sale ${sale.id}: no mapping for payment:${sale.paymentMethod} — skipping`
      );
      skipped++;
      continue;
    }
    if (!revenueAccountId || !cogsAccountId || !inventoryAccountId) {
      console.log(`   ⚠️  Sale ${sale.id}: missing core account mapping — skipping`);
      skipped++;
      continue;
    }

    const lines = [
      {
        accountId: paymentAccountId,
        debit: netTotal,
        credit: 0,
        description: `Sale ${sale.id} – ${sale.paymentMethod}`,
      },
      {
        accountId: revenueAccountId,
        debit: 0,
        credit: netTotal,
        description: `Sale ${sale.id} – revenue`,
      },
    ];

    if (totalCogs > 0) {
      lines.push(
        {
          accountId: cogsAccountId,
          debit: totalCogs,
          credit: 0,
          description: `Sale ${sale.id} – COGS`,
        },
        {
          accountId: inventoryAccountId,
          debit: 0,
          credit: totalCogs,
          description: `Sale ${sale.id} – Inventory`,
        }
      );
    }

    if (DRY_RUN) {
      console.log(
        `   [DRY] Sale ${sale.id}: Dr ${netTotal} / Cr ${netTotal} / COGS ${totalCogs}`
      );
      processed++;
      continue;
    }

    try {
      // Ensure the period is open for this sale's date
      await ensurePeriod(sale.createdAt);

      await createJournal({
        date: sale.createdAt,
        memo: `Backfilled sale ${sale.id}`,
        storeId: sale.storeId ?? undefined,
        sourceType: "sale",
        saleId: sale.id,
        lines,
        createdBy,
        post: true,
        prefix: "SL",
      });

      processed++;
      if (processed % 50 === 0) {
        console.log(`   …processed ${processed}/${salesToProcess.length}`);
      }
    } catch (err: any) {
      errors++;
      console.error(`   ❌ Sale ${sale.id}: ${err.message}`);
    }
  }

  console.log(
    `\n✓ Done: ${processed} processed, ${skipped} skipped, ${errors} errors`
  );
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});