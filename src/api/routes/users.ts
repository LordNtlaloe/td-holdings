import { Hono } from "hono";
import { eq, desc } from "drizzle-orm";
import db from "../db/index.ts";
import * as schema from "../db/schema.ts";
import type { AuthEnv } from "../middleware/auth.ts";
import { getUser, requireRole, hashPassword, normalizeEmail } from "../auth.ts";

export const userRoutes = new Hono<AuthEnv>();

// GET /api/users
userRoutes.get("/", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin", "manager"]);
    const allUsers = await db.select().from(schema.users).orderBy(desc(schema.users.createdAt)).all();
    return c.json({ users: allUsers.map(u => ({ ...u, passwordHash: undefined })) });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// GET /api/users/me
userRoutes.get("/me", async (c) => {
  try {
    const user = getUser(c);
    const fresh = await db.select().from(schema.users).where(eq(schema.users.id, user.id)).get();
    if (!fresh) return c.json({ error: "User not found" }, 404);
    const { passwordHash, ...safe } = fresh;
    return c.json({ user: safe });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// GET /api/users/current — alias of /me, used by the POS and invoice pages.
userRoutes.get("/current", async (c) => {
  try {
    const user = getUser(c);
    const fresh = await db.select().from(schema.users).where(eq(schema.users.id, user.id)).get();
    if (!fresh) return c.json(null);
    const { passwordHash, ...safe } = fresh;
    // Returned both bare (`currentUser.name`) and under the documented key.
    return c.json({ ...safe, user: safe });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// PATCH /api/users/me
userRoutes.patch("/me", async (c) => {
  try {
    const user = getUser(c);
    const body = await c.req.json();
    const updates: Record<string, any> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.image !== undefined) updates.image = body.image;

    if (Object.keys(updates).length > 0) {
      await db.update(schema.users).set(updates).where(eq(schema.users.id, user.id)).run();
    }
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// GET /api/users/profile — alias of /me. Migrated callers read the user fields
// directly off the response (e.g. `currentUser.name`), so return a bare user.
userRoutes.get("/profile", async (c) => {
  try {
    const user = getUser(c);
    const fresh = await db.select().from(schema.users).where(eq(schema.users.id, user.id)).get();
    if (!fresh) return c.json({ error: "User not found" }, 404);
    const { passwordHash, ...safe } = fresh;
    // Returned both bare (settings/sales callers read `currentUser.name` /
    // `.role` directly) and under the documented `user` key.
    return c.json({ ...safe, user: safe });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// PATCH /api/users/profile — update name/image, return the updated user
userRoutes.patch("/profile", async (c) => {
  try {
    const user = getUser(c);
    const body = await c.req.json();

    const updates: Record<string, any> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.image !== undefined) updates.image = body.image;
    if (body.email !== undefined) updates.email = normalizeEmail(body.email);

    if (Object.keys(updates).length > 0) {
      updates.updatedAt = Date.now();
      await db.update(schema.users).set(updates).where(eq(schema.users.id, user.id)).run();
    }

    const fresh = await db.select().from(schema.users).where(eq(schema.users.id, user.id)).get();
    if (!fresh) return c.json({ error: "User not found" }, 404);
    const { passwordHash, ...safe } = fresh;
    return c.json({ user: safe });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// PATCH /api/users/:id/status
userRoutes.patch("/:id/status", async (c) => {
  try {
    const currentUser = getUser(c);
    requireRole(currentUser, ["super_admin", "admin"]);
    const id = c.req.param("id");
    const { status } = await c.req.json();

    if (currentUser.id === id) {
      return c.json({ error: "Cannot change your own status" }, 400);
    }

    await db.update(schema.users).set({ status }).where(eq(schema.users.id, id)).run();
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// POST /api/users — create user (admin+)
userRoutes.post("/", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin"]);
    const body = await c.req.json();

    const { email, name, role, password, storeId } = body;
    if (!email || !name || !password) {
      return c.json({ error: "email, name, and password required" }, 400);
    }

    const normalizedEmail = normalizeEmail(email);
    const existing = await db.select().from(schema.users).where(eq(schema.users.email, normalizedEmail)).get();
    if (existing) return c.json({ error: "Email already in use" }, 409);

    const passwordHash = await hashPassword(password);
    const result = await db.insert(schema.users).values({
      email: normalizedEmail, name, role: role || "cashier", storeId, passwordHash, status: "active",
    }).returning().get();

    if (!result) return c.json({ error: "Failed to create user" }, 500);
    const { passwordHash: _, ...safe } = result;
    return c.json({ user: safe }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// DELETE /api/users/:id — hard-delete a user
userRoutes.delete("/:id", async (c) => {
  try {
    const currentUser = getUser(c);
    requireRole(currentUser, ["super_admin", "admin"]);
    const id = c.req.param("id");

    const existing = await db.select().from(schema.users).where(eq(schema.users.id, id)).get();
    if (!existing) return c.json({ error: "User not found" }, 404);

    await db.delete(schema.users).where(eq(schema.users.id, id)).run();

    await db.insert(schema.activityLogs).values({
      userId: currentUser.id, role: currentUser.role, action: "user.delete",
      entityType: "users", entityId: id,
      description: `Deleted user "${existing.name}" (${existing.email})`,
    }).run();

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});