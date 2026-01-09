"use client";

import type { Auction } from "@/types";
import { AuctionCard, AuctionCardSkeleton } from "@/components/auction/AuctionCard";

interface MyAuctionsProps {
  auctions: Auction[];
  isLoading?: boolean;
}

export function MyAuctions({ auctions, isLoading }: MyAuctionsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <AuctionCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (auctions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No auctions created yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {auctions.map((auction) => (
        <AuctionCard key={auction.id} auction={auction} />
      ))}
    </div>
  );
}
