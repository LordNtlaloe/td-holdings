import { createRouter } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { routeTree } from "./routeTree.gen";
import "./styles.css"

export function getRouter() {
  const queryClient: QueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000, // 30 seconds
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    defaultPreload: "intent",
    context: { queryClient },
    scrollRestoration: true,
    Wrap: ({ children }) => <>{children}</>,
  });
  setupRouterSsrQueryIntegration({ router, queryClient });

  return router;
}