import { config as loadEnv } from "dotenv";
import type { Config } from "drizzle-kit";
import { resolveDatabaseTarget } from "./src/db/url.ts";

// Load `server/.env` and/or the repo-root `.env` so the `db:*` scripts work
// regardless of the directory they are invoked from.
loadEnv({ path: [".env", "../.env"] });

// Mirrors the API server's target so migrations always land on the database the
// app actually reads from (`local.db` beside the project by default).
const target = resolveDatabaseTarget();

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: target.url,
    authToken: target.authToken,
  },
} satisfies Config;