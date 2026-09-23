/**
 * Production security:
 * - disable X-Powered-By
 * - rate-limit /api/trpc (reuse server/_core/rateLimit)
 * - hard 404 for /.env /.git package.json etc.
 */
import fs from "node:fs";

function patchApp() {
  const f = "server/app.ts";
  if (!fs.existsSync(f)) return;
  let s = fs.readFileSync(f, "utf8");
  if (s.includes("/* SEC_HARDENING */")) {
    console.log("[patch-security] app.ts already hardened");
    return;
  }
  if (!s.includes('from "./_core/rateLimit"') && !s.includes("from './_core/rateLimit'")) {
    s = s.replace(
      'import { createContext } from "./_core/context";',
      'import { createContext } from "./_core/context";\nimport { apiRateLimit, authRateLimit } from "./_core/rateLimit";',
    );
  }
  const marker = 'export function createApp() {\n  const app = express();\n  app.use(express.json({ limit: "50mb" }));';
  const neu = `export function createApp() {
  const app = express();
  /* SEC_HARDENING */
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    const p = String(req.path || "");
    if (
      p === "/.env" ||
      p.startsWith("/.env.") ||
      p === "/.git" ||
      p.startsWith("/.git/") ||
      p === "/package.json" ||
      p === "/package-lock.json" ||
      p === "/pnpm-lock.yaml" ||
      p === "/yarn.lock" ||
      p === "/.npmrc" ||
      p === "/tsconfig.json" ||
      p === "/vite.config.ts" ||
      p.startsWith("/server/") ||
      p.startsWith("/scripts/")
    ) {
      res.status(404).type("text/plain").send("Not Found");
      return;
    }
    next();
  });
  app.use("/api/auth", authRateLimit);
  app.use("/api/trpc", apiRateLimit);
  app.use(express.json({ limit: "50mb" }));`;
  if (s.includes(marker)) {
    s = s.replace(marker, neu);
  } else {
    console.warn("[patch-security] createApp pattern not found in app.ts");
    return;
  }
  fs.writeFileSync(f, s);
  console.log("[patch-security] app.ts hardened");
}

function patchVercelEntry() {
  const f = "scripts/vercel-api-entry.ts";
  if (!fs.existsSync(f)) return;
  let s = fs.readFileSync(f, "utf8");
  if (s.includes("/* SEC_HARDENING_ENTRY */")) {
    console.log("[patch-security] vercel entry already hardened");
    return;
  }
  s = s.replace(
    "export default async function handler(req: any, res: any) {\n  try {\n    applyCors(req, res);",
    `export default async function handler(req: any, res: any) {
  try {
    /* SEC_HARDENING_ENTRY */
    const rawPath = String(req.url || "/").split("?")[0];
    if (
      rawPath === "/.env" ||
      rawPath.startsWith("/.env.") ||
      rawPath === "/.git" ||
      rawPath.startsWith("/.git/") ||
      rawPath === "/package.json" ||
      rawPath === "/package-lock.json" ||
      rawPath === "/pnpm-lock.yaml"
    ) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("X-Frame-Options", "DENY");
      res.end("Not Found");
      return;
    }
    try { res.removeHeader("X-Powered-By"); } catch { /* ignore */ }
    applyCors(req, res);`,
  );
  fs.writeFileSync(f, s);
  console.log("[patch-security] vercel-api-entry hardened");
}

patchApp();
patchVercelEntry();
