import { Hono } from "hono";
import { eq, desc } from "drizzle-orm";
import db from "../db/index.ts";
import * as schema from "../db/schema.ts";
import { AuthEnv } from "../middleware/auth.ts";
import { getUser, requireRole, hashPassword, normalizeEmail } from "../auth.ts";

export const employeeRoutes = new Hono<AuthEnv>();

// GET /api/employees
employeeRoutes.get("/", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin", "manager"]);
    const storeId = c.req.query("storeId");

    let query = db.select().from(schema.employees).orderBy(desc(schema.employees.createdAt));
    if (storeId) {
      query = query.where(eq(schema.employees.storeId, storeId)) as any;
    }
    const allEmployees = await query.all();

    const withDetails = await Promise.all(allEmployees.map(async (emp) => {
      const u = await db.select().from(schema.users).where(eq(schema.users.id, emp.userId)).get();
      const s = await db.select().from(schema.stores).where(eq(schema.stores.id, emp.storeId)).get();
      return { ...emp, user: u ? { ...u, passwordHash: undefined } : null, store: s };
    }));

    return c.json({ employees: withDetails });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// POST /api/employees/with-user — create a user + employee in one step
employeeRoutes.post("/with-user", async (c) => {
  try {
    const currentUser = getUser(c);
    requireRole(currentUser, ["super_admin", "admin"]);
    const { name, email, password, role, storeId } = await c.req.json();

    if (!name || !email) {
      return c.json({ error: "name and email are required" }, 400);
    }
    if (!storeId) {
      return c.json({ error: "storeId is required" }, 400);
    }

    const normalizedEmail = normalizeEmail(email);
    const existing = await db.select().from(schema.users)
      .where(eq(schema.users.email, normalizedEmail)).get();
    if (existing) return c.json({ error: "Email already in use" }, 409);

    const userRole = (role || "cashier") as "super_admin" | "admin" | "manager" | "cashier";
    const passwordHash = await hashPassword(password || "user123");

    const newUser = await db.insert(schema.users).values({
      email: normalizedEmail, name, role: userRole, storeId, passwordHash, status: "active",
    }).returning().get();
    if (!newUser) return c.json({ error: "Failed to create user" }, 500);

    const employee = await db.insert(schema.employees).values({
      userId: newUser.id, storeId, role: userRole, isActive: true,
    }).returning().get();

    const { passwordHash: _passwordHash, ...safeUser } = newUser;

    await db.insert(schema.activityLogs).values({
      userId: currentUser.id, role: currentUser.role, action: "employee.createWithUser",
      entityType: "employees", entityId: employee!.id,
      description: `Created employee "${name}" (${email}) with role ${userRole}`,
    }).run();

    return c.json({ employee, user: safeUser }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// GET /api/employees/my-record — the signed-in user's own employee record.
// Used by the Sales page to scope a non-admin user to their store.
employeeRoutes.get("/my-record", async (c) => {
  try {
    const user = getUser(c);
    const employee = await db.select().from(schema.employees)
      .where(eq(schema.employees.userId, user.id)).get();
    if (!employee) return c.json(null);

    const store = await db.select().from(schema.stores)
      .where(eq(schema.stores.id, employee.storeId)).get();

    return c.json({ ...employee, store: store ?? null });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// POST /api/employees
employeeRoutes.post("/", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin"]);
    const body = await c.req.json();
    const { userId, storeId, role } = body;

    const result = await db.insert(schema.employees).values({
      userId, storeId, role, isActive: true,
    }).returning().get();

    return c.json({ employee: result }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// PATCH /api/employees/deactivate — the Employees page's "Remove Employee"
// action. It sends `{ employeeId }` in the BODY, so it must be declared before
// `/:id`: otherwise Hono matches the literal path as an id ("deactivate"), and
// the generic handler's `.set(body)` fails on the unknown `employeeId` column.
employeeRoutes.patch("/deactivate", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin"]);
    const { employeeId } = await c.req.json();
    if (!employeeId) return c.json({ error: "employeeId is required" }, 400);

    const existing = await db.select().from(schema.employees)
      .where(eq(schema.employees.id, employeeId)).get();
    if (!existing) return c.json({ error: "Employee not found" }, 404);

    await db.update(schema.employees)
      .set({ isActive: false, updatedAt: Date.now() })
      .where(eq(schema.employees.id, employeeId))
      .run();

    await db.insert(schema.activityLogs).values({
      userId: user.id, role: user.role, action: "employee.deactivate",
      entityType: "employees", entityId: employeeId,
      description: `Removed employee ${employeeId} from store ${existing.storeId}`,
    }).run();

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// PATCH /api/employees/:id/password — set (or reset) an employee's sign-in
// password. Admins manage staff credentials, so no current password is asked
// for; the signed-in user changes their OWN password via
// POST /api/auth/change-password, which does require it.
//
// Two path segments, so it cannot be confused with `PATCH /:id`.
employeeRoutes.patch("/:id/password", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin"]);
    const id = c.req.param("id");
    const { password } = await c.req.json();

    if (!password || String(password).length < 8) {
      return c.json({ error: "Password must be at least 8 characters" }, 400);
    }

    const employee = await db.select().from(schema.employees)
      .where(eq(schema.employees.id, id)).get();
    if (!employee) return c.json({ error: "Employee not found" }, 404);

    const target = await db.select().from(schema.users)
      .where(eq(schema.users.id, employee.userId)).get();
    if (!target) return c.json({ error: "No sign-in account for this employee" }, 404);

    await db.update(schema.users)
      .set({ passwordHash: await hashPassword(password), updatedAt: Date.now() })
      .where(eq(schema.users.id, target.id))
      .run();

    await db.insert(schema.activityLogs).values({
      userId: user.id, role: user.role, action: "employee.setPassword",
      entityType: "employees", entityId: id,
      description: `Set a new password for ${target.email}`,
    }).run();

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// PATCH /api/employees/:id
employeeRoutes.patch("/:id", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin"]);
    const id = c.req.param("id");
    const body = await c.req.json();
    await db.update(schema.employees).set(body).where(eq(schema.employees.id, id)).run();
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// DELETE /api/employees/:id
employeeRoutes.delete("/:id", async (c) => {
  try {
    const user = getUser(c);
    requireRole(user, ["super_admin", "admin"]);
    const id = c.req.param("id");
    await db.update(schema.employees).set({ isActive: false }).where(eq(schema.employees.id, id)).run();
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});