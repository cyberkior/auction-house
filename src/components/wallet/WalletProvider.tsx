"use client";

import { FC, ReactNode, useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";
import { MockWalletAdapter } from "./MockWalletAdapter";

import "@solana/wallet-adapter-react-ui/styles.css";

interface Props {
  children: ReactNode;
}

export const WalletProvider: FC<Props> = ({ children }) => {
  const endpoint = useMemo(
    () =>
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl("devnet"),
    []
  );

  const wallets = useMemo(() => {
    // Check if mock wallet is configured (E2E tests)
    if (typeof window !== "undefined" && (window as any).__WALLET_ADAPTER_OVERRIDE__) {
      return [new MockWalletAdapter()];
    }
    return [new PhantomWalletAdapter(), new SolflareWalletAdapter()];
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};
