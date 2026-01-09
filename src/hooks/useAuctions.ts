"use client";

import { useState, useEffect, useCallback } from "react";
import type { Auction, AuctionStatus } from "@/types";

interface UseAuctionsOptions {
  status?: AuctionStatus | "active";
  trending?: boolean;
  limit?: number;
  // Search and filter options
  query?: string;
  tags?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
}

interface UseAuctionsReturn {
  auctions: Auction[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  refetch: () => void;
}

export function useAuctions(options: UseAuctionsOptions = {}): UseAuctionsReturn {
  const {
    status,
    trending = false,
    limit = 20,
    query,
    tags,
    minPrice,
    maxPrice,
    sort,
  } = options;

  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchAuctions = useCallback(
    async (reset = false) => {
      setIsLoading(true);
      setError(null);

      const currentOffset = reset ? 0 : offset;

      try {
        const params = new URLSearchParams();
        if (status) params.set("status", status);
        if (trending) params.set("trending", "true");
        if (query) params.set("q", query);
        if (tags) params.set("tags", tags);
        if (minPrice) params.set("minPrice", minPrice);
        if (maxPrice) params.set("maxPrice", maxPrice);
        if (sort) params.set("sort", sort);
        params.set("limit", limit.toString());
        params.set("offset", currentOffset.toString());

        const response = await fetch(`/api/auctions?${params}`);

        if (!response.ok) {
          throw new Error("Failed to fetch auctions");
        }

        const data = await response.json();
        const newAuctions = data.auctions || [];

        if (reset) {
          setAuctions(newAuctions);
          setOffset(limit);
        } else {
          setAuctions((prev) => [...prev, ...newAuctions]);
          setOffset((prev) => prev + limit);
        }

        setHasMore(newAuctions.length === limit);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    },
    [status, trending, limit, offset]
  );

  // Initial fetch and refetch on filter changes
  useEffect(() => {
    fetchAuctions(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, trending, query, tags, minPrice, maxPrice, sort]);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchAuctions(false);
    }
  }, [isLoading, hasMore, fetchAuctions]);

  const refetch = useCallback(() => {
    setOffset(0);
    fetchAuctions(true);
  }, [fetchAuctions]);

  return {
    auctions,
    isLoading,
    error,
    hasMore,
    loadMore,
    refetch,
  };
}
