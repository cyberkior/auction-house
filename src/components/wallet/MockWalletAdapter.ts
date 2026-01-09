import { PublicKey, Transaction } from "@solana/web3.js";
import {
  BaseMessageSignerWalletAdapter,
  WalletReadyState,
  type WalletName
} from "@solana/wallet-adapter-base";

/**
 * Mock wallet adapter for E2E testing.
 * Reads from window.__WALLET_ADAPTER_OVERRIDE__ if available.
 */
export class MockWalletAdapter extends BaseMessageSignerWalletAdapter {
  name = "Mock Wallet" as WalletName<"Mock Wallet">;
  url = "https://mock-wallet.test";
  icon = "";
  readonly supportedTransactionVersions = null;
  readyState = WalletReadyState.Installed;
  connecting = false;

  private _publicKey: PublicKey | null = null;
  private _connected = false;

  get publicKey(): PublicKey | null {
    if (typeof window !== "undefined" && (window as any).__WALLET_ADAPTER_OVERRIDE__) {
      const override = (window as any).__WALLET_ADAPTER_OVERRIDE__;
      if (override.publicKey) {
        return new PublicKey(override.publicKey.toBase58());
      }
    }
    return this._publicKey;
  }

  get connected(): boolean {
    if (typeof window !== "undefined" && (window as any).__WALLET_ADAPTER_OVERRIDE__) {
      return (window as any).__WALLET_ADAPTER_OVERRIDE__.connected;
    }
    return this._connected;
  }

  async connect(): Promise<void> {
    if (typeof window !== "undefined" && (window as any).__WALLET_ADAPTER_OVERRIDE__) {
      const override = (window as any).__WALLET_ADAPTER_OVERRIDE__;
      this._publicKey = new PublicKey(override.publicKey.toBase58());
      this._connected = true;
      this.emit("connect", this._publicKey);
      return;
    }
    throw new Error("Mock wallet not configured");
  }

  async disconnect(): Promise<void> {
    this._publicKey = null;
    this._connected = false;
    this.emit("disconnect");
  }

  async signTransaction<T extends Transaction>(transaction: T): Promise<T> {
    if (typeof window !== "undefined" && (window as any).__WALLET_ADAPTER_OVERRIDE__) {
      const override = (window as any).__WALLET_ADAPTER_OVERRIDE__;
      if (override.signTransaction) {
        return override.signTransaction(transaction);
      }
    }
    // Return transaction with mock signature
    transaction.signatures = [{
      signature: new Uint8Array(64).fill(1),
      publicKey: this.publicKey!,
    } as any];
    return transaction;
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    if (typeof window !== "undefined" && (window as any).__WALLET_ADAPTER_OVERRIDE__) {
      const override = (window as any).__WALLET_ADAPTER_OVERRIDE__;
      if (override.signMessage) {
        return override.signMessage(message);
      }
    }
    return new Uint8Array(64).fill(1);
  }
}
