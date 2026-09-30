// ─────────────────────────────────────────────────────────────────────────────
// Standalone API listener.
//
// `npm run dev` does NOT use this — the app server (`src/server.ts`) mounts the
// Hono app directly, so the frontend and the API share one origin and one port.
// Run this only when you want the API on its own host or port, e.g.:
//
//   npm run dev:api
//
// Listens on `PORT` (default 4000) and `HOST` (default 0.0.0.0).
// ─────────────────────────────────────────────────────────────────────────────

import "./env.ts";

import { serve } from "@hono/node-server";
import { api } from "./app.ts";

const port = parseInt(process.env.PORT || "4000", 10);
const host = process.env.HOST || "0.0.0.0";

console.log(`🚀 API listening on http://${host}:${port}`);

serve({
  fetch: api.fetch,
  port,
  hostname: host,
});
