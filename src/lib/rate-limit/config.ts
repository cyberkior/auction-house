import { RateLimitTier } from "./limiter";

export const ROUTE_RATE_LIMITS: Record<string, RateLimitTier> = {
  // Auth - strict
  "/api/auth": "strict",

  // Write operations - moderate
  "/api/auctions": "moderate",
  "/api/auctions/[id]": "moderate",
  "/api/auctions/[id]/bid": "moderate",
  "/api/bids/[id]": "moderate",
  "/api/reports": "moderate",
  "/api/upload": "moderate",
  "/api/settlements/[id]/verify": "moderate",
  "/api/users/[address]": "moderate",
  "/api/notifications": "moderate",

  // Read operations - lenient
  "/api/tags": "lenient",
  "/api/settlements/auction/[id]": "lenient",
  "/api/settlements/cascade": "lenient",
};
