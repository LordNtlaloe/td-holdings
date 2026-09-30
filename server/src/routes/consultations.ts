import { Hono } from "hono";
import db from "../db/index.ts";
import * as schema from "../db/schema.ts";
import { AuthEnv } from "../middleware/auth.ts";
import { getUser } from "../auth.ts";

export const consultationRoutes = new Hono<AuthEnv>();

// GET /api/consultations/stats — consultation aggregates
consultationRoutes.get("/stats", async (c) => {
  try {
    getUser(c);
    const all = await db.select().from(schema.consultations).all();

    const total = all.length;
    const completed = all.filter((x) => x.status === "completed").length;
    const pending = all.filter((x) => x.status === "pending").length;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const today = all.filter((x) => x.createdAt >= startOfToday.getTime()).length;

    return c.json({ total, completed, pending, today });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});
