// ─────────────────────────────────────────────────────────────────────────────
// Auth utilities — JWT-based authentication for Hono + Turso
// ─────────────────────────────────────────────────────────────────────────────

import "./env.ts";

import { sign, verify } from "hono/jwt";
import { eq } from "drizzle-orm";
import db from "./db/index.ts";
import { users as usersTable } from "./db/schema.ts";

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production-32chars!";
const JWT_EXPIRY = 60 * 60 * 24 * 7; // 7 days in seconds

export type UserPayload = {
  id: string;
  email: string;
  name: string;
  role: "super_admin" | "admin" | "manager" | "cashier";
  storeId?: string | null;
  status?: string | null;
};

export type AllowedRole = "super_admin" | "admin" | "manager" | "cashier";

// ─── Password hashing ─────────────────────────────────────────────────────
//
// New hashes use PBKDF2-SHA256 with a random per-password salt, stored as
// `pbkdf2$<iterations>$<saltHex>$<hashHex>`. They deliberately do NOT depend on
// JWT_SECRET — the previous scheme was SHA-256(password + JWT_SECRET), which
// meant rotating the JWT secret silently invalidated every stored password.
//
// Legacy hashes are still accepted so existing accounts keep working, and are
// upgraded to PBKDF2 automatically on the next successful sign-in.

const PBKDF2_ITERATIONS = 100_000;
const LEGACY_SALT = process.env.JWT_SECRET || "change-me-in-production-32chars!";

const toHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

async function legacyHash(password: string): Promise<string> {
  const data = new TextEncoder().encode(password + LEGACY_SALT);
  return toHex(await crypto.subtle.digest("SHA-256", data));
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    key,
    256
  );
  return toHex(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toHex(salt.buffer)}$${hash}`;
}

/** True when the stored hash uses the old scheme and should be re-hashed. */
export function needsRehash(stored: string): boolean {
  return !stored.startsWith("pbkdf2$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (stored.startsWith("pbkdf2$")) {
    const [, iterations, saltHex, expected] = stored.split("$");
    if (!iterations || !saltHex || !expected) return false;
    const saltBytes = saltHex.match(/.{2}/g)?.map((h) => parseInt(h, 16)) ?? [];
    return (await pbkdf2(password, new Uint8Array(saltBytes), Number(iterations))) === expected;
  }
  return (await legacyHash(password)) === stored;
}

// ─── JWT token management ──────────────────────────────────────────────────

export function generateToken(user: UserPayload): Promise<string> {
  return sign(
    {
      ...user,
      exp: Math.floor(Date.now() / 1000) + JWT_EXPIRY,
      iat: Math.floor(Date.now() / 1000),
    },
    JWT_SECRET,
    "HS256"
  );
}

export function verifyToken(token: string): Promise<UserPayload> {
  return verify(token, JWT_SECRET, "HS256") as Promise<UserPayload>;
}

// ─── Role checking ─────────────────────────────────────────────────────────

export function hasRole(user: UserPayload, allowedRoles: AllowedRole[]): boolean {
  return allowedRoles.includes(user.role);
}

export function requireRole(
  user: UserPayload | null | undefined,
  allowedRoles: AllowedRole[]
): UserPayload {
  if (!user) throw new Error("Not authenticated");
  if (!hasRole(user, allowedRoles)) {
    throw new Error("Unauthorized: Insufficient permissions");
  }
  return user;
}

// ─── DB helpers ────────────────────────────────────────────────────────────

/**
 * Emails are compared case-insensitively and without surrounding whitespace,
 * so "User@Test.com " and "user@test.com" resolve to the same account.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function findUserByEmail(email: string) {
  return db.select().from(usersTable).where(eq(usersTable.email, normalizeEmail(email))).get();
}

export async function findUserById(id: string) {
  return db.select().from(usersTable).where(eq(usersTable.id, id)).get();
}

// Re-export getUser from middleware for convenience
export { getUser } from "./middleware/auth.ts";