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

The API lives in `server/` (Hono + Drizzle) and is **mounted into the app server** by
`src/server.ts`, so the frontend and the API share one origin and one port:

```
/api/*          → the Hono API in server/src/app.ts
everything else → the TanStack Start SSR handler
```

No CORS, no second port, no `VITE_API_URL` to keep in sync — if the page loaded, the
API is up. The API can still be run on its own host (`npm run dev:api`, `server/src/index.ts`).

### Development

```bash
npm install     # add --legacy-peer-deps if dependency resolution fails
npm run dev     # → http://localhost:3000
```

`npm run dev` also runs `npm run db:bootstrap`. That only does anything when
`TURSO_DATABASE_URL` is a `file:` URL — it creates that file, applies the migrations in
`server/drizzle/`, applies `server/drizzle/indexes.sql` (not part of the Drizzle
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
Pick one of:

```bash
# a) let `npm run dev` do it — add to .env, then start (idempotent, never logged)
#    SEED_ADMIN_EMAIL=you@example.com
#    SEED_ADMIN_PASSWORD=<at least 8 characters>

# b) be prompted for the password (hidden input, nothing in shell history)
cd server && npx tsx scripts/set-password.ts <email>
```

Two accounts still use the pre-PBKDF2 scheme (`SHA-256(password + JWT_SECRET)`):
`user.test@gmail.com` and `ui.flow.test.55719@example.com`. They only verify if
`JWT_SECRET` still holds the value they were created with, so setting a fresh password
is the reliable fix.

### Which database is used

The connection is built **only** from environment variables (`server/src/db/url.ts`), so
the API, Drizzle Kit and the seed scripts can never disagree:

| Variable | Notes |
| --- | --- |
| `TURSO_DATABASE_URL` | `libsql://<db>.turso.io` / `https://…` for Turso, or `file:./local.db` for a local SQLite file |
| `TURSO_AUTH_TOKEN` | Required by Turso, ignored for `file:` |

A relative `file:` path is resolved against the repo root, so the API (run from the repo
root) and the `db:*` scripts (run from `server/`) open the same file. There is no
implicit fallback: if `TURSO_DATABASE_URL` is unset the server refuses to start and says
so. Set a long random `JWT_SECRET` for anything shared.

### Printing needs a local machine

`server/src/print-transport.ts` sends ESC/POS bytes straight to a printer: raw TCP
(`192.168.1.50:9100`), a device node (`/dev/usb/lp0`), or a local CUPS queue
(`cups:POS-80`). All of those are LAN-local, so **the server must run where the printers
are reachable** — a cloud-hosted API cannot print.

### Production

```bash
npm run build                 # → .output/
node .output/server/index.mjs # one Node process serving the app AND /api/*
```

One process means one port, one certificate and one reverse-proxy rule.



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
