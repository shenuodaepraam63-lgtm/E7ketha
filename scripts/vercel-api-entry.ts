import { createApp } from "../server/app.ts";

const app = createApp();

/** Origins allowed to call api.e7ketha.com from the browser */
const ALLOWED_ORIGINS = new Set([
  "https://e7ketha.com",
  "https://www.e7ketha.com",
  "https://admin.e7ketha.com",
  "https://api.e7ketha.com",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
]);

function applyCors(req: any, res: any) {
  const origin = String(req.headers?.origin || req.headers?.Origin || "");
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS,PUT,PATCH,DELETE");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, trpc-accept, x-trpc-source, x-requested-with",
    );
    res.setHeader("Access-Control-Max-Age", "86400");
    res.setHeader("Vary", "Origin");
  }
}

export default function handler(req: any, res: any) {
  try {
    applyCors(req, res);
    if (String(req.method || "").toUpperCase() === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }
    return app(req, res);
  } catch (error) {
    console.error("[Vercel API] handler failed", error);
    if (!res.headersSent) res.status(500).json({ error: "API handler failed" });
  }
}
