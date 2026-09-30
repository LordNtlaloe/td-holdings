// ─────────────────────────────────────────────────────────────────────────────
// Set (or reset) a user's password directly.
//
//   npx tsx scripts/set-password.ts [email]
//
// The password is read from a hidden prompt — it is never echoed, never passed
// as a shell argument, and never stored in shell history.
//
// If no email is given, the available accounts are listed first.
// ─────────────────────────────────────────────────────────────────────────────

import "../src/api/env.ts";

import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { eq } from "drizzle-orm";
import db from "../src/api/db/index.ts";
import { users as usersTable } from "../src/api/db/schema.ts";
import { hashPassword } from "../src/api/auth.ts";

/** Prompt without echoing the typed characters. */
function askHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const muted = new Writable({
      write(_chunk, _encoding, callback) {
        callback();
      },
    });
    const rl = createInterface({ input: process.stdin, output: muted, terminal: true });
    process.stdout.write(question);
    rl.question("", (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  let email = process.argv[2]?.trim();

  if (!email) {
    const all = await db.select().from(usersTable).all();
    console.log("\nAccounts in app_users:\n");
    for (const u of all) {
      console.log(`  ${u.email.padEnd(38)} ${u.role.padEnd(12)} ${u.passwordHash ? "has password" : "no password"}`);
    }
    email = (await ask("\nEmail to update: ")).trim();
  }

  if (!email) {
    console.error("No email provided.");
    process.exit(1);
  }

  const user = await db.select().from(usersTable).where(eq(usersTable.email, email)).get();
  if (!user) {
    console.error(`\nNo account found with email "${email}".`);
    process.exit(1);
  }

  const password = await askHidden(`New password for ${email}: `);
  if (password.length < 8) {
    console.error("\nPassword must be at least 8 characters.");
    process.exit(1);
  }

  const confirm = await askHidden("Confirm password: ");
  if (password !== confirm) {
    console.error("\nPasswords do not match.");
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  await db.update(usersTable).set({ passwordHash, updatedAt: Date.now() }).where(eq(usersTable.id, user.id));

  console.log(`\n✅ Password updated for ${email}. You can sign in now.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("\nFailed:", err);
  process.exit(1);
});
