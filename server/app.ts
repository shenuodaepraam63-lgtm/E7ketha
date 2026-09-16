import express from "express";
// see conversation for full restore - temporary stub to prevent 500
import { createExpressMiddleware } from "@trpc/server/adapters/express";
export function createApp() {
  const app = express();
  app.get("*", (_req, res) => res.status(503).send("SEO module temporarily restoring"));
  return app;
}
