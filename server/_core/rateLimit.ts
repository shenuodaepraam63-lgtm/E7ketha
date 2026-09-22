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
  max: number;
  windowMs: number;
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

type RedisClient = {
  incr: (key: string) => Promise<number>;
  expire: (key: string, seconds: number) => Promise<unknown>;
  ttl: (key: string) => Promise<number>;
};

let redisReady: Promise<RedisClient | null> | null = null;

async function getRedis(): Promise<RedisClient | null> {
  if (redisReady) return redisReady;
  redisReady = (async () => {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) return null;
    try {
      const { Redis } = await import("@upstash/redis");
      return new Redis({ url, token }) as unknown as RedisClient;
    } catch (err) {
      console.warn("[rateLimit] Upstash Redis unavailable, using in-memory fallback", err);
      return null;
    }
  })();
  return redisReady;
}

function redisOrMemory(config: LimitConfig, memory: RequestHandler): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const redis = await getRedis();
      if (!redis) return memory(req, res, next);

      const key = `e7ketha:rl:${config.prefix}:${clientIp(req)}`;
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, Math.ceil(config.windowMs / 1000));
      }
      let ttl = await redis.ttl(key);
      if (ttl < 0) ttl = Math.ceil(config.windowMs / 1000);

      const remaining = Math.max(0, config.max - count);
      const reset = Math.ceil(Date.now() / 1000) + ttl;
      res.setHeader("X-RateLimit-Limit", String(config.max));
      res.setHeader("X-RateLimit-Remaining", String(remaining));
      res.setHeader("X-RateLimit-Reset", String(reset));

      if (count > config.max) {
        res.setHeader("Retry-After", String(Math.max(1, ttl)));
        return res.status(429).json({
          error: "too_many_requests",
          message: "طلبات كثيرة جداً. حاول بعد قليل.",
          retryAfter: Math.max(1, ttl),
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
export const apiRateLimit: RequestHandler = redisOrMemory(
  { max: 120, windowMs: 60_000, prefix: "api" },
  apiMemory,
);

/** Auth-sensitive routes: 15 req / min per IP. */
export const authRateLimit: RequestHandler = redisOrMemory(
  { max: 15, windowMs: 60_000, prefix: "auth" },
  authMemory,
);
