"use client";

import Image from "next/image";
import Link from "next/link";
import type { Auction, Bid } from "@/types";
import { formatWalletAddress } from "@/lib/utils/format";
import { formatDate } from "@/lib/utils/time";
import { BidPanel } from "./BidPanel";
import { BidHistory } from "./BidHistory";
import { ReportButton } from "./ReportButton";

interface AuctionDetailProps {
  auction: Auction & { bids?: Bid[] };
  currentUserWallet?: string;
  isAuthenticated?: boolean;
  onBidPlaced: () => void;
}

export function AuctionDetail({
  auction,
  currentUserWallet,
  isAuthenticated = false,
  onBidPlaced,
}: AuctionDetailProps) {
  const bids = auction.bids || [];
  const highestBid = bids.length > 0 ? Math.max(...bids.map((b) => b.amount)) : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
      {/* Left: Image */}
      <div className="space-y-4">
        <div className="relative aspect-square bg-gray-100 rounded-card overflow-hidden">
          {auction.image_url ? (
            <Image
              src={auction.image_url}
              alt={auction.title}
              fill
              className="object-contain"
              priority
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              No image
            </div>
          )}
        </div>

        {/* Description */}
        <div className="bg-gray-50 rounded-card p-6">
          <h2 className="font-semibold mb-3">Description</h2>
          <p className="text-gray-600 whitespace-pre-wrap">
            {auction.description || "No description provided."}
          </p>

          {/* Tags */}
          {auction.tags && auction.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {auction.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-white rounded-full text-sm text-gray-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Info & Bidding */}
      <div className="space-y-6">
        {/* Title & Creator */}
        <div>
          <h1 className="text-3xl font-bold mb-2">{auction.title}</h1>
          <Link
            href={`/profile/${auction.creator?.wallet_address}`}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center">
              <span className="text-accent text-sm font-medium">
                {(auction.creator?.username || auction.creator?.wallet_address || "?")[0].toUpperCase()}
              </span>
            </div>
            <span>
              {auction.creator?.username ||
                formatWalletAddress(auction.creator?.wallet_address || "")}
            </span>
            {auction.creator?.credits !== undefined && (
              <span className="text-sm text-gray-400">
                ({auction.creator.credits} credits)
              </span>
            )}
          </Link>
        </div>

        {/* Bid Panel */}
        <BidPanel
          auction={auction}
          highestBid={highestBid}
          onBidPlaced={onBidPlaced}
        />

        {/* Auction Info */}
        <div className="bg-gray-50 rounded-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Auction Details</h2>
            <ReportButton
              auctionId={auction.id}
              walletAddress={currentUserWallet || null}
              isAuthenticated={isAuthenticated}
            />
          </div>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Start Time</dt>
              <dd>{formatDate(auction.start_time)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">End Time</dt>
              <dd>{formatDate(auction.end_time)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Min Increment</dt>
              <dd>{(auction.min_bid_increment / 1e9).toFixed(4)} SOL</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Platform Fee</dt>
              <dd>10%</dd>
            </div>
          </dl>
        </div>

        {/* Bid History */}
        <div className="bg-gray-50 rounded-card p-6">
          <h2 className="font-semibold mb-4">
            Bid History ({bids.length})
          </h2>
          <BidHistory bids={bids} currentUserWallet={currentUserWallet} />
        </div>
      </div>
    </div>
  );
}
