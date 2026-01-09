import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { RateLimitError } from "@/lib/errors/classes";

export type RateLimitTier = "strict" | "moderate" | "lenient";

// Initialize Redis client (lazy - only connects when used)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Rate limiters for each tier using sliding window algorithm
const limiters: Record<RateLimitTier, Ratelimit> = {
  strict: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "1 m"), // 5 req/min
    prefix: "ratelimit:strict",
    analytics: true,
  }),
  moderate: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, "1 m"), // 30 req/min
    prefix: "ratelimit:moderate",
    analytics: true,
  }),
  lenient: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, "1 m"), // 100 req/min
    prefix: "ratelimit:lenient",
    analytics: true,
  }),
};

export async function rateLimit(
  identifier: string,
  tier: RateLimitTier = "moderate"
): Promise<void> {
  const limiter = limiters[tier];
  const { success, reset } = await limiter.limit(identifier);

  if (!success) {
    const retryAfter = Math.ceil((reset - Date.now()) / 1000);
    throw new RateLimitError(
      `Rate limit exceeded. Please try again later.`,
      retryAfter > 0 ? retryAfter : 60
    );
  }
}

export function getRateLimitIdentifier(request: Request): string {
  // Use wallet address if available, fall back to IP
  const walletAddress = request.headers.get("x-wallet-address");
  if (walletAddress) return `wallet:${walletAddress}`;

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    "unknown";
  return `ip:${ip}`;
}
