"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import type { User, Auction, Bid } from "@/types";
import { formatWalletAddress } from "@/lib/utils/format";
import { useAuth } from "@/hooks/useAuth";
import { UserStats } from "@/components/profile/UserStats";
import { MyAuctions } from "@/components/profile/MyAuctions";
import { MyBids } from "@/components/profile/MyBids";

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

type Tab = "auctions" | "bids" | "settings";

export default function OwnProfilePage() {
  const router = useRouter();
  const { publicKey, connected } = useWallet();
  const { isAuthenticated, signIn, isAuthenticating } = useAuth();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("auctions");

  // Edit state
  const [editUsername, setEditUsername] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!publicKey) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/users/${publicKey.toBase58()}`);
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setEditUsername(data.user.username || "");
      }
    } catch (err) {
      console.error("Failed to fetch profile:", err);
    } finally {
      setIsLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    if (connected && publicKey) {
      fetchProfile();
    } else {
      setIsLoading(false);
    }
  }, [connected, publicKey, fetchProfile]);

  const handleSaveProfile = async () => {
    if (!publicKey) return;

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const response = await fetch(`/api/users/${publicKey.toBase58()}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: editUsername || null,
          requesterWallet: publicKey.toBase58(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save");
      }

      setSaveSuccess(true);
      fetchProfile();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  // Not connected
  if (!connected) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Your Profile</h1>
        <p className="text-gray-600 mb-8">
          Connect your wallet to view your profile.
        </p>
      </div>
    );
  }

  // Loading
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
        </div>
      </div>
    );
  }

  // No profile (need to sign in to create)
  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Your Profile</h1>
        <p className="text-gray-600 mb-8">
          Sign in to create your profile.
        </p>
        <button
          onClick={signIn}
          disabled={isAuthenticating}
          className="px-8 py-3 bg-accent text-white rounded-button font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          {isAuthenticating ? "Signing..." : "Sign In"}
        </button>
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
        <div className="flex-1">
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
        <Link
          href={`/profile/${user.wallet_address}`}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-button font-medium hover:bg-gray-200 transition-colors"
        >
          View Public Profile
        </Link>
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
          My Auctions ({createdAuctions.length})
        </button>
        <button
          onClick={() => setActiveTab("bids")}
          className={`pb-3 px-1 font-medium text-sm transition-colors ${
            activeTab === "bids"
              ? "text-accent border-b-2 border-accent"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          My Bids ({bids.length})
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`pb-3 px-1 font-medium text-sm transition-colors ${
            activeTab === "settings"
              ? "text-accent border-b-2 border-accent"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Settings
        </button>
      </div>

      {/* Content */}
      {activeTab === "auctions" && (
        <MyAuctions auctions={createdAuctions} />
      )}

      {activeTab === "bids" && <MyBids bids={bids} userId={user.id} />}

      {activeTab === "settings" && (
        <div className="max-w-md">
          <h2 className="font-semibold mb-4">Profile Settings</h2>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Display Name
              </label>
              <input
                type="text"
                id="username"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                placeholder="Enter a display name"
                maxLength={30}
                className="w-full px-4 py-3 border border-gray-200 rounded-card focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              />
              <p className="text-xs text-gray-400 mt-1">
                Leave empty to show your wallet address
              </p>
            </div>

            {saveError && (
              <p className="text-sm text-red-600">{saveError}</p>
            )}

            {saveSuccess && (
              <p className="text-sm text-green-600">Profile saved!</p>
            )}

            <button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="px-6 py-2 bg-accent text-white rounded-button font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
