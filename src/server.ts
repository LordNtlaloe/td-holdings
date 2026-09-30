// ─────────────────────────────────────────────────────────────────────────────
// Custom TanStack Start server entry.
//
// TanStack Start picks this file up automatically (`src/server.ts`). Everything
// runs in ONE process on ONE port:
//
//   /api/*  → the Hono API from `server/src/app.ts`
//   anything else → the TanStack Start SSR handler
//
// Because the browser only ever talks to its own origin, requests are
// same-origin: no CORS, no `VITE_API_URL` pointing at a second port, and no
// "backend not running" — if the page loaded, the API is up.
// ─────────────────────────────────────────────────────────────────────────────

import { createServerEntry } from "@tanstack/react-start/server-entry";
import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/react-start/server";
import type { RequestHandler } from "@tanstack/react-start/server";
import type { Register } from "@tanstack/react-router";

import { api } from "../server/src/app.ts";

const renderApp = createStartHandler(defaultStreamHandler);

function isApiRequest(request: Request): boolean {
  const { pathname } = new URL(request.url);
  return pathname === "/api" || pathname.startsWith("/api/");
}

const fetch: RequestHandler<Register> = (request, opts) => {
  if (isApiRequest(request)) {
    return api.fetch(request);
  }
  return renderApp(request, opts);
};

export default createServerEntry({ fetch });
