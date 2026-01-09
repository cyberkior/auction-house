"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import type { User, Auction, Bid } from "@/types";
import { formatWalletAddress } from "@/lib/utils/format";
import { UserStats } from "@/components/profile/UserStats";
import { MyAuctions } from "@/components/profile/MyAuctions";
import { MyBids } from "@/components/profile/MyBids";

interface PageProps {
  params: { address: string };
}

interface ProfileData {
  user: User;
  stats: {
    totalAuctions: number;
    completedAuctions: number;
    totalBids: number;
    wonAuctions: number;
  };
  createdAuctions: Auction[];
  bids: (Bid & { auction?: Auction })[];
}

type Tab = "auctions" | "bids";

export default function ProfilePage({ params }: PageProps) {
  const { publicKey } = useWallet();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("auctions");

  const isOwnProfile = publicKey?.toBase58() === params.address;

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/${params.address}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("User not found");
        }
        throw new Error("Failed to load profile");
      }

      const data = await response.json();
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [params.address]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="animate-pulse">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-20 h-20 bg-gray-200 rounded-full" />
            <div className="space-y-2">
              <div className="h-8 bg-gray-200 rounded w-48" />
              <div className="h-4 bg-gray-200 rounded w-32" />
            </div>
          </div>
          <div className="grid grid-cols-5 gap-4 mb-8">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-card" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Profile Not Found</h1>
        <p className="text-gray-600 mb-8">{error}</p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-accent text-white rounded-button font-medium hover:bg-accent-hover transition-colors"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  const { user, stats, createdAuctions, bids } = profile;

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center">
          <span className="text-3xl font-bold text-accent">
            {(user.username || user.wallet_address)[0].toUpperCase()}
          </span>
        </div>
        <div>
          <h1 className="text-2xl font-bold">
            {user.username || formatWalletAddress(user.wallet_address)}
          </h1>
          <p className="text-gray-500 font-mono text-sm">
            {formatWalletAddress(user.wallet_address)}
          </p>
          {user.is_restricted && (
            <span className="inline-block mt-1 px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full">
              Restricted
            </span>
          )}
        </div>
        {isOwnProfile && (
          <Link
            href="/profile"
            className="ml-auto px-4 py-2 bg-gray-100 text-gray-700 rounded-button font-medium hover:bg-gray-200 transition-colors"
          >
            Edit Profile
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="mb-8">
        <UserStats
          totalAuctions={stats.totalAuctions}
          completedAuctions={stats.completedAuctions}
          totalBids={stats.totalBids}
          wonAuctions={stats.wonAuctions}
          credits={user.credits}
          strikes={user.strikes}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("auctions")}
          className={`pb-3 px-1 font-medium text-sm transition-colors ${
            activeTab === "auctions"
              ? "text-accent border-b-2 border-accent"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Auctions ({createdAuctions.length})
        </button>
        <button
          onClick={() => setActiveTab("bids")}
          className={`pb-3 px-1 font-medium text-sm transition-colors ${
            activeTab === "bids"
              ? "text-accent border-b-2 border-accent"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Bids ({bids.length})
        </button>
      </div>

      {/* Content */}
      {activeTab === "auctions" && (
        <MyAuctions auctions={createdAuctions} />
      )}

      {activeTab === "bids" && <MyBids bids={bids} userId={user.id} />}
    </div>
  );
}
