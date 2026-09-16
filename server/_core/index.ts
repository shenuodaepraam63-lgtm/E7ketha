import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { getPerformanceSnapshot, recordRequest } from "./performance";
import { apiRateLimit, authRateLimit } from "./rateLimit";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

export function createApp() {
  const app = express();
  app.use((req, res, next) => {
    const startedAt = process.hrtime.bigint();
    res.once("finish", () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const route = `${req.method} ${req.path}`;
      recordRequest(route, durationMs);
      const samples = getPerformanceSnapshot();
      const routeSnapshot = samples[route] as { count: number; p95Ms: number } | undefined;
      if (routeSnapshot && routeSnapshot.count % 20 === 0) {
        console.info("[Performance]", JSON.stringify({ route, ...routeSnapshot, lastMs: Math.round(durationMs * 100) / 100 }));
      }
    });
    next();
  });
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // Distributed rate limiting (Upstash Redis when configured; in-memory fallback)
  app.use("/api/auth", authRateLimit);
  app.use("/api/trpc", apiRateLimit);
  app.use("/api", apiRateLimit);
  app.get("/api/performance", (_req, res) => res.json({ generatedAt: new Date().toISOString(), routes: getPerformanceSnapshot() }));
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  return app;
}

async function startServer() {
  const app = createApp();
  const server = createServer(app);
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

if (!process.env.VERCEL) {
  startServer().catch(console.error);
}
