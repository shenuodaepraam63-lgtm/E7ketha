/**
 * Client companion for SSR paint island:
 * - Keep #ssr-paint outside React root (never replaceChildren on it)
 * - Soft-remove it only after #root has real <img> (LCP continuity)
 * - Home uses __E7K_HOME_BOOT__ as initialData (no cold API wait for first covers)
 */
import fs from "node:fs";

function patchMain() {
  const f = "client/src/main.tsx";
  if (!fs.existsSync(f)) return;
  let s = fs.readFileSync(f, "utf8");
  if (s.includes("/* SSR_PAINT_DISMISS */")) {
    console.log("[patch-ssr-paint-client] main already patched");
    return;
  }

  const re = /\/\/ SSR public pages[\s\S]*?createRoot\(rootElement\)\.render\(app\);/;
  const neu = `// /* SSR_PAINT_DISMISS */
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
})();`;

  if (re.test(s)) {
    s = s.replace(re, neu);
  } else if (s.includes("replaceChildren()") && s.includes("createRoot(rootElement).render(app)")) {
    s = s.replace(
      /if \(rootElement\.childNodes\.length > 0\) \{\s*rootElement\.replaceChildren\(\);\s*\}\s*createRoot\(rootElement\)\.render\(app\);/,
      neu.replace(/^\/\/ \/\* SSR_PAINT_DISMISS \*\/\n/, "/* SSR_PAINT_DISMISS */\n"),
    );
  } else {
    console.warn("[patch-ssr-paint-client] main.tsx pattern not found");
    return;
  }
  fs.writeFileSync(f, s);
  console.log("[patch-ssr-paint-client] main.tsx dismiss logic applied");
}

function patchHome() {
  const f = "client/src/pages/Home.tsx";
  if (!fs.existsSync(f)) return;
  let s = fs.readFileSync(f, "utf8");
  if (s.includes("__E7K_HOME_BOOT__") || s.includes("/* HOME_BOOT */")) {
    console.log("[patch-ssr-paint-client] Home already has boot");
    return;
  }
  if (!s.includes("novels.search.useQuery")) {
    console.warn("[patch-ssr-paint-client] Home query not found");
    return;
  }
  const inject = `/* HOME_BOOT */\nfunction readHomeBoot(): unknown[] | undefined {\n  if (typeof document === "undefined") return undefined;\n  const el = document.getElementById("__E7K_HOME_BOOT__");\n  if (!el?.textContent) return undefined;\n  try {\n    const data = JSON.parse(el.textContent);\n    return Array.isArray(data) ? data : undefined;\n  } catch {\n    return undefined;\n  }\n}\n\n`;
  s = s.replace(
    "export default function Home() {",
    inject + "export default function Home() {\n  const homeBoot = readHomeBoot() as any[] | undefined;",
  );
  s = s.replace(
    `const novelsQuery = trpc.novels.search.useQuery(
    { sort: 'popular', limit: 12 },
    { staleTime: 300_000, refetchOnMount: false },
  );`,
    `const novelsQuery = trpc.novels.search.useQuery(
    { sort: 'popular', limit: 12 },
    {
      staleTime: 300_000,
      refetchOnMount: false,
      // Preloaded from SSR — first paint uses real covers without waiting for API.
      ...(homeBoot?.length
        ? { initialData: homeBoot as any, initialDataUpdatedAt: Date.now() }
        : {}),
    },
  );`,
  );
  fs.writeFileSync(f, s);
  console.log("[patch-ssr-paint-client] Home.tsx boot initialData applied");
}

patchMain();
patchHome();
