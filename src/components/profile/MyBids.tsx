"use client";

import Link from "next/link";
import Image from "next/image";
import type { Bid, Auction } from "@/types";
import { formatSol, formatWalletAddress } from "@/lib/utils/format";
import { formatDate, formatTimeRemaining } from "@/lib/utils/time";
import { AuctionStatusBadge } from "@/components/auction/AuctionStatus";

interface BidWithAuction extends Bid {
  auction?: Pick<
    Auction,
    "id" | "title" | "image_url" | "status" | "end_time" | "winning_bid" | "winner_id"
  >;
}

interface MyBidsProps {
  bids: BidWithAuction[];
  userId: string;
  isLoading?: boolean;
}

export function MyBids({ bids, userId, isLoading }: MyBidsProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-24 bg-gray-100 rounded-card animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (bids.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">No bids placed yet.</div>
    );
  }

  return (
    <div className="space-y-4">
      {bids.map((bid) => {
        const isWinner =
          bid.auction?.winner_id === userId &&
          bid.auction?.status === "completed";
        const isHighestBid =
          bid.auction?.winning_bid && bid.amount >= bid.auction.winning_bid;

        return (
          <Link
            key={bid.id}
            href={`/auction/${bid.auction_id}`}
            className="flex items-center gap-4 p-4 bg-gray-50 rounded-card hover:bg-gray-100 transition-colors"
          >
            {/* Thumbnail */}
            <div className="relative w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
              {bid.auction?.image_url ? (
                <Image
                  src={bid.auction.image_url}
                  alt={bid.auction.title || "Auction"}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-xs">
                  No img
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium truncate">
                  {bid.auction?.title || "Unknown Auction"}
                </h3>
                {bid.auction?.status && (
                  <AuctionStatusBadge status={bid.auction.status} />
                )}
              </div>
              <p className="text-sm text-gray-500">
                Bid placed {formatDate(bid.created_at)}
              </p>
            </div>

            {/* Bid Amount */}
            <div className="text-right flex-shrink-0">
              <p className="font-semibold">{formatSol(bid.amount)}</p>
              {isWinner && (
                <span className="text-xs text-green-600 font-medium">Won!</span>
              )}
              {!isWinner && bid.is_top_3 && (
                <span className="text-xs text-accent font-medium">Top 3</span>
              )}
              {!isWinner && !bid.is_top_3 && bid.outbid_at && (
                <span className="text-xs text-gray-400">Outbid</span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
