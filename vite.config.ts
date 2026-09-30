import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    tailwindcss(),
    tanstackStart(),
    nitro({
      // Vercel configuration. Nitro detects the platform from `VERCEL=1` in the
      // build environment and emits the Build Output API (`.vercel/output`).
      //
      // `maxDuration` matters: this is ONE function serving both the SSR app and
      // the Hono API, and `/api/dashboard` alone takes ~12s warm over Turso —
      // past Vercel's 10s default, so it would 504. 60s is the Hobby ceiling.
      vercel: {
        functions: {
          maxDuration: 60,
        },
      },
    }),
    viteReact(),
  ],
})

export default config