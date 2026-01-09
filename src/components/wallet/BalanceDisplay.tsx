"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useEffect, useState } from "react";

export function BalanceDisplay() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!publicKey) {
      setBalance(null);
      return;
    }

    let isMounted = true;
    let subscriptionId: number | undefined;

    const fetchBalance = async () => {
      setIsLoading(true);
      try {
        const bal = await connection.getBalance(publicKey);
        if (isMounted) {
          setBalance(bal / LAMPORTS_PER_SOL);
        }
      } catch (error) {
        console.error("Failed to fetch balance:", error);
        if (isMounted) {
          setBalance(0); // Show 0 on error rather than hiding
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchBalance();

    // Subscribe to balance changes
    try {
      subscriptionId = connection.onAccountChange(publicKey, (account) => {
        if (isMounted) {
          setBalance(account.lamports / LAMPORTS_PER_SOL);
        }
      });
    } catch (error) {
      console.error("Failed to subscribe to balance changes:", error);
    }

    return () => {
      isMounted = false;
      if (subscriptionId !== undefined) {
        connection.removeAccountChangeListener(subscriptionId).catch(() => {});
      }
    };
  }, [connection, publicKey]);

  if (!publicKey) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-bg-elevated rounded-button border border-border-subtle shadow-sm">
      <div className="w-2 h-2 rounded-full bg-olive" />
      <span className="text-sm font-semibold text-text-primary">
        {isLoading ? "..." : (balance ?? 0).toFixed(2)}
      </span>
      <span className="text-xs text-text-muted font-medium">SOL</span>
    </div>
  );
}
