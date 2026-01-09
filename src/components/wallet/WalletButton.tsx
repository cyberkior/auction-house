"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export function WalletButton() {
  const { connected, publicKey } = useWallet();

  return (
    <div className="wallet-button-wrapper">
      <WalletMultiButton
        style={{
          backgroundColor: connected ? "#1a1a2e" : "#9945FF",
          borderRadius: "9999px",
          height: "40px",
          padding: "0 20px",
          fontSize: "14px",
          fontWeight: 500,
        }}
      />
    </div>
  );
}
