// ─────────────────────────────────────────────────────────────────────────────
// Environment loading — import this FIRST, before any module that reads
// `process.env` at import time (e.g. `db/index.ts`, `auth.ts`).
//
// ES modules are evaluated before a module's own body runs, so a `loadEnv()`
// call inside `index.ts` would happen too late. Importing this module first
// guarantees the variables are present.
// ─────────────────────────────────────────────────────────────────────────────

import { config as loadEnv } from "dotenv";

// Load `server/.env` and/or the repo-root `.env` (one source of truth shared by
// the frontend and the API server). Existing variables are not overwritten.
loadEnv({ path: [".env", "../.env"] });
