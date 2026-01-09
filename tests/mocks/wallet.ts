import { PublicKey, Transaction } from "@solana/web3.js";

export interface MockWalletConfig {
  publicKey: string;
  signTransaction?: (tx: Transaction) => Promise<Transaction>;
}

/**
 * Injects a mock wallet adapter and connection into the browser context.
 * Call this via page.addInitScript() before navigating.
 */
export function createMockWalletScript(config: MockWalletConfig): string {
  return `
    window.__MOCK_WALLET__ = {
      publicKey: "${config.publicKey}",
      connected: true,
    };

    // Override wallet adapter hooks
    window.__WALLET_ADAPTER_OVERRIDE__ = {
      publicKey: { toBase58: () => "${config.publicKey}" },
      connected: true,
      signTransaction: async (tx) => {
        // Return transaction with mock signature
        tx.signatures = [{
          signature: new Uint8Array(64).fill(1),
          publicKey: { toBase58: () => "${config.publicKey}" },
        }];
        return tx;
      },
      signMessage: async (message) => {
        return new Uint8Array(64).fill(1);
      },
    };

    // Override Solana connection
    window.__CONNECTION_OVERRIDE__ = {
      getLatestBlockhash: async () => ({
        blockhash: "MockBlockhash111111111111111111111111111",
        lastValidBlockHeight: 12345,
      }),
      sendRawTransaction: async (tx) => {
        // Return mock transaction signature
        return "MockTxSignature1111111111111111111111111111111111111111111111111";
      },
      confirmTransaction: async () => ({
        value: { err: null },
      }),
    };
  `;
}

// Test wallet addresses (valid Solana format)
export const TEST_WALLETS = {
  winner: "7nYmDMGTsQpfh8HqpLUJvE9oVPh3LnJbqKWPnk4JJvZB",
  creator: "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin",
  bidder2: "HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH",
  bidder3: "DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK",
};
