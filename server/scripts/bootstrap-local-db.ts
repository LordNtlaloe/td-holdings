// ─────────────────────────────────────────────────────────────────────────────
// Prepare the local SQLite database that lives beside the project.
//
// Safe — and fast — to run on every `npm run dev`, because each step is
// idempotent and the expensive one (seeding) is skipped once there is data:
//
//   1. Create/upgrade the schema from the journal-tracked migrations in
//      `drizzle/`.
//   2. Apply `drizzle/indexes.sql` (59 × `CREATE INDEX IF NOT EXISTS`; it is
//      not part of the drizzle journal, so nothing else applies it).
//   3. Seed from `convex-export/` when the tables are still empty.
//
//   npm run db:bootstrap                     # create + migrate + seed
//   npm run db:reset                         # delete local.db first, then all of the above
//   npx tsx scripts/bootstrap-local-db.ts --no-seed
//   npx tsx scripts/bootstrap-local-db.ts ../some-export
// ─────────────────────────────────────────────────────────────────────────────

import "../src/env.ts";

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { count } from "drizzle-orm";
import * as schema from "../src/db/schema.ts";
import { describeTarget, REPO_ROOT, resolveDatabaseTarget } from "../src/db/url.ts";

/** This file lives at `server/scripts/`, so up one level is `server/`. */
const SERVER_DIR = resolve(fileURLToPath(new URL("..", import.meta.url)));
const MIGRATIONS_DIR = join(SERVER_DIR, "drizzle");
const INDEXES_FILE = join(MIGRATIONS_DIR, "indexes.sql");
const IMPORT_SCRIPT = join(SERVER_DIR, "scripts", "import-convex-export.ts");

const args = process.argv.slice(2);
const reset = args.includes("--reset");
const skipSeed = args.includes("--no-seed");
const exportDirArg = args.find((a) => !a.startsWith("--"));

const target = resolveDatabaseTarget();
const label = describeTarget(target);

// ─── Guard ──────────────────────────────────────────────────────────────────

if (target.kind === "remote") {
  console.log(
    `\nℹ️  TURSO_DATABASE_URL points at a remote database — nothing to bootstrap.\n` +
      `   ${label}\n` +
      `   For a local file instead, set TURSO_DATABASE_URL="file:./local.db".\n`
  );
  process.exit(0);
}

// ─── Reset (optional) ───────────────────────────────────────────────────────

if (reset) {
  for (const suffix of ["", "-wal", "-shm"]) {
    const file = `${target.path}${suffix}`;
    if (existsSync(file)) {
      rmSync(file);
      console.log(`🗑️  Removed ${describeTarget({ ...target, path: file })}`);
    }
  }
}

// ─── 1. Schema ──────────────────────────────────────────────────────────────

const client = createClient({ url: target.url, authToken: target.authToken });
const db = drizzle(client, { schema });

console.log(`\n📦 Local database: ${label}`);

await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
console.log("   ✓ schema up to date");

// ─── 2. Indexes ─────────────────────────────────────────────────────────────

if (existsSync(INDEXES_FILE)) {
  await client.executeMultiple(readFileSync(INDEXES_FILE, "utf8"));
  console.log("   ✓ indexes applied");
}

// ─── 3. Seed ────────────────────────────────────────────────────────────────

const [products] = await db.select({ value: count() }).from(schema.products);
const isEmpty = (products?.value ?? 0) === 0;
const exportDir = exportDirArg ? resolve(exportDirArg) : join(REPO_ROOT, "convex-export");

if (skipSeed) {
  console.log("   – seeding skipped (--no-seed)");
} else if (!isEmpty) {
  console.log("   – data already present, seeding skipped");
} else if (!existsSync(exportDir)) {
  console.log(
    `   ⚠️  no data, and no export found at ${exportDir} — starting with an empty database.\n` +
      `      Restore the Convex snapshot there (or pass a path) to seed it.\n` +
      `      Create a login with: cd server && npx tsx scripts/set-password.ts`
  );
} else {
  console.log(`   ↓ seeding from ${exportDir} …`);
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", IMPORT_SCRIPT, exportDir],
    { cwd: SERVER_DIR, stdio: "inherit" }
  );
  if (result.status !== 0) {
    console.error("\n❌ Seeding failed — see the output above.\n");
    client.close();
    process.exit(result.status ?? 1);
  }
}

// ─── Summary ────────────────────────────────────────────────────────────────

const { rows: tables } = await client.execute(
  `select name from sqlite_master
    where type = 'table'
      and name not like 'sqlite_%'
      and name not like '\\_\\_drizzle%' escape '\\'
    order by name`
);

let totalRows = 0;
for (const { name } of tables) {
  const { rows } = await client.execute(`select count(*) as n from "${name}"`);
  totalRows += Number(rows[0]?.n ?? 0);
}

console.log(
  `   ✓ ready — ${tables.length} tables, ${totalRows.toLocaleString()} rows`
);

// The Convex export carries accounts but NOT password hashes (the old backend
// used a different auth scheme), so every imported user starts locked out.
// Without this hint the only symptom is a misleading "Invalid credentials".
try {
  const { rows: locked } = await client.execute(
    "select email from app_users where password_hash is null and status <> 'banned' order by email"
  );
  if (locked.length > 0) {
    console.log(
      `\n   ⚠️  ${locked.length} account(s) have no password yet — signing in will fail until you set one:`
    );
    console.log(`      cd server && npx tsx scripts/set-password.ts <email>\n`);
  }
} catch {
  /* no app_users table yet (empty database) — nothing to report */
}

console.log();

client.close();
