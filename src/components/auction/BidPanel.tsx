"use client";

import { useState, useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import type { Auction, Bid } from "@/types";
import { formatSol, formatNumber } from "@/lib/utils/format";
import { lamportsToSol, solToLamports, LAMPORTS_PER_SOL } from "@/types";
import { useBalance } from "@/hooks/useBalance";
import { useAuth } from "@/hooks/useAuth";
import { CountdownTimer } from "./CountdownTimer";
import { AuctionStatusBadge } from "./AuctionStatus";

interface BidPanelProps {
  auction: Auction;
  highestBid: number | null;
  onBidPlaced: () => void;
}

export function BidPanel({ auction, highestBid, onBidPlaced }: BidPanelProps) {
  const { connected, publicKey } = useWallet();
  const { user, isAuthenticated, signIn, isAuthenticating } = useAuth();
  const { balance, balanceSol } = useBalance();

  const [bidAmount, setBidAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate minimum bid
  const minimumBid = useMemo(() => {
    const current = highestBid || auction.reserve_price;
    return current + auction.min_bid_increment;
  }, [highestBid, auction.reserve_price, auction.min_bid_increment]);

  const minimumBidSol = lamportsToSol(minimumBid);

  // Parse bid amount
  const bidLamports = useMemo(() => {
    const sol = parseFloat(bidAmount);
    if (isNaN(sol) || sol <= 0) return 0;
    return solToLamports(sol);
  }, [bidAmount]);

  // Validation
  const canBid = useMemo(() => {
    if (auction.status !== "current") return false;
    if (!connected || !isAuthenticated) return false;
    if (bidLamports < minimumBid) return false;
    if (balance !== null && bidLamports > balance) return false;
    return true;
  }, [
    auction.status,
    connected,
    isAuthenticated,
    bidLamports,
    minimumBid,
    balance,
  ]);

  const handleBid = async () => {
    if (!canBid || !user) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/auctions/${auction.id}/bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: user.wallet_address,
          amount: bidLamports,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to place bid");
      }

      setBidAmount("");
      onBidPlaced();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to place bid");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLive = auction.status === "current";
  const isEnded = ["past", "settling", "completed", "failed"].includes(
    auction.status
  );

  return (
    <div className="bg-white rounded-card border border-gray-200 p-6">
      {/* Status & Timer */}
      <div className="flex items-center justify-between mb-6">
        <AuctionStatusBadge status={auction.status} />
        {isLive && (
          <div className="text-right">
            <p className="text-xs text-gray-500 mb-1">Ends in</p>
            <CountdownTimer
              endTime={auction.end_time}
              className="text-xl font-bold"
            />
          </div>
        )}
        {auction.status === "upcoming" && (
          <div className="text-right">
            <p className="text-xs text-gray-500 mb-1">Starts in</p>
            <CountdownTimer
              endTime={auction.start_time}
              className="text-xl font-bold"
            />
          </div>
        )}
      </div>

      {/* Current Bid */}
      <div className="mb-6">
        <p className="text-sm text-gray-500 mb-1">
          {highestBid ? "Current Bid" : "Reserve Price"}
        </p>
        <p className="text-3xl font-bold">
          {highestBid
            ? formatSol(highestBid)
            : auction.reserve_price > 0
            ? formatSol(auction.reserve_price)
            : "No reserve"}
        </p>
      </div>

      {/* Bid Input */}
      {isLive && (
        <>
          {!connected ? (
            <p className="text-center text-gray-500 py-4">
              Connect your wallet to bid
            </p>
          ) : !isAuthenticated ? (
            <button
              onClick={signIn}
              disabled={isAuthenticating}
              className="w-full py-3 bg-accent text-white rounded-button font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {isAuthenticating ? "Signing..." : "Sign In to Bid"}
            </button>
          ) : (
            <div className="space-y-4">
              {/* Balance */}
              {balanceSol !== null && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Your Balance</span>
                  <span className="font-medium">{balanceSol.toFixed(4)} SOL</span>
                </div>
              )}

              {/* Min Bid Info */}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Minimum Bid</span>
                <span className="font-medium">{minimumBidSol.toFixed(4)} SOL</span>
              </div>

              {/* Input */}
              <div className="relative">
                <input
                  type="number"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder={minimumBidSol.toFixed(4)}
                  step="0.001"
                  min={minimumBidSol}
                  className="w-full px-4 py-3 pr-16 border border-gray-200 rounded-card focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-lg"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                  SOL
                </span>
              </div>

              {/* Error */}
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}

              {/* Submit */}
              <button
                onClick={handleBid}
                disabled={!canBid || isSubmitting}
                className="w-full py-3 bg-accent text-white rounded-button font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Placing Bid..." : "Place Bid"}
              </button>

              {/* Warning */}
              <p className="text-xs text-gray-400 text-center">
                By bidding, you commit to pay if you win. Top 3 bidders cannot
                withdraw funds until auction ends.
              </p>
            </div>
          )}
        </>
      )}

      {/* Ended State */}
      {isEnded && (
        <div className="text-center py-4">
          <p className="text-gray-500">
            {auction.winner_id
              ? "This auction has ended"
              : "This auction ended with no winner"}
          </p>
        </div>
      )}

      {/* Upcoming State */}
      {auction.status === "upcoming" && (
        <div className="text-center py-4">
          <p className="text-gray-500">
            Bidding will open when the auction starts
          </p>
        </div>
      )}
    </div>
  );
}
