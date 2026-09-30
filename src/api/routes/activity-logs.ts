import { Hono } from "hono";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import db from "../db/index.ts";
import * as schema from "../db/schema.ts";
import type { AuthEnv } from "../middleware/auth.ts";
import { getUser } from "../auth.ts";

export const activityRoutes = new Hono<AuthEnv>();

// GET /api/activity-logs
activityRoutes.get("/", async (c) => {
  try {
    const user = getUser(c);
    const userId = c.req.query("userId");
    const action = c.req.query("action");
    const startDate = c.req.query("startDate");
    const endDate = c.req.query("endDate");

    let conditions = [];
    if (userId) conditions.push(eq(schema.activityLogs.userId, userId));
    if (action) conditions.push(eq(schema.activityLogs.action, action));
    if (startDate) conditions.push(gte(schema.activityLogs.createdAt, parseInt(startDate)));
    if (endDate) conditions.push(lte(schema.activityLogs.createdAt, parseInt(endDate)));

    const query = db.select().from(schema.activityLogs).orderBy(desc(schema.activityLogs.createdAt));
    const logs = conditions.length > 0 ? await query.where(and(...conditions)).all() : await query.all();

    return c.json({ logs });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

// GET /api/activity-logs/stats — per-weekday activity for the dashboard charts.
// Migrated callers (customers/users/employees/stores pages) treat the response
// as a bare array and feed it straight to an ActivityBarChart, so it is
// deliberately unwrapped. Extra keys are included to satisfy every chart's
// series (`activityData` uses `users`/`active` and, for customers,
// `customers`/`new`).
activityRoutes.get("/stats", async (c) => {
  try {
    getUser(c);

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const logs = await db.select().from(schema.activityLogs).all();
    const recent = logs.filter((log) => log.createdAt >= sevenDaysAgo);

    const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const buckets = new Map(
      dayOrder.map((day) => [day, { users: new Set<string>(), actions: new Set<string>(), customers: 0, new: 0 }])
    );

    for (const log of recent) {
      const day = new Date(log.createdAt).toLocaleDateString("en-US", { weekday: "short" });
      const bucket = buckets.get(day);
      if (!bucket) continue;
      bucket.users.add(log.userId);
      bucket.actions.add(log.action);
      bucket.customers += 1;
      if (log.action === "customer.create") bucket.new += 1;
    }

    const activityData = dayOrder.map((label) => {
      const bucket = buckets.get(label)!;
      return {
        label,
        users: bucket.users.size,
        active: bucket.actions.size,
        customers: bucket.customers,
        new: bucket.new,
      };
    });

    return c.json(activityData);
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});