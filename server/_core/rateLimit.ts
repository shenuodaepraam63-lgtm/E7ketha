import type { Request, Response, NextFunction, RequestHandler } from "express";

type Bucket = { count: number; resetAt: number };

/** In-memory fallback (per-instance). Used when Upstash is not configured. */
const memoryStore = new Map<string, Bucket>();

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of memoryStore) {
    if (bucket.resetAt <= now) memoryStore.delete(key);
  }
}, 60_000).unref?.();

function clientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return String(forwarded[0]).split(",")[0]?.trim() || "unknown";
  }
  return req.socket.remoteAddress || "unknown";
}

type LimitConfig = {
  /** Max requests in the window */
  max: number;
  /** Window length in milliseconds */
  windowMs: number;
  /** Prefix for Redis / memory keys */
  prefix: string;
};

function memoryLimit(config: LimitConfig): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${config.prefix}:${clientIp(req)}`;
    const now = Date.now();
    let bucket = memoryStore.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + config.windowMs };
      memoryStore.set(key, bucket);
    }
    bucket.count += 1;
    const remaining = Math.max(0, config.max - bucket.count);
    res.setHeader("X-RateLimit-Limit", String(config.max));
    res.setHeader("X-RateLimit-Remaining", String(remaining));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));
    if (bucket.count > config.max) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({
        error: "too_many_requests",
        message: "طلبات كثيرة جداً. حاول بعد قليل.",
        retryAfter,
      });
    }
    next();
  };
}

type UpstashLimiter = {
  limit: (id: string) => Promise<{
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
  }>;
};

let upstashReady: Promise<{
  api: UpstashLimiter | null;
  auth: UpstashLimiter | null;
}> | null = null;

async function getUpstashLimiters() {
  if (upstashReady) return upstashReady;
  upstashReady = (async () => {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) return { api: null, auth: null };
    try {
      const { Redis } = await import("@upstash/redis");
      const { Ratelimit } = await import("@upstash/ratelimit");
      const redis = new Redis({ url, token });
      const api = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(120, "1 m"),
        prefix: "e7ketha:rl:api",
        analytics: true,
      });
      const auth = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(15, "1 m"),
        prefix: "e7ketha:rl:auth",
        analytics: true,
      });
      return { api, auth };
    } catch (err) {
      console.warn("[rateLimit] Upstash unavailable, using in-memory fallback", err);
      return { api: null, auth: null };
    }
  })();
  return upstashReady;
}

function upstashOrMemory(
  kind: "api" | "auth",
  memory: RequestHandler,
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limiters = await getUpstashLimiters();
      const limiter = kind === "auth" ? limiters.auth : limiters.api;
      if (!limiter) return memory(req, res, next);

      const result = await limiter.limit(clientIp(req));
      res.setHeader("X-RateLimit-Limit", String(result.limit));
      res.setHeader("X-RateLimit-Remaining", String(result.remaining));
      res.setHeader("X-RateLimit-Reset", String(Math.ceil(result.reset / 1000)));

      if (!result.success) {
        const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
        res.setHeader("Retry-After", String(retryAfter));
        return res.status(429).json({
          error: "too_many_requests",
          message: "طلبات كثيرة جداً. حاول بعد قليل.",
          retryAfter,
        });
      }
      next();
    } catch (err) {
      console.warn("[rateLimit] limiter error, allowing request", err);
      next();
    }
  };
}

const apiMemory = memoryLimit({ max: 120, windowMs: 60_000, prefix: "api" });
const authMemory = memoryLimit({ max: 15, windowMs: 60_000, prefix: "auth" });

/** General API / tRPC: 120 req / min per IP (Redis when configured). */
export const apiRateLimit: RequestHandler = upstashOrMemory("api", apiMemory);

/** Auth-sensitive routes: 15 req / min per IP. */
export const authRateLimit: RequestHandler = upstashOrMemory("auth", authMemory);
