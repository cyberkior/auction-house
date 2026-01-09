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

// Test mode wrapper component
const TestModeProvider: FC<Props & { endpoint: string }> = ({ children, endpoint }) => {
  const wallets = useMemo(() => [new MockWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint} config={{ commitment: "confirmed" }}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};

TestModeProvider.displayName = "TestModeProvider";

export const WalletProvider: FC<Props> = ({ children }) => {
  const isTestMode =
    typeof window !== "undefined" &&
    // eslint-disable-next-line
    (window as any).__WALLET_ADAPTER_OVERRIDE__;

  const endpoint = useMemo(() => {
    if (isTestMode) {
      return "mock://test";
    }
    return process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl("devnet");
  }, [isTestMode]);

  const wallets = useMemo(() => {
    if (isTestMode) {
      return [new MockWalletAdapter()];
    }
    return [new PhantomWalletAdapter(), new SolflareWalletAdapter()];
  }, [isTestMode]);

  if (isTestMode) {
    return <TestModeProvider endpoint={endpoint}>{children}</TestModeProvider>;
  }

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};
