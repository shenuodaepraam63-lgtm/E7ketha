import { trpc } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { AnalyticsRouteTracker } from "@/components/AnalyticsRouteTracker";
import "./index.css";

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
        // Avoid loading ~200KB Supabase on anonymous homepage traffic.
        const { hasAuthHint, getSupabase } = await import("@/lib/supabase");
        if (!hasAuthHint()) return {};
        const sb = await getSupabase();
        if (!sb) return {};
        const { data } = await sb.auth.getSession();
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
    <AnalyticsRouteTracker />
    <App />
  </QueryClientProvider>
</trpc.Provider>;

// /* SSR_PAINT_DISMISS */
// SEO shell inside #root is not a React tree match → createRoot (not hydrateRoot).
// Critical LCP lives in #ssr-paint OUTSIDE #root and must survive this mount.
if (rootElement.childNodes.length > 0) {
  rootElement.replaceChildren();
}
createRoot(rootElement).render(app);

// Dismiss static paint island only after React has painted real images (or timeout).
(function dismissSsrPaintWhenReady() {
  const paint = document.getElementById("ssr-paint");
  if (!paint) return;
  const root = document.getElementById("root");
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    paint.style.transition = "opacity .18s ease";
    paint.style.opacity = "0";
    paint.style.pointerEvents = "none";
    window.setTimeout(() => paint.remove(), 220);
  };
  const hasClientImg = () => !!(root && root.querySelector("img[src]"));
  if (hasClientImg()) {
    requestAnimationFrame(() => requestAnimationFrame(finish));
    return;
  }
  const obs = new MutationObserver(() => {
    if (hasClientImg()) {
      obs.disconnect();
      requestAnimationFrame(() => requestAnimationFrame(finish));
    }
  });
  if (root) obs.observe(root, { childList: true, subtree: true });
  window.setTimeout(() => {
    obs.disconnect();
    finish();
  }, 5000);
})();
