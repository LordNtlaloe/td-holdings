// ─────────────────────────────────────────────────────────────────────────────
// Auth middleware for Hono
// ─────────────────────────────────────────────────────────────────────────────

// Relative, not the `@/auth` tsconfig alias: this file is bundled by Vite as
// part of the single-server setup (`src/server.ts`), and Vite resolves `@/*`
// from the ROOT tsconfig (`./src/*`), where there is no `src/auth`.
import { UserPayload, verifyToken } from "../auth.ts";
import { Context, Next } from "hono";
import { eq } from "drizzle-orm";
import db from "../db/index.ts";
import { users as usersTable } from "../db/schema.ts";

// Extend Hono context to include user
export type AuthEnv = {
  Variables: {
    user: UserPayload | null;
  };
};

export async function authMiddleware(c: Context<AuthEnv>, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    c.set("user", null);
    return next();
  }

  const token = authHeader.slice(7);
  try {
    const payload = await verifyToken(token);

    // The JWT only proves *identity*. Role / store / status are re-read from the
    // database on every request, so promotions, demotions, store reassignments
    // and bans take effect immediately instead of waiting for the token to
    // expire (previously they were frozen into the token for up to 7 days).
    const fresh = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, payload.id))
      .get();

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
  } catch {
    c.set("user", null);
  }

  return next();
}

// Helper to require authentication
export function getUser(c: Context<AuthEnv>): UserPayload {
  const user = c.get("user");
  if (!user) throw new Error("Not authenticated");
  return user;
}