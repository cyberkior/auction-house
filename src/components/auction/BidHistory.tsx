"use client";

import type { Bid } from "@/types";
import { formatSol, formatWalletAddress } from "@/lib/utils/format";
import { formatDate } from "@/lib/utils/time";

interface BidHistoryProps {
  bids: Bid[];
  currentUserWallet?: string;
}

export function BidHistory({ bids, currentUserWallet }: BidHistoryProps) {
  if (bids.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No bids yet. Be the first to bid!
      </div>
    );
  }

  // Sort by amount descending
  const sortedBids = [...bids].sort((a, b) => b.amount - a.amount);

  return (
    <div className="space-y-2">
      {sortedBids.map((bid, index) => {
        const isTop3 = index < 3;
        const isCurrentUser =
          currentUserWallet &&
          bid.bidder?.wallet_address === currentUserWallet;

        return (
          <div
            key={bid.id}
            className={`flex items-center justify-between p-3 rounded-lg ${
              isTop3 ? "bg-accent/5 border border-accent/20" : "bg-gray-50"
            } ${isCurrentUser ? "ring-2 ring-accent" : ""}`}
          >
            <div className="flex items-center gap-3">
              {/* Rank */}
              <span
                className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                  index === 0
                    ? "bg-yellow-400 text-yellow-900"
                    : index === 1
                    ? "bg-gray-300 text-gray-700"
                    : index === 2
                    ? "bg-amber-600 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {index + 1}
              </span>

              {/* Bidder info */}
              <div>
                <p className="font-medium text-sm">
                  {bid.bidder?.username ||
                    formatWalletAddress(bid.bidder?.wallet_address || "")}
                  {isCurrentUser && (
                    <span className="ml-2 text-xs text-accent">(You)</span>
                  )}
                </p>
                <p className="text-xs text-gray-500">
                  {formatDate(bid.created_at)}
                </p>
              </div>
            </div>

            {/* Bid amount */}
            <div className="text-right">
              <p className="font-semibold">{formatSol(bid.amount)}</p>
              {isTop3 && (
                <p className="text-xs text-accent">Top 3</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
