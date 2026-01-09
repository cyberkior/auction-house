"use client";

import Image from "next/image";
import Link from "next/link";
import type { Auction } from "@/types";
import { formatSol, formatWalletAddress } from "@/lib/utils/format";
import { AuctionStatusBadge } from "./AuctionStatus";
import { CountdownTimer } from "./CountdownTimer";

interface AuctionCardProps {
  auction: Auction;
}

export function AuctionCard({ auction }: AuctionCardProps) {
  const currentPrice = auction.highest_bid || auction.reserve_price;
  const showCountdown = auction.status === "current";

  return (
    <Link href={`/auction/${auction.id}`} className="group block">
      <article className="bg-bg-card rounded-card overflow-hidden border border-border-subtle hover:border-accent/30 hover-lift shadow-card">
        {/* Image Container */}
        <div className="relative aspect-[4/5] bg-bg-secondary overflow-hidden">
          {auction.image_url ? (
            <Image
              src={auction.image_url}
              alt={auction.title}
              fill
              className="object-cover img-zoom"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-bg-secondary to-bg-primary">
              <div className="w-20 h-20 rounded-2xl bg-bg-elevated flex items-center justify-center border border-border-subtle">
                <svg className="w-10 h-10 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          )}

          {/* Status Badge */}
          <div className="absolute top-4 left-4">
            <AuctionStatusBadge status={auction.status} />
          </div>

          {/* Countdown (for live auctions) */}
          {showCountdown && (
            <div className="absolute bottom-4 right-4 bg-bg-elevated/95 backdrop-blur-sm px-3 py-2 rounded-button border border-border-subtle shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                <span className="w-2 h-2 bg-status-live rounded-full animate-pulse-glow" />
                <CountdownTimer endTime={auction.end_time} />
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Title */}
          <h3 className="font-display text-lg text-text-primary truncate group-hover:text-accent transition-colors">
            {auction.title}
          </h3>

          {/* Creator */}
          <p className="text-sm text-text-muted mt-1.5">
            by{" "}
            <span className="text-text-secondary font-medium">
              {auction.creator?.username ||
                formatWalletAddress(auction.creator?.wallet_address || "")}
            </span>
          </p>

          {/* Price & Stats */}
          <div className="flex items-end justify-between mt-5 pt-4 border-t border-border-subtle">
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wider font-medium mb-1.5">
                {auction.highest_bid ? "Current Bid" : "Reserve"}
              </p>
              <p className="font-display text-xl text-text-primary">
                {currentPrice > 0 ? (
                  <span className="text-accent">{formatSol(currentPrice)}</span>
                ) : (
                  <span className="text-text-muted text-base">No reserve</span>
                )}
              </p>
            </div>

            {auction.bids_count !== undefined && auction.bids_count > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-bg-secondary rounded-button">
                <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="text-sm font-medium text-text-secondary">
                  {auction.bids_count}
                </span>
              </div>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}

// Skeleton loader for auction cards
export function AuctionCardSkeleton() {
  return (
    <div className="bg-bg-card rounded-card overflow-hidden border border-border-subtle shadow-card">
      <div className="aspect-[4/5] animate-shimmer" />
      <div className="p-5">
        <div className="h-6 animate-shimmer rounded-lg w-3/4" />
        <div className="h-4 animate-shimmer rounded-lg w-1/2 mt-2" />
        <div className="flex justify-between mt-5 pt-4 border-t border-border-subtle">
          <div>
            <div className="h-3 animate-shimmer rounded w-16 mb-2" />
            <div className="h-7 animate-shimmer rounded-lg w-24" />
          </div>
          <div className="h-8 animate-shimmer rounded-button w-14" />
        </div>
      </div>
    </div>
  );
}
