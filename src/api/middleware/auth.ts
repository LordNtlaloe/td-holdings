// ─────────────────────────────────────────────────────────────────────────────
// Auth middleware for Hono
// ─────────────────────────────────────────────────────────────────────────────

// Relative, not the `@/auth` tsconfig alias: this file is bundled by Vite as
// part of the single-server setup (`src/server.ts`), and Vite resolves `@/*`
// from the ROOT tsconfig (`./src/*`), where there is no `src/auth`.
import { verifyToken } from "../auth.ts";
import type { UserPayload } from "../auth.ts";
// `Context` and `Next` are TYPES. They must be imported with `import type`:
// a value import survives the TS transform (they are used, just only in type
// positions) and then fails at runtime with
// "The requested module 'hono' does not provide an export named 'Next'".
import type { Context, Next } from "hono";
import { eq } from "drizzle-orm";
import db from "../db/index.ts";
import { users as usersTable } from "../db/schema.ts";

// Extend Hono context to include user
export type AuthEnv = {
  Variables: {
    user: UserPayload | null;
  };
};

/** Reads the user row, retrying once so a one-off database hiccup isn't fatal. */
async function loadUser(id: string) {
  try {
    return await db.select().from(usersTable).where(eq(usersTable.id, id)).get();
  } catch (firstError) {
    console.warn("Auth user lookup failed, retrying once:", firstError);
    return await db.select().from(usersTable).where(eq(usersTable.id, id)).get();
  }
}

export async function authMiddleware(c: Context<AuthEnv>, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    c.set("user", null);
    return next();
  }

  const token = authHeader.slice(7);

  // 1. Is the token itself valid? Only a bad or expired token means "signed out".
  let payload: UserPayload;
  try {
    payload = await verifyToken(token);
  } catch {
    c.set("user", null);
    return next();
  }

  // 2. The JWT only proves *identity*. Role / store / status are re-read from the
  // database on every request, so promotions, demotions, store reassignments
  // and bans take effect immediately instead of waiting for the token to expire.
  //
  // A database failure here is NOT a sign-out. It used to share the try/catch
  // above, so any Turso timeout looked like an invalid session and the app
  // reported "Not authenticated" to a perfectly valid user.
  let fresh;
  try {
    fresh = await loadUser(payload.id);
  } catch (error) {
    console.error("Auth user lookup failed:", error);
    return c.json({ error: "Service temporarily unavailable. Please try again." }, 503);
  }

  if (!fresh || fresh.status === "banned") {
    c.set("user", null);
    return next();
  }

  c.set("user", {
    id: fresh.id,
    email: fresh.email,
    name: fresh.name,
    role: fresh.role,
    storeId: fresh.storeId,
    status: fresh.status,
  });

  return next();
}

// Helper to require authentication
export function getUser(c: Context<AuthEnv>): UserPayload {
  const user = c.get("user");
  if (!user) throw new Error("Not authenticated");
  return user;
}