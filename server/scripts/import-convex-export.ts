// ─────────────────────────────────────────────────────────────────────────────
// Import a Convex snapshot export into the Turso (libSQL) database.
//
// Reads `<export>/<table>/documents.jsonl` produced by `convex export`.
//
//   cd server
//   npx tsx scripts/import-convex-export.ts [path-to-export-dir]
//
// Behaviour
//   • Convex `_id`            → Turso `id`   (keeps every foreign key intact)
//   • Convex `_creationTime`  → `createdAt`  (rounded; Convex emits a float)
//   • Convex array/object columns (sizes, colors, variants, sizePricing,
//     saleEdits.changes) ↔ JSON text, as the Drizzle schema expects
//   • Convex Auth tables (authAccounts, authSessions, …) are skipped — the new
//     backend uses JWT + `users.passwordHash`, so passwords must be reset.
//   • Idempotent: `on conflict do nothing`, so re-running is safe.
//   • Foreign key checks are relaxed for the session so that rows orphaned by
//     deletes on the old deployment don't abort the import.
// ─────────────────────────────────────────────────────────────────────────────

import { config as loadEnv } from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "../src/db/schema.ts";
import { describeTarget, resolveDatabaseTarget } from "../src/db/url.ts";

// Load `server/.env` and/or the repo-root `.env`.
loadEnv({ path: [".env", "../.env"] });

const EXPORT_DIR = resolve(process.argv[2] ?? "../convex-export");
const CHUNK_SIZE = 40; // keeps well under SQLite's bound-parameter limit

// Same precedence as the API server, so a seed can never land on a different
// database than the app reads from.
const target = resolveDatabaseTarget();

const client = createClient({ url: target.url, authToken: target.authToken });
const db = drizzle(client, { schema });

console.log(`\nImporting Convex export from: ${EXPORT_DIR}`);
console.log(`Target database:             ${describeTarget(target)}\n`);

// ─── Helpers ────────────────────────────────────────────────────────────────

function readTable(name: string): any[] {
  const file = join(EXPORT_DIR, name, "documents.jsonl");
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
}

/** Convex timestamps are floats (e.g. 1782374107802.1907) — round them. */
const stamp = (v: any, fallback: any) => {
  const n = typeof v === "number" ? v : fallback;
  return typeof n === "number" ? Math.round(n) : Date.now();
};

/** Common `id` + `createdAt` mapping derived from the Convex document. */
const base = (d: any) => ({
  id: d._id,
  createdAt: stamp(d.createdAt, d._creationTime),
});

const updated = (d: any) => ({ updatedAt: stamp(d.updatedAt, d._creationTime) });
const json = (v: any) => (v === undefined || v === null ? null : JSON.stringify(v));
const orNull = (v: any) => (v === undefined ? null : v);

/** Drop `undefined` so Drizzle falls back to the column default. */
function clean<T extends Record<string, any>>(row: T): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value !== undefined) out[key] = value;
  }
  return out;
}

// ─── Table specs (dependency order — parents before children) ───────────────

type Spec = {
  /** Directory name inside the Convex export. */
  name: string;
  /** Target Drizzle table. */
  table: any;
  map: (d: any) => Record<string, any>;
};

const specs: Spec[] = [
  {
    name: "departments",
    table: schema.departments,
    map: (d) => clean({ ...base(d), name: d.name, description: orNull(d.description), ...updated(d) }),
  },
  {
    name: "stores",
    table: schema.stores,
    map: (d) =>
      clean({
        ...base(d),
        name: d.name,
        type: d.type,
        address: orNull(d.address),
        phone: d.phone,
        xCoordinates: d.xCoordinates,
        yCoordinates: d.yCoordinates,
        isActive: d.isActive ?? true,
        printAgentId: orNull(d.printAgentId),
        ...updated(d),
      }),
  },
  {
    name: "categories",
    table: schema.categories,
    map: (d) =>
      clean({
        ...base(d),
        name: d.name,
        departmentId: d.departmentId,
        description: orNull(d.description),
        ...updated(d),
      }),
  },
  {
    name: "users",
    table: schema.users,
    map: (d) =>
      clean({
        ...base(d),
        email: d.email,
        name: d.name,
        role: d.role ?? "cashier",
        storeId: orNull(d.storeId),
        // Convex Auth owned the password; users must reset it.
        passwordHash: null,
        image: orNull(d.image),
        status: d.status ?? "active",
        ...updated(d),
      }),
  },
  {
    name: "products",
    table: schema.products,
    map: (d) =>
      clean({
        ...base(d),
        name: d.name,
        sku: d.sku,
        categoryId: d.categoryId,
        departmentId: d.departmentId,
        sizes: json(d.sizes),
        colors: json(d.colors),
        variants: json(d.variants),
        sizePricing: json(d.sizePricing),
        costPrice: d.costPrice,
        sellingPrice: d.sellingPrice,
        description: orNull(d.description),
        isActive: d.isActive ?? true,
        ...updated(d),
      }),
  },
  {
    name: "employees",
    table: schema.employees,
    map: (d) =>
      clean({
        ...base(d),
        userId: d.userId,
        storeId: d.storeId,
        role: d.role,
        isActive: d.isActive ?? true,
        ...updated(d),
      }),
  },
  {
    name: "customers",
    table: schema.customers,
    map: (d) =>
      clean({
        ...base(d),
        name: d.name,
        email: orNull(d.email),
        phone: orNull(d.phone),
        isActive: d.isActive ?? true,
        notes: orNull(d.notes),
        loyaltyPoints: d.loyaltyPoints ?? 0,
        totalSpent: d.totalSpent ?? 0,
        lastPurchaseAt: orNull(d.lastPurchaseAt),
        visitCount: d.visitCount ?? 0,
        ...updated(d),
      }),
  },
  {
    name: "suppliers",
    table: schema.suppliers,
    map: (d) => clean({ ...base(d), name: d.name, email: orNull(d.email), phone: orNull(d.phone), ...updated(d) }),
  },
  {
    name: "storeDepartments",
    table: schema.storeDepartments,
    map: (d) => clean({ ...base(d), storeId: d.storeId, departmentId: d.departmentId, ...updated(d) }),
  },
  {
    name: "inventory",
    table: schema.inventory,
    map: (d) =>
      clean({ ...base(d), storeId: d.storeId, productId: d.productId, reorderLevel: orNull(d.reorderLevel), ...updated(d) }),
  },
  {
    name: "batches",
    table: schema.batches,
    map: (d) =>
      clean({
        ...base(d),
        productId: d.productId,
        storeId: d.storeId,
        batchNumber: d.batchNumber,
        quantity: d.quantity,
        costPrice: d.costPrice,
        receivedAt: stamp(d.receivedAt, d._creationTime),
        ...updated(d),
      }),
  },
  {
    name: "transfers",
    table: schema.transfers,
    map: (d) =>
      clean({
        ...base(d),
        fromStoreId: d.fromStoreId,
        toStoreId: d.toStoreId,
        status: d.status,
        notes: orNull(d.notes),
        receivedAt: orNull(d.receivedAt),
        ...updated(d),
      }),
  },
  {
    name: "transferItems",
    table: schema.transferItems,
    map: (d) =>
      clean({
        ...base(d),
        transferId: d.transferId,
        productId: d.productId,
        quantityRequested: d.quantityRequested,
        quantityReceived: orNull(d.quantityReceived),
        ...updated(d),
      }),
  },
  {
    name: "transferItemBatches",
    table: schema.transferItemBatches,
    map: (d) =>
      clean({
        ...base(d),
        transferItemId: d.transferItemId,
        batchId: d.batchId,
        side: d.side,
        quantity: d.quantity,
      }),
  },
  {
    name: "transferDiscrepancies",
    table: schema.transferDiscrepancies,
    map: (d) =>
      clean({
        ...base(d),
        transferItemId: d.transferItemId,
        expectedQty: d.expectedQty,
        receivedQty: d.receivedQty,
        reason: d.reason,
        reportedBy: d.reportedBy,
        reportedAt: stamp(d.reportedAt, d._creationTime),
      }),
  },
  {
    name: "purchases",
    table: schema.purchases,
    map: (d) =>
      clean({
        ...base(d),
        storeId: d.storeId,
        supplierId: orNull(d.supplierId),
        totalAmount: d.totalAmount,
        status: d.status,
        ...updated(d),
      }),
  },
  {
    name: "purchaseItems",
    table: schema.purchaseItems,
    map: (d) =>
      clean({
        ...base(d),
        purchaseId: d.purchaseId,
        productId: d.productId,
        quantity: d.quantity,
        costPrice: d.costPrice,
        batchNumber: d.batchNumber,
        batchId: orNull(d.batchId),
      }),
  },
  {
    name: "sales",
    table: schema.sales,
    map: (d) =>
      clean({
        ...base(d),
        storeId: d.storeId,
        customerId: orNull(d.customerId),
        totalAmount: d.totalAmount,
        discountTotal: d.discountTotal ?? 0,
        status: d.status,
        paymentMethod: d.paymentMethod,
        paymentSplits: orNull(d.paymentSplits),
        amountReceived: orNull(d.amountReceived),
        changeDue: orNull(d.changeDue),
        cancelledAt: orNull(d.cancelledAt),
        cancelledBy: orNull(d.cancelledBy),
        cancelledReason: orNull(d.cancelledReason),
        originalSaleId: orNull(d.originalSaleId),
        ...updated(d),
      }),
  },
  {
    name: "saleItems",
    table: schema.saleItems,
    map: (d) =>
      clean({
        ...base(d),
        saleId: d.saleId,
        productId: d.productId,
        quantity: d.quantity,
        unitPrice: d.unitPrice,
        size: orNull(d.size),
        color: orNull(d.color),
        variant: orNull(d.variant),
        originalSaleItemId: orNull(d.originalSaleItemId),
      }),
  },
  {
    name: "saleItemBatches",
    table: schema.saleItemBatches,
    map: (d) =>
      clean({
        ...base(d),
        saleItemId: d.saleItemId,
        batchId: d.batchId,
        quantity: d.quantity,
        restoredAt: orNull(d.restoredAt),
      }),
  },
  {
    name: "saleDiscounts",
    table: schema.saleDiscounts,
    map: (d) =>
      clean({
        ...base(d),
        saleId: d.saleId,
        productId: d.productId,
        discountAmount: d.discountAmount,
        reason: orNull(d.reason),
      }),
  },
  {
    name: "cancelledSales",
    table: schema.cancelledSales,
    map: (d) =>
      clean({
        ...base(d),
        originalSaleId: d.originalSaleId,
        cancelledSaleId: d.cancelledSaleId,
        cancelledAt: stamp(d.cancelledAt, d._creationTime),
        cancelledBy: d.cancelledBy,
        reason: orNull(d.reason),
        originalData: typeof d.originalData === "string" ? d.originalData : json(d.originalData),
      }),
  },
  {
    name: "saleEdits",
    table: schema.saleEdits,
    map: (d) =>
      clean({
        ...base(d),
        saleId: d.saleId,
        editedBy: d.editedBy,
        editedAt: stamp(d.editedAt, d._creationTime),
        reason: d.reason,
        changes: typeof d.changes === "string" ? d.changes : json(d.changes),
        originalData: typeof d.originalData === "string" ? d.originalData : json(d.originalData),
        newData: typeof d.newData === "string" ? d.newData : json(d.newData),
      }),
  },
  {
    name: "ledgerEntries",
    table: schema.ledgerEntries,
    map: (d) =>
      clean({
        ...base(d),
        storeId: d.storeId,
        type: d.type,
        category: d.category,
        amount: d.amount,
        description: orNull(d.description),
        referenceType: orNull(d.referenceType),
        saleId: orNull(d.saleId),
        purchaseId: orNull(d.purchaseId),
        cancelledSaleId: orNull(d.cancelledSaleId),
        date: stamp(d.date, d._creationTime),
      }),
  },
  {
    name: "activityLogs",
    table: schema.activityLogs,
    map: (d) =>
      clean({
        ...base(d),
        userId: d.userId,
        role: d.role,
        action: d.action,
        entityType: orNull(d.entityType),
        entityId: orNull(d.entityId),
        description: orNull(d.description),
      }),
  },
  {
    name: "invoices",
    table: schema.invoices,
    map: (d) =>
      clean({
        ...base(d),
        storeId: d.storeId,
        docType: d.docType,
        invoiceNumber: d.invoiceNumber,
        customerId: orNull(d.customerId),
        customerName: orNull(d.customerName),
        customerPhone: orNull(d.customerPhone),
        status: d.status,
        totalAmount: d.totalAmount,
        discountTotal: orNull(d.discountTotal),
        validUntil: orNull(d.validUntil),
        notes: orNull(d.notes),
        createdBy: d.createdBy,
        paidAt: orNull(d.paidAt),
        convertedFromId: orNull(d.convertedFromId),
        convertedToSaleId: orNull(d.convertedToSaleId),
        ...updated(d),
      }),
  },
  {
    name: "invoiceItems",
    table: schema.invoiceItems,
    map: (d) =>
      clean({
        ...base(d),
        invoiceId: d.invoiceId,
        productId: d.productId,
        quantity: d.quantity,
        unitPrice: d.unitPrice,
        size: orNull(d.size),
        color: orNull(d.color),
        variant: orNull(d.variant),
      }),
  },
];

// Tables intentionally NOT imported: Convex Auth internals (authAccounts,
// authSessions, authRefreshTokens, authVerificationCodes, authVerifiers,
// authRateLimits) and scratch tables (todos, journalEntries, entryLines,
// accounts) which have no counterpart in the new schema.

// ─── Run ────────────────────────────────────────────────────────────────────

async function main() {
  // Rows orphaned by deletes on the old deployment shouldn't abort the import.
  try {
    await client.execute("PRAGMA foreign_keys = OFF");
  } catch {
    console.warn("  (could not disable foreign keys — continuing; insert order is FK-safe)");
  }

  const summary: { table: string; read: number; written: number; error?: string }[] = [];

  for (const spec of specs) {
    const source = readTable(spec.name);
    if (source.length === 0) {
      summary.push({ table: spec.name, read: 0, written: 0 });
      continue;
    }

    const rows = source.map((d) => spec.map(d));
    let written = 0;
    let error: string | undefined;

    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      try {
        await db.insert(spec.table).values(chunk).onConflictDoNothing().run();
        written += chunk.length;
      } catch (err: any) {
        error = err?.message ?? String(err);
        console.error(`  ✗ ${spec.name} [rows ${i}-${i + chunk.length - 1}]: ${error}`);
        break;
      }
    }

    summary.push({ table: spec.name, read: source.length, written, error });
  }

  console.log("  table                      read    written");
  console.log("  ─────────────────────────  ─────   ───────");
  let totalRead = 0;
  let totalWritten = 0;
  for (const row of summary) {
    totalRead += row.read;
    totalWritten += row.written;
    const flag = row.error ? "  ✗" : "";
    console.log(
      `  ${row.table.padEnd(25)}  ${String(row.read).padStart(5)}   ${String(row.written).padStart(7)}${flag}`
    );
  }
  console.log("  ─────────────────────────  ─────   ───────");
  console.log(`  ${"TOTAL".padEnd(25)}  ${String(totalRead).padStart(5)}   ${String(totalWritten).padStart(7)}\n`);

  const failed = summary.filter((r) => r.error);
  if (failed.length > 0) {
    console.error(`⚠️  ${failed.length} table(s) reported errors — see above.\n`);
  } else {
    console.log("✅ Import complete.\n");
  }

  client.close();
}

main().catch((err) => {
  console.error("\nImport failed:", err);
  process.exit(1);
});
