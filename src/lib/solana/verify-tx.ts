import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

const RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";

interface TransactionVerification {
  isValid: boolean;
  error?: string;
  amount?: number;
  sender?: string;
  recipient?: string;
}

export async function verifyPaymentTransaction(
  txSignature: string,
  expectedSender: string,
  expectedRecipient: string,
  expectedAmount: number
): Promise<TransactionVerification> {
  try {
    const connection = new Connection(RPC_URL, "confirmed");

    // Get transaction details
    const tx = await connection.getParsedTransaction(txSignature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) {
      return { isValid: false, error: "Transaction not found" };
    }

    // Check if transaction is finalized
    if (tx.meta?.err) {
      return { isValid: false, error: "Transaction failed" };
    }

    // Look for a SOL transfer instruction
    const instructions = tx.transaction.message.instructions;

    for (const instruction of instructions) {
      // Check if it's a system program transfer
      if (
        "parsed" in instruction &&
        instruction.program === "system" &&
        instruction.parsed?.type === "transfer"
      ) {
        const { source, destination, lamports } = instruction.parsed.info;

        // Verify sender
        if (source !== expectedSender) {
          continue;
        }

        // Verify recipient
        if (destination !== expectedRecipient) {
          continue;
        }

        // Verify amount (allow small variance for transaction fees)
        const tolerance = 0.01 * LAMPORTS_PER_SOL; // 0.01 SOL tolerance
        if (Math.abs(lamports - expectedAmount) > tolerance) {
          continue;
        }

        return {
          isValid: true,
          amount: lamports,
          sender: source,
          recipient: destination,
        };
      }
    }

    // Check account balance changes as fallback
    if (tx.meta?.preBalances && tx.meta?.postBalances) {
      const accounts = tx.transaction.message.accountKeys;

      for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];
        const pubkey =
          typeof account === "string" ? account : account.pubkey.toBase58();
        const preBalance = tx.meta.preBalances[i];
        const postBalance = tx.meta.postBalances[i];
        const change = postBalance - preBalance;

        // Found the recipient receiving funds
        if (pubkey === expectedRecipient && change > 0) {
          // Verify it's close to expected amount
          const tolerance = 0.01 * LAMPORTS_PER_SOL;
          if (Math.abs(change - expectedAmount) <= tolerance) {
            return {
              isValid: true,
              amount: change,
              recipient: expectedRecipient,
            };
          }
        }
      }
    }

    return {
      isValid: false,
      error: "No matching transfer found in transaction",
    };
  } catch (error) {
    console.error("Transaction verification error:", error);
    return {
      isValid: false,
      error: error instanceof Error ? error.message : "Verification failed",
    };
  }
}

export async function waitForTransactionConfirmation(
  txSignature: string,
  timeoutMs: number = 60000
): Promise<boolean> {
  const connection = new Connection(RPC_URL, "confirmed");

  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      const status = await connection.getSignatureStatus(txSignature);

      if (status?.value?.confirmationStatus === "finalized") {
        return true;
      }

      if (status?.value?.err) {
        return false;
      }

      // Wait before checking again
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error("Error checking transaction status:", error);
    }
  }

  return false;
}
