import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

const RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";

export async function getWalletBalance(walletAddress: string): Promise<number> {
  try {
    const connection = new Connection(RPC_URL, "confirmed");
    const publicKey = new PublicKey(walletAddress);
    const balance = await connection.getBalance(publicKey);
    return balance;
  } catch (error) {
    console.error("Failed to get wallet balance:", error);
    return 0;
  }
}

export async function getWalletBalanceSol(walletAddress: string): Promise<number> {
  const lamports = await getWalletBalance(walletAddress);
  return lamports / LAMPORTS_PER_SOL;
}

export async function hasMinimumBalance(
  walletAddress: string,
  requiredLamports: number
): Promise<boolean> {
  const balance = await getWalletBalance(walletAddress);
  return balance >= requiredLamports;
}
