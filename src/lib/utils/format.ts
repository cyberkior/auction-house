import { LAMPORTS_PER_SOL } from "@/types";

export function formatSol(lamports: number): string {
  const sol = lamports / LAMPORTS_PER_SOL;
  if (sol >= 1000) {
    return `${(sol / 1000).toFixed(1)}K SOL`;
  }
  if (sol >= 1) {
    return `${sol.toFixed(2)} SOL`;
  }
  if (sol >= 0.01) {
    return `${sol.toFixed(4)} SOL`;
  }
  return `${sol.toFixed(6)} SOL`;
}

export function formatWalletAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}
