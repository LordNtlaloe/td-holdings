// ─────────────────────────────────────────────────────────────────────────────
// Hono API — TD Inventory
//
// This module only *builds* the app; it never listens. Two things consume it:
//   • `src/server.ts` (repo root) — mounted into the app server so the API and
//     the frontend share one origin and one port. This is what `npm run dev`
//     uses.
//   • `./index.ts` — a standalone listener on `PORT`, for running the API on
//     its own host.
// ─────────────────────────────────────────────────────────────────────────────

// Must be imported first so `.env` is loaded before any other module reads
// `process.env` at import time (e.g. `db/index.ts`, `auth.ts`).
import "./env.ts";

import { Hono } from "hono";
import { cors } from "hono/cors";
import { compress } from "hono/compress";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { authMiddleware, getUser } from "./middleware/auth.ts";
import type { AuthEnv } from "./middleware/auth.ts";
import { hashPassword, verifyPassword, generateToken, findUserByEmail, findUserById, normalizeEmail, needsRehash } from "./auth.ts";
import type { UserPayload } from "./auth.ts";
import { eq, and, desc } from "drizzle-orm";
import db from "./db/index.ts";
import { users as usersTable, passwordResetTokens as passwordResetTokensTable } from "./db/schema.ts";
import { storeRoutes } from "./routes/stores.ts";
import { departmentRoutes } from "./routes/departments.ts";
import { categoryRoutes } from "./routes/categories.ts";
import { productRoutes } from "./routes/products.ts";
import { inventoryRoutes } from "./routes/inventory.ts";
import { batchRoutes } from "./routes/batches.ts";
import { customerRoutes } from "./routes/customers.ts";
import { supplierRoutes } from "./routes/suppliers.ts";
import { salesRoutes } from "./routes/sales.ts";
import { transferRoutes } from "./routes/transfers.ts";
import { reportRoutes } from "./routes/reports.ts";
import { dashboardRoutes } from "./routes/dashboard.ts";
import { userRoutes } from "./routes/users.ts";
import { employeeRoutes } from "./routes/employees.ts";
import { activityRoutes } from "./routes/activity-logs.ts";
import { invoiceRoutes } from "./routes/invoices.ts";
import { storeDepartmentRoutes } from "./routes/store-departments.ts";
import { printRoutes } from "./routes/print.ts";
import { medicationRoutes } from "./routes/medications.ts";
import { consultationRoutes } from "./routes/consultations.ts";

const app = new Hono<AuthEnv>();

// ─── Global middleware ──────────────────────────────────────────────────────

// Comma-separated list of allowed origins. Vite falls back to another port when
// 3000 is taken, so allow both by default.
const corsOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:3000,http://localhost:3001")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// Registered first so every response is gzip/brotli encoded. The sales and
// dashboard payloads are several megabytes of JSON, which compresses ~10x.
app.use("*", compress());
app.use("*", cors({ origin: corsOrigins, credentials: true }));
app.use("*", secureHeaders());
app.use("*", logger());
app.use("*", authMiddleware);

// ─── Health check ──────────────────────────────────────────────────────────

app.get("/api/health", (c) => c.json({ status: "ok", timestamp: Date.now() }));

// ═════════════════════════════════════════════════════════════════════════════
// AUTH ROUTES
// ═════════════════════════════════════════════════════════════════════════════

app.post("/api/auth/sign-in", async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password) {
    return c.json({ error: "Email and password required" }, 400);
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  if (user.status === "banned") {
    return c.json({ error: "Account is banned" }, 403);
  }

  if (!user.passwordHash) {
    return c.json({ error: "No password set. Use password reset." }, 401);
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  // Upgrade passwords still stored with the legacy scheme.
  if (needsRehash(user.passwordHash)) {
    await db.update(usersTable)
      .set({ passwordHash: await hashPassword(password), updatedAt: Date.now() })
      .where(eq(usersTable.id, user.id))
      .run();
  }

  const token = await generateToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as UserPayload["role"],
    storeId: user.storeId,
    status: user.status,
  });

  return c.json({ token, user });
});

app.post("/api/auth/sign-up", async (c) => {
  const { email, password, name, role } = await c.req.json();
  if (!email || !password || !name) {
    return c.json({ error: "Email, password, and name required" }, 400);
  }
  if (password.length < 8) {
    return c.json({ error: "Password must be at least 8 characters" }, 400);
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    return c.json({ error: "Email already in use" }, 409);
  }

  const passwordHash = await hashPassword(password);
  const userRole = (role || "cashier") as UserPayload["role"];

  // Insert user with hashed password
  const result = await db.insert(usersTable).values({
    email: normalizeEmail(email),
    name,
    role: userRole,
    status: "active",
    passwordHash,
  }).returning().get();

  if (!result) {
    return c.json({ error: "Failed to create user" }, 500);
  }

  const token = await generateToken({
    id: result.id,
    email: result.email,
    name: result.name,
    role: result.role as UserPayload["role"],
    storeId: result.storeId,
    status: result.status,
  });

  return c.json({ token, user: result }, 201);
});

app.get("/api/auth/me", async (c) => {
  try {
    const user = getUser(c);
    const freshUser = await findUserById(user.id);
    if (!freshUser) return c.json({ user: null });
    const { passwordHash, ...safe } = freshUser;
    return c.json({ user: safe });
  } catch {
    return c.json({ user: null });
  }
});

// POST /api/auth/change-password — change password for the signed-in user
app.post("/api/auth/change-password", async (c) => {
  try {
    const currentUser = getUser(c);
    const { currentPassword, newPassword } = await c.req.json();

    if (!currentPassword || !newPassword) {
      return c.json({ error: "Current and new password are required" }, 400);
    }
    if (newPassword.length < 8) {
      return c.json({ error: "Password must be at least 8 characters" }, 400);
    }

    const dbUser = await findUserById(currentUser.id);
    if (!dbUser || !dbUser.passwordHash) {
      return c.json({ error: "User not found" }, 404);
    }

    const valid = await verifyPassword(currentPassword, dbUser.passwordHash);
    if (!valid) {
      return c.json({ error: "Current password is incorrect" }, 401);
    }

    const passwordHash = await hashPassword(newPassword);
    await db.update(usersTable)
      .set({ passwordHash, updatedAt: Date.now() })
      .where(eq(usersTable.id, currentUser.id))
      .run();

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// POST /api/auth/request-password-reset — issue a 6-digit OTP (never leaks account existence)
app.post("/api/auth/request-password-reset", async (c) => {
  try {
    const { email } = await c.req.json();
    if (!email) return c.json({ error: "Email is required" }, 400);

    const user = await findUserByEmail(email);
    if (user) {
      const otp = String(Math.floor(100000 + Math.random() * 900000));

      await db.insert(passwordResetTokensTable).values({
        userId: user.id,
        otp,
        expiresAt: Date.now() + 10 * 60 * 1000,
        used: false,
      }).run();

      // Best-effort email delivery — never fail the request because of it
      if (process.env.RESEND_API_KEY) {
        try {
          const moduleName = "resend";
          // `@vite-ignore`: the specifier is deliberately non-literal — `resend`
          // is an optional dependency that is not installed, and the API is now
          // bundled by Vite (see `src/server.ts`).
          const resendModule: any = await import(/* @vite-ignore */ moduleName);
          const Resend = resendModule?.Resend ?? resendModule?.default;
          if (Resend) {
            const resend = new Resend(process.env.RESEND_API_KEY);
            await resend.emails.send({
              from: process.env.RESEND_FROM || "TD Holdings <noreply@yourdomain.com>",
              to: normalizeEmail(email),
              subject: "Reset your TD password",
              text: `Your password reset code is: ${otp}\n\nThis code expires in 10 minutes. If you didn't request this, ignore this email.`,
            });
          }
        } catch {
          // Swallow email errors — the OTP row is still stored
        }
      }
    }

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// POST /api/auth/reset-password — consume an OTP and set a new password
app.post("/api/auth/reset-password", async (c) => {
  try {
    const { email, code, newPassword } = await c.req.json();
    if (!email || !code || !newPassword) {
      return c.json({ error: "Email, code, and new password are required" }, 400);
    }
    if (newPassword.length < 8) {
      return c.json({ error: "Password must be at least 8 characters" }, 400);
    }

    const user = await findUserByEmail(email);
    if (!user) return c.json({ error: "Invalid or expired code" }, 400);

    const token = await db.select().from(passwordResetTokensTable)
      .where(and(
        eq(passwordResetTokensTable.userId, user.id),
        eq(passwordResetTokensTable.otp, String(code)),
        eq(passwordResetTokensTable.used, false)
      ))
      .orderBy(desc(passwordResetTokensTable.createdAt))
      .get();

    if (!token || token.expiresAt < Date.now()) {
      return c.json({ error: "Invalid or expired code" }, 400);
    }

    const passwordHash = await hashPassword(newPassword);
    await db.update(usersTable)
      .set({ passwordHash, updatedAt: Date.now() })
      .where(eq(usersTable.id, user.id))
      .run();

    await db.update(passwordResetTokensTable)
      .set({ used: true })
      .where(eq(passwordResetTokensTable.id, token.id))
      .run();

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// API ROUTES
// ═════════════════════════════════════════════════════════════════════════════

app.route("/api/stores", storeRoutes);
app.route("/api/departments", departmentRoutes);
app.route("/api/categories", categoryRoutes);
app.route("/api/products", productRoutes);
app.route("/api/inventory", inventoryRoutes);
app.route("/api/batches", batchRoutes);
app.route("/api/customers", customerRoutes);
app.route("/api/suppliers", supplierRoutes);
app.route("/api/sales", salesRoutes);
app.route("/api/transfers", transferRoutes);
app.route("/api/reports", reportRoutes);
app.route("/api/dashboard", dashboardRoutes);
app.route("/api/users", userRoutes);
app.route("/api/employees", employeeRoutes);
app.route("/api/activity-logs", activityRoutes);
app.route("/api/invoices", invoiceRoutes);
app.route("/api/store-departments", storeDepartmentRoutes);
app.route("/api/print", printRoutes);
app.route("/api/medications", medicationRoutes);
app.route("/api/consultations", consultationRoutes);

// No listener here — see the header comment.
export const api = app;

export default app;