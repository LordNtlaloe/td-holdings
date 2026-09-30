// ─────────────────────────────────────────────────────────────────────────────
// Make sure a specific account can actually sign in.
//
// The Convex export carries accounts but NOT password hashes, so a freshly
// imported user is locked out — sign-in answers 401 "No password set. Use
// password reset." /api/dashboard then answers 401 "Not authenticated" as well,
// because there is no session to begin with.
//
// Configure it entirely from the environment (add to `.env`):
//
//   SEED_ADMIN_EMAIL=you@example.com
//   SEED_ADMIN_PASSWORD=<your password>     # at least 8 characters
//   SEED_ADMIN_NAME="Your Name"             # optional, only used when creating
//   SEED_ADMIN_ROLE=super_admin             # optional, only used when creating
//
// Runs against whatever `TURSO_DATABASE_URL` points at (Turso or a local file).
// Idempotent: when the stored hash already verifies against the configured
// password it writes nothing, so it is safe to run on every `npm run dev`. The
// password is never printed.
//
//   npm run db:ensure-admin
//
// Prefer to be prompted for the password instead? `npx tsx scripts/set-password.ts <email>`.
// ─────────────────────────────────────────────────────────────────────────────

import "../src/env.ts";

import { eq } from "drizzle-orm";
import db from "../src/db/index.ts";
import { users as usersTable } from "../src/db/schema.ts";
import { hashPassword, normalizeEmail, verifyPassword } from "../src/auth.ts";
import type { UserPayload } from "../src/auth.ts";
import { describeTarget, resolveDatabaseTarget } from "../src/db/url.ts";

const email = process.env.SEED_ADMIN_EMAIL?.trim();
const password = process.env.SEED_ADMIN_PASSWORD;
const name = process.env.SEED_ADMIN_NAME?.trim();
const role = (process.env.SEED_ADMIN_ROLE?.trim() || "super_admin") as UserPayload["role"];

if (!email || !password) {
  console.log("ℹ️  SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set — skipping admin password check.");
  process.exit(0);
}

if (password.length < 8) {
  console.error(
    "\n❌ SEED_ADMIN_PASSWORD must be at least 8 characters (the sign-up endpoint enforces this too).\n"
  );
  process.exit(1);
}

console.log(`\n👤 Admin account: ${email}\n   ↳ ${describeTarget(resolveDatabaseTarget())}`);

const normalized = normalizeEmail(email);
const existing = await db
  .select()
  .from(usersTable)
  .where(eq(usersTable.email, normalized))
  .get();

// Warn about anything that will block sign-in even with a correct password.
function reportStatus(status: string) {
  if (status !== "active") {
    console.log(`   ⚠️  status is "${status}" — sign-in will be refused for this account`);
  }
}

if (!existing) {
  const created = await db
    .insert(usersTable)
    .values({
      email: normalized,
      name: name || normalized.split("@")[0],
      role,
      status: "active",
      passwordHash: await hashPassword(password),
    })
    .returning()
    .get();

  console.log(`   ✓ created ${created.email} (role ${created.role}) with a password`);
  process.exit(0);
}

if (existing.passwordHash && (await verifyPassword(password, existing.passwordHash))) {
  console.log("   – password already matches, nothing to write");
  reportStatus(existing.status);
  process.exit(0);
}

await db
  .update(usersTable)
  .set({ passwordHash: await hashPassword(password), updatedAt: Date.now() })
  .where(eq(usersTable.id, existing.id))
  .run();

console.log(`   ✓ password set for ${existing.email} (role ${existing.role})`);
reportStatus(existing.status);
process.exit(0);
