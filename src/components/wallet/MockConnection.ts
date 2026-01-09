/**
 * Mock Solana Connection for E2E testing.
 * Provides minimal Connection API implementation for tests.
 */
export class MockConnection {
  endpoint: string;

  constructor(endpoint: string = "mock://test") {
    this.endpoint = endpoint;
  }

  async getLatestBlockhash() {
    if (typeof window !== "undefined" && (window as any).__CONNECTION_OVERRIDE__) {
      return (window as any).__CONNECTION_OVERRIDE__.getLatestBlockhash();
    }
    return {
      blockhash: "MockBlockhash111111111111111111111111111",
      lastValidBlockHeight: 12345,
    };
  }

  async sendRawTransaction(transaction: Buffer | Uint8Array) {
    if (typeof window !== "undefined" && (window as any).__CONNECTION_OVERRIDE__) {
      return (window as any).__CONNECTION_OVERRIDE__.sendRawTransaction(transaction);
    }
    return "MockTxSignature1111111111111111111111111111111111111111111111111";
  }

  async confirmTransaction(config: any) {
    if (typeof window !== "undefined" && (window as any).__CONNECTION_OVERRIDE__) {
      return (window as any).__CONNECTION_OVERRIDE__.confirmTransaction(config);
    }
    return { value: { err: null } };
  }
}
