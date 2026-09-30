import { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext } from "@tanstack/react-router";
import { Outlet, Scripts, HeadContent, Link } from "@tanstack/react-router";
import * as React from "react";
import { Toaster } from "sonner";

// 1. Create a custom 404 component
function NotFoundComponent() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-6xl font-bold text-foreground">404</h1>
      <p className="text-xl text-muted-foreground">Page not found</p>
      <Link
        to="/"
        className="mt-4 rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 transition"
      >
        Go back home
      </Link>
    </div>
  );
}

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "TD Inventory" },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
        <Scripts />
        <Toaster />
      </body>
    </html>
  );
}