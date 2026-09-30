// ─────────────────────────────────────────────────────────────────────────────
// Where the database connection comes from.
//
// Everything that opens a connection — the API, drizzle-kit, the seed scripts —
// reads it from these two environment variables, so they can never disagree:
//
//   TURSO_DATABASE_URL   required
//                        `libsql://…` or `https://…`  → Turso
//                        `file:./local.db`             → a local SQLite file
//   TURSO_AUTH_TOKEN     required by Turso, ignored for `file:`
//
// A relative `file:` path is resolved against the repo root, so the API (run
// from the repo root) and the `db:*` scripts (run from `server/`) always open
// the SAME file. An absolute path is used as-is.
// ─────────────────────────────────────────────────────────────────────────────

import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** This file lives at `server/src/db/url.ts`, so up three levels is the root. */
function repoRootFromModuleUrl(): string | undefined {
  try {
    // `import.meta.url` is absent when the file has been bundled to CommonJS
    // (drizzle-kit does this when it loads `drizzle.config.ts`), hence the
    // fallback below.
    const url = (import.meta as { url?: string })?.url;
    if (typeof url !== "string") return undefined;
    return resolve(fileURLToPath(new URL("../../../", url)));
  } catch {
    return undefined;
  }
}

/** Walk up from the current directory until the project's `package.json` shows up. */
function repoRootFromCwd(): string | undefined {
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    const pkg = join(dir, "package.json");
    if (existsSync(pkg)) {
      try {
        if (JSON.parse(readFileSync(pkg, "utf8")).name === "td-inventory") return dir;
      } catch {
        /* unreadable package.json — keep walking */
      }
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return undefined;
}

export const REPO_ROOT = repoRootFromModuleUrl() ?? repoRootFromCwd() ?? process.cwd();

export type DatabaseTarget =
  | { kind: "local"; url: string; path: string; authToken?: undefined }
  | { kind: "remote"; url: string; authToken?: string };

export function resolveDatabaseTarget(): DatabaseTarget {
  const configured = process.env.TURSO_DATABASE_URL?.trim();

  if (!configured) {
    throw new Error(
      "TURSO_DATABASE_URL is not set.\n" +
        "  Copy `.env.example` to `.env` and point it at your database:\n" +
        '    TURSO_DATABASE_URL="libsql://<db>.turso.io"   # Turso\n' +
        '    TURSO_DATABASE_URL="file:./local.db"          # local SQLite file'
    );
  }

  if (!configured.startsWith("file:")) {
    return { kind: "remote", url: configured, authToken: process.env.TURSO_AUTH_TOKEN };
  }

  const raw = configured.slice("file:".length).replace(/^\/+/, "/");
  const path = isAbsolute(raw) ? raw : resolve(REPO_ROOT, raw);

  // `@libsql/client` strips the `file:` prefix and treats the remainder as a
  // path, so the single-slash form is deliberate — `file://` would leave a
  // leading `//` behind.
  return { kind: "local", url: `file:${path}`, path };
}

/** Human-readable target, for log lines. Never leaks an auth token. */
export function describeTarget(target: DatabaseTarget): string {
  if (target.kind === "remote") return target.url.replace(/\/\/[^@/]*@/, "//***@");
  const relative = target.path.startsWith(REPO_ROOT)
    ? target.path.slice(REPO_ROOT.length + 1)
    : target.path;
  return `${relative} (local SQLite)`;
}
