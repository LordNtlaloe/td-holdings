import "../env.ts";

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { describeTarget, resolveDatabaseTarget } from "./url.ts";

// Local SQLite file by default; remote Turso only when configured that way.
// See `./url.ts` for the precedence rules.
const target = resolveDatabaseTarget();

console.log(`🗄️  Database: ${describeTarget(target)}`);

const client = createClient({
  url: target.url,
  authToken: target.authToken,
});

export const db = drizzle(client, { schema });

export default db;