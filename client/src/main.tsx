import { trpc } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";
import { supabase } from "@/lib/supabase";

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 5 * 60 * 1000, gcTime: 30 * 60 * 1000, refetchOnWindowFocus: false, refetchOnReconnect: false, retry: 1 } } });

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    console.error("[API Mutation Error]", error);
  }
});

/** Route all browser tRPC traffic through api.e7ketha.com (same-origin on api host / localhost). */
function resolveTrpcUrl() {
  if (typeof window === "undefined") return "/api/trpc";
  const host = window.location.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1") return "/api/trpc";
  if (host === "api.e7ketha.com" || host.startsWith("api.")) return "/api/trpc";
  return "https://api.e7ketha.com/api/trpc";
}

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: resolveTrpcUrl(),
      transformer: superjson,
      async headers() {
        const { data } = await supabase?.auth.getSession() ?? { data: { session: null } };
        return data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {};
      },
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

const rootElement = document.getElementById("root")!;
const app = <trpc.Provider client={trpcClient} queryClient={queryClient}>
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
</trpc.Provider>;

// SSR public pages inject an SEO shell into #root (server/app.ts). That shell is
// structurally aligned with SiteShell + Home but cannot reproduce lucide SVG
// paths or auth/theme-dependent controls. Using hydrateRoot against it throws
// React #418 and recovers via a full client re-render (double work).
// Clear the shell once, then mount — crawlers still receive the SSR HTML.
if (rootElement.childNodes.length > 0) {
  rootElement.replaceChildren();
}
createRoot(rootElement).render(app);
