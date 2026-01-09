"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useEffect, useState } from "react";

export function BalanceDisplay() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!publicKey) {
      setBalance(null);
      return;
    }

    const fetchBalance = async () => {
      try {
        const bal = await connection.getBalance(publicKey);
        setBalance(bal / LAMPORTS_PER_SOL);
      } catch (error) {
        console.error("Failed to fetch balance:", error);
        setBalance(null);
      }
    };

    fetchBalance();

    // Subscribe to balance changes
    const subscriptionId = connection.onAccountChange(publicKey, (account) => {
      setBalance(account.lamports / LAMPORTS_PER_SOL);
    });

    return () => {
      connection.removeAccountChangeListener(subscriptionId);
    };
  }, [connection, publicKey]);

  if (balance === null) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-bg-elevated rounded-button border border-border-subtle shadow-sm">
      <div className="w-5 h-5 rounded-full bg-olive-muted flex items-center justify-center">
        <svg className="w-3 h-3 text-olive" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10" />
        </svg>
      </div>
      <span className="text-sm font-semibold text-text-primary">
        {balance.toFixed(2)}
      </span>
      <span className="text-xs text-text-muted font-medium">SOL</span>
    </div>
  );
}
