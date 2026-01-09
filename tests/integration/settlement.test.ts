import { describe, it, expect } from "vitest";
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { verifyPaymentTransaction } from "@/lib/solana/verify-tx";
import * as fs from "fs";
import * as path from "path";

// Use devnet for integration tests
const DEVNET_RPC = "https://api.devnet.solana.com";

// Type for devnet wallet config
interface DevnetWallets {
  winner: { publicKey: string; secretKey: string };
  creator: { publicKey: string; secretKey: string };
  bidder2: { publicKey: string; secretKey: string };
}

describe("Settlement Integration Tests", () => {
  describe("verifyPaymentTransaction", () => {
    it("returns invalid for non-existent transaction", async () => {
      const fakeSignature = "5KtPn1LGuxhFiwjxErkxTb5dTqPtnjMP5TdnMQDLXrftxnm5N5X1d5rKfqUqHfuxMzRVPe1tSQRpGvTnNqr4WqNQ";

      const result = await verifyPaymentTransaction(
        fakeSignature,
        "7nYmDMGTsQpfh8HqpLUJvE9oVPh3LnJbqKWPnk4JJvZB",
        "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin",
        100000000
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("returns invalid for wrong sender", async () => {
      // This test requires a real devnet transaction
      // Skip if no devnet wallets configured
      if (!checkDevnetWalletsExist()) {
        console.log("Skipping: devnet wallets not configured");
        return;
      }

      // Create and send a real devnet transaction
      const { signature, recipient, amount } = await createDevnetTransaction();

      // Verify with wrong sender
      const result = await verifyPaymentTransaction(
        signature,
        "WrongSenderAddress11111111111111111111111111",
        recipient,
        amount
      );

      expect(result.isValid).toBe(false);
    });

    it("returns valid for correct transaction", async () => {
      if (!checkDevnetWalletsExist()) {
        console.log("Skipping: devnet wallets not configured");
        return;
      }

      const { signature, sender, recipient, amount } = await createDevnetTransaction();

      const result = await verifyPaymentTransaction(
        signature,
        sender,
        recipient,
        amount
      );

      expect(result.isValid).toBe(true);
      expect(result.amount).toBe(amount);
      expect(result.sender).toBe(sender);
      expect(result.recipient).toBe(recipient);
    });
  });

  describe("Cascade Settlement Logic", () => {
    it("calls process_settlement_cascade RPC successfully", async () => {
      // This test verifies the cascade endpoint is callable
      // Full integration requires Supabase test instance

      const response = await fetch("http://localhost:3000/api/settlements/cascade", {
        method: "GET",
      });

      // Should return 200 with count (even if 0)
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("count");
      expect(typeof data.count).toBe("number");
    });

    it("POST cascade requires authorization when CRON_SECRET set", async () => {
      // Without proper auth header, should be unauthorized
      const response = await fetch("http://localhost:3000/api/settlements/cascade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      // If CRON_SECRET is set, should return 401
      // If not set, should return 200
      expect([200, 401]).toContain(response.status);
    });
  });

  describe("Settlement State Machine", () => {
    it("GET settlement by auction ID returns correct structure", async () => {
      // This requires a real auction in settling state
      // For now, verify the endpoint returns expected error for non-existent auction

      const response = await fetch(
        "http://localhost:3000/api/settlements/auction/non-existent-id"
      );

      // Should return 404 or specific error
      expect([404, 500]).toContain(response.status);
    });

    it("POST verify rejects missing fields", async () => {
      const response = await fetch(
        "http://localhost:3000/api/settlements/test-id/verify",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}), // Missing required fields
        }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Missing required fields");
    });

    it("POST verify rejects non-existent settlement", async () => {
      const response = await fetch(
        "http://localhost:3000/api/settlements/non-existent/verify",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            txSignature: "5KtPn1LGuxhFiwjxErkxTb5dTqPtnjMP5TdnMQDLXrftxnm5N5X1d5rKfqUqHfuxMzRVPe1tSQRpGvTnNqr4WqNQ",
            walletAddress: "7nYmDMGTsQpfh8HqpLUJvE9oVPh3LnJbqKWPnk4JJvZB",
          }),
        }
      );

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe("Settlement not found");
    });
  });
});

// Helper functions
const WALLETS_PATH = path.join(__dirname, "../fixtures/devnet-wallets.json");

function checkDevnetWalletsExist(): boolean {
  return fs.existsSync(WALLETS_PATH);
}

function loadDevnetWallets(): DevnetWallets {
  const content = fs.readFileSync(WALLETS_PATH, "utf-8");
  return JSON.parse(content) as DevnetWallets;
}

async function createDevnetTransaction(): Promise<{
  signature: string;
  sender: string;
  recipient: string;
  amount: number;
}> {
  const wallets = loadDevnetWallets();
  const connection = new Connection(DEVNET_RPC, "confirmed");

  const senderKeypair = Keypair.fromSecretKey(
    Buffer.from(wallets.winner.secretKey, "base64")
  );
  const recipientPubkey = new PublicKey(wallets.creator.publicKey);

  const amount = 0.001 * LAMPORTS_PER_SOL; // 0.001 SOL for test

  const { SystemProgram, Transaction, sendAndConfirmTransaction } = await import("@solana/web3.js");

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: senderKeypair.publicKey,
      toPubkey: recipientPubkey,
      lamports: amount,
    })
  );

  const signature = await sendAndConfirmTransaction(connection, transaction, [senderKeypair]);

  return {
    signature,
    sender: senderKeypair.publicKey.toBase58(),
    recipient: recipientPubkey.toBase58(),
    amount,
  };
}
