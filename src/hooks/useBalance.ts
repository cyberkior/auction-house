"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useEffect, useState, useCallback } from "react";

interface UseBalanceReturn {
  balance: number | null; // in lamports
  balanceSol: number | null;
  isLoading: boolean;
  refetch: () => void;
}

export function useBalance(): UseBalanceReturn {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBalance = useCallback(async () => {
    if (!publicKey) {
      setBalance(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const bal = await connection.getBalance(publicKey);
      setBalance(bal);
    } catch (error) {
      console.error("Failed to fetch balance:", error);
      setBalance(null);
    } finally {
      setIsLoading(false);
    }
  }, [connection, publicKey]);

  useEffect(() => {
    fetchBalance();

    if (!publicKey) return;

    // Subscribe to balance changes
    const subscriptionId = connection.onAccountChange(publicKey, (account) => {
      setBalance(account.lamports);
    });

    return () => {
      connection.removeAccountChangeListener(subscriptionId);
    };
  }, [connection, publicKey, fetchBalance]);

  return {
    balance,
    balanceSol: balance !== null ? balance / LAMPORTS_PER_SOL : null,
    isLoading,
    refetch: fetchBalance,
  };
}
