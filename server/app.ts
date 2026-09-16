import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./_core/oauth";
import { registerStorageProxy } from "./_core/storageProxy";
import { apiRateLimit, authRateLimit } from "./_core/rateLimit";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";

/**
 * createApp for Vercel API entry + local server.
 * Distributed rate limiting via Upstash Redis when UPSTASH_REDIS_REST_URL/TOKEN
 * are set; falls back to per-instance in-memory limits otherwise.
 */
export function createApp() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // Distributed rate limiting
  app.use("/api/auth", authRateLimit);
  app.use("/api/trpc", apiRateLimit);
  app.use("/api", apiRateLimit);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );
  return app;
}
