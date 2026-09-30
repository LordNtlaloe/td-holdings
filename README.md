Welcome to your new TanStack Start app! 

# Getting Started

To run this application:

```bash
npm install
npm run dev
```

That is the only command needed — see [Backend setup](#backend-setup-hono--turso)
for what it does.

# Building For Production

To build this application for production:

```bash
yarn run build
```

## Testing

This project uses [Vitest](https://vitest.dev/) for testing. You can run the tests with:

```bash
yarn run test
```

## Styling

This project uses [Tailwind CSS](https://tailwindcss.com/) for styling.

### Removing Tailwind CSS

If you prefer not to use Tailwind CSS:

1. Remove the demo pages in `src/routes/demo/`
2. Replace the Tailwind import in `src/styles.css` with your own styles
3. Remove `tailwindcss()` from the plugins array in `vite.config.ts`
4. Uninstall the packages: `yarn add @tailwindcss/vite tailwindcss --dev`


## Backend setup (Hono + Turso)

The API lives in `src/api/` (Hono + Drizzle) and is **mounted into the app server** by
`src/server.ts`, so the frontend and the API share one origin and one port:

```
/api/*          → the Hono API in src/api/app.ts
everything else → the TanStack Start SSR handler
```

No CORS, no second port, no `VITE_API_URL` to keep in sync — if the page loaded, the
API is up. The API can still be run on its own host (`npm run dev:api`, `src/api/index.ts`).

### Source layout

One tree, one app — there is no separate backend project:

| Path | What it is |
| --- | --- |
| `src/api/**` | the Hono API (routes, auth, Drizzle schema, printing) |
| `src/server.ts` | the server entry that mounts `src/api` into TanStack Start |
| `src/**` (the rest) | the frontend |
| `drizzle/`, `drizzle.config.ts` | migrations and Drizzle Kit config |
| `scripts/` | local-database tooling (bootstrap + one-shot Convex import). No credential tooling — passwords are set from the admin UI |

Two TypeScript projects cover it, because the API is Node-only (no DOM lib, `types: ["node"]`) while the UI needs DOM + JSX:

- `tsconfig.json` — the frontend; excludes `src/api`, `src/server.ts`, `scripts/`, `drizzle.config.ts`
- `tsconfig.api.json` — the API, the server entry, `scripts/` and the Drizzle config

```bash
npm run typecheck   # runs both
```

### Development

```bash
npm install     # add --legacy-peer-deps if dependency resolution fails
npm run dev     # → http://localhost:3000
```

`npm run dev` also runs `npm run db:bootstrap`. That only does anything when
`TURSO_DATABASE_URL` is a `file:` URL — it creates that file, applies the migrations in
`drizzle/`, applies `drizzle/indexes.sql` (not part of the Drizzle
journal), and seeds from `convex-export/` the first time only. It is idempotent, and it
exits immediately when a remote database is configured, so it never touches Turso.

| Command | What it does |
| --- | --- |
| `npm run dev` | the whole app on :3000 (plus a local-file bootstrap, if you use one) |
| `npm run db:bootstrap` | create/migrate/seed a local SQLite file (no-op for remote) |
| `npm run db:reset` | delete the local file, then rebuild and reseed from scratch |
| `npm run dev:api` | run the API by itself on :4000 |
| `npm run db:generate` / `db:migrate` | Drizzle schema generation / migration |

Accounts imported from Convex arrive **without password hashes** (the old backend used a
different auth scheme), so they cannot sign in — `POST /api/auth/sign-in` answers 401
`"No password set. Use password reset."`, and every authed endpoint (including
`/api/dashboard`) then answers 401 `"Not authenticated"` because there is no session.

Set a password from the app: sign in as an admin, then **sidebar → Users → ⋯ → Set
Password** (`PATCH /api/users/:id/password`, admin/super_admin only). The same dialog is
on the Employees page as "Set Password". There is deliberately no CLI or environment
variable for it any more: a script needs `TURSO_AUTH_TOKEN` in its environment, i.e. full
write access to the production database, which is far more than setting one password
needs.

The very first account is the one exception. In an **empty** database
`POST /api/auth/sign-up` still works and creates that account as `super_admin`, so a
fresh install has a way in; from then on it answers
`403 "Sign-up is closed. Ask an administrator to create your account."` and every other
account is created by an admin (`POST /api/users`, or Employees → Add Employee). The role
is decided by the server — it is never read from the request body.

### Who may act on whom

One rule: **a plain `admin` has no authority over a `super_admin`.** A `super_admin` may
act on anyone, including another `super_admin`.

It lives in `mayManageRole()` (`src/api/auth.ts`) and is asked by every route that can
change *who a person is*:

| Route | Against a `super_admin` target, as an `admin` |
| --- | --- |
| `DELETE /api/users/:id` | 403 `Only a super_admin can delete a super_admin account.` |
| `PATCH /api/users/:id/password` | 403 |
| `PATCH /api/users/:id/status` (ban / suspend / reactivate) | 403 |
| `POST /api/users` with `role: "super_admin"` | 403 |
| `POST /api/employees/with-user` with `role: "super_admin"` | 403 |
| `PATCH /api/employees/:id/password` | 403 |

Password and status are on that list deliberately: an admin who could only reset a
super_admin's password would hold the same effective authority by a longer route, and
`with-user` writes its `role` straight into `users`, so it is a second door into the same
room. The Users page mirrors the rule — those menu items are disabled, with a
"Super admin — only another super_admin can change this account" note.

Deleting a user is a **hard** delete, and several tables (employees, activity logs, sales)
hold a foreign key on `app_users`. `DELETE /api/employees/:id` only sets `isActive = false`,
so the employee row — and its reference — survives, and deleting the linked user is then
refused with `409 "… is still referenced by other records (employee card, activity log,
sales), so it cannot be erased. Ban or suspend the account instead…"`. For anyone who has
ever transacted, prefer **Ban** or **Suspend** over Delete.

Two accounts still use the pre-PBKDF2 scheme (`SHA-256(password + JWT_SECRET)`):
`user.test@gmail.com` and `ui.flow.test.55719@example.com`. They only verify if
`JWT_SECRET` still holds the value they were created with, so setting a fresh password
is the reliable fix.

### Which database is used

The connection is built **only** from environment variables (`src/api/db/url.ts`), so
the API, Drizzle Kit and the seed scripts can never disagree:

| Variable | Notes |
| --- | --- |
| `TURSO_DATABASE_URL` | `libsql://<db>.turso.io` / `https://…` for Turso, or `file:./local.db` for a local SQLite file |
| `TURSO_AUTH_TOKEN` | Required by Turso, ignored for `file:` |

A relative `file:` path is resolved against the repo root, so the API (run from the repo
root) and the `db:*` scripts open the same file. There is no
implicit fallback: if `TURSO_DATABASE_URL` is unset the server refuses to start and says
so. Set a long random `JWT_SECRET` for anything shared.

### Printing needs a local machine

`src/api/print-transport.ts` sends ESC/POS bytes straight to a printer: raw TCP
(`192.168.1.50:9100`), a device node (`/dev/usb/lp0`), or a local CUPS queue
(`cups:POS-80`). All of those are LAN-local, so **the server must run where the printers
are reachable** — a cloud-hosted API cannot print.

### Production (self-hosted)

```bash
npm run build                 # → .output/
node .output/server/index.mjs # one Node process serving the app AND /api/*
```

One process means one port, one certificate and one reverse-proxy rule. The server must
run somewhere with a route to the printers (see above).

### Deploying to Vercel

**This is ONE Vercel project, rooted at the repository root.** The API is not a separate
deployment: `src/server.ts` mounts the Hono app into the TanStack Start server, so one
function serves both:

| Route | Handled by |
| --- | --- |
| `/api/*` | the Hono app (`src/api/app.ts`) |
| everything else | the TanStack Start SSR handler |

`vercel.json` pins that: framework detection off, `npm run build`, and the Build Output
API (`.vercel/output`). Nitro picks the `vercel` preset automatically because `VERCEL=1`
is set in Vercel's build environment.

**Environment variables** (Settings → Environment Variables) — `.env` is gitignored, so
nothing is inherited:

| Variable | Notes |
| --- | --- |
| `TURSO_DATABASE_URL` | required |
| `TURSO_AUTH_TOKEN` | required for Turso |
| `JWT_SECRET` | **set a long random value.** Unset, the server falls back to a hard-coded development secret — do not ship that |

Two things to know before you rely on it:

- **The function timeout is raised to 60s** (`vite.config.ts` → `nitro.vercel.functions.maxDuration`)
  because `/api/dashboard` measures ~12s warm over Turso. On the Hobby plan 60s is the
  ceiling, so if the dashboard gets slower it will 504 rather than load. The real fix is
  to speed that endpoint up.
- **Printing cannot work from Vercel.** `/api/print/*` talks to a printer on the store's
  LAN (`tcp://…:9100`, `/dev/usb/lp0`, `cups:…`), which a serverless function cannot
  reach. Receipt printing needs the app deployed inside the network, or a per-store print
  agent.

To preview the Vercel output locally:

```bash
VERCEL=1 npm run build        # → .vercel/output
```



## Routing

This project uses [TanStack Router](https://tanstack.com/router) with file-based routing. Routes are managed as files in `src/routes`.

### Adding A Route

To add a new route to your application just add a new file in the `./src/routes` directory.

TanStack will automatically generate the content of the route file for you.

Now that you have two routes you can use a `Link` component to navigate between them.

### Adding Links

To use SPA (Single Page Application) navigation you will need to import the `Link` component from `@tanstack/react-router`.

```tsx
import { Link } from "@tanstack/react-router";
```

Then anywhere in your JSX you can use it like so:

```tsx
<Link to="/about">About</Link>
```

This will create a link that will navigate to the `/about` route.

More information on the `Link` component can be found in the [Link documentation](https://tanstack.com/router/v1/docs/framework/react/api/router/linkComponent).

### Using A Layout

In the File Based Routing setup the layout is located in `src/routes/__root.tsx`. Anything you add to the root route will appear in all the routes. The route content will appear in the JSX where you render `{children}` in the `shellComponent`.

Here is an example layout that includes a header:

```tsx
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'My App' },
    ],
  }),
  shellComponent: ({ children }) => (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <header>
          <nav>
            <Link to="/">Home</Link>
            <Link to="/about">About</Link>
          </nav>
        </header>
        {children}
        <Scripts />
      </body>
    </html>
  ),
})
```

More information on layouts can be found in the [Layouts documentation](https://tanstack.com/router/latest/docs/framework/react/guide/routing-concepts#layouts).

## Server Functions

TanStack Start provides server functions that allow you to write server-side code that seamlessly integrates with your client components.

```tsx
import { createServerFn } from '@tanstack/react-start'

const getServerTime = createServerFn({
  method: 'GET',
}).handler(async () => {
  return new Date().toISOString()
})

// Use in a component
function MyComponent() {
  const [time, setTime] = useState('')
  
  useEffect(() => {
    getServerTime().then(setTime)
  }, [])
  
  return <div>Server time: {time}</div>
}
```

## API Routes

You can create API routes by using the `server` property in your route definitions:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'

export const Route = createFileRoute('/api/hello')({
  server: {
    handlers: {
      GET: () => json({ message: 'Hello, World!' }),
    },
  },
})
```

## Data Fetching

There are multiple ways to fetch data in your application. You can use TanStack Query to fetch data from a server. But you can also use the `loader` functionality built into TanStack Router to load the data for a route before it's rendered.

For example:

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/people')({
  loader: async () => {
    const response = await fetch('https://swapi.dev/api/people')
    return response.json()
  },
  component: PeopleComponent,
})

function PeopleComponent() {
  const data = Route.useLoaderData()
  return (
    <ul>
      {data.results.map((person) => (
        <li key={person.name}>{person.name}</li>
      ))}
    </ul>
  )
}
```

Loaders simplify your data fetching logic dramatically. Check out more information in the [Loader documentation](https://tanstack.com/router/latest/docs/framework/react/guide/data-loading#loader-parameters).

# Demo files

Files prefixed with `demo` can be safely deleted. They are there to provide a starting point for you to play around with the features you've installed.

# Learn More

You can learn more about all of the offerings from TanStack in the [TanStack documentation](https://tanstack.com).

For TanStack Start specific documentation, visit [TanStack Start](https://tanstack.com/start).
# td-holdings-inventory
