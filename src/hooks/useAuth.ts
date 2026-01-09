"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useCallback, useEffect, useState } from "react";
import type { User } from "@/types";

const AUTH_MESSAGE_PREFIX = "Sign in to Art Auction";

export function useAuth() {
  const { publicKey, signMessage, connected, disconnect } = useWallet();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("sessionToken");
    const storedUser = localStorage.getItem("user");
    const storedWallet = localStorage.getItem("walletAddress");

    if (
      storedToken &&
      storedUser &&
      storedWallet &&
      publicKey?.toBase58() === storedWallet
    ) {
      setSessionToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
  }, [publicKey]);

  // Clear session when wallet disconnects
  useEffect(() => {
    if (!connected) {
      setUser(null);
      setSessionToken(null);
      localStorage.removeItem("sessionToken");
      localStorage.removeItem("user");
      localStorage.removeItem("walletAddress");
    }
  }, [connected]);

  const signIn = useCallback(async () => {
    if (!publicKey || !signMessage) {
      throw new Error("Wallet not connected");
    }

    setIsAuthenticating(true);

    try {
      const timestamp = Date.now();
      const message = `${AUTH_MESSAGE_PREFIX}\nTimestamp: ${timestamp}`;
      const messageBytes = new TextEncoder().encode(message);

      // Request signature from wallet
      const signature = await signMessage(messageBytes);

      // Convert signature to base58
      const bs58 = await import("bs58");
      const signatureBase58 = bs58.default.encode(signature);

      // Verify with backend
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: publicKey.toBase58(),
          signature: signatureBase58,
          message,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Authentication failed");
      }

      const data = await response.json();

      // Store session
      setUser(data.user);
      setSessionToken(data.sessionToken);
      localStorage.setItem("sessionToken", data.sessionToken);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("walletAddress", publicKey.toBase58());

      return data.user;
    } finally {
      setIsAuthenticating(false);
    }
  }, [publicKey, signMessage]);

  const signOut = useCallback(async () => {
    setUser(null);
    setSessionToken(null);
    localStorage.removeItem("sessionToken");
    localStorage.removeItem("user");
    localStorage.removeItem("walletAddress");
    await disconnect();
  }, [disconnect]);

  return {
    user,
    sessionToken,
    isAuthenticated: !!user && !!sessionToken,
    isAuthenticating,
    signIn,
    signOut,
  };
}
