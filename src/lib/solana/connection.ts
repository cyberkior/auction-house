import { Connection, clusterApiUrl } from "@solana/web3.js";

const rpcUrl =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl("devnet");

export const connection = new Connection(rpcUrl, "confirmed");

export function getNetwork(): "devnet" | "mainnet-beta" | "testnet" {
  const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet";
  if (
    network === "devnet" ||
    network === "mainnet-beta" ||
    network === "testnet"
  ) {
    return network;
  }
  return "devnet";
}
