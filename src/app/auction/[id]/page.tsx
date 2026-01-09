"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import { useAuction } from "@/hooks/useAuction";
import { useAuth } from "@/hooks/useAuth";
import { AuctionDetail } from "@/components/auction/AuctionDetail";

interface PageProps {
  params: { id: string };
}

export default function AuctionPage({ params }: PageProps) {
  const { publicKey } = useWallet();
  const { isAuthenticated } = useAuth();
  const { auction, isLoading, error, refetch } = useAuction(params.id);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            <div className="aspect-square bg-gray-200 rounded-card" />
            <div className="space-y-6">
              <div className="h-10 bg-gray-200 rounded w-3/4" />
              <div className="h-6 bg-gray-200 rounded w-1/2" />
              <div className="h-64 bg-gray-200 rounded-card" />
              <div className="h-48 bg-gray-200 rounded-card" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !auction) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Auction Not Found</h1>
        <p className="text-gray-600 mb-8">
          {error || "The auction you're looking for doesn't exist."}
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-accent text-white rounded-button font-medium hover:bg-accent-hover transition-colors"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to auctions
      </Link>

      <AuctionDetail
        auction={auction}
        currentUserWallet={publicKey?.toBase58()}
        isAuthenticated={isAuthenticated}
        onBidPlaced={refetch}
      />
    </div>
  );
}
