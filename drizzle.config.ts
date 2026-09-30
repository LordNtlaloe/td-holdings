import { config as loadEnv } from "dotenv";
import type { Config } from "drizzle-kit";
import { resolveDatabaseTarget } from "./src/api/db/url.ts";

// Load the repo-root `.env` (`server/.env` is also tolerated so the file keeps
// working if it is ever invoked from a subdirectory).
loadEnv({ path: [".env", "../.env"] });

// Mirrors the API server's target so migrations always land on the database the
// app actually reads from (`local.db` beside the project by default).
const target = resolveDatabaseTarget();

export default {
  schema: "./src/api/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: target.url,
    authToken: target.authToken,
  },
} satisfies Config;