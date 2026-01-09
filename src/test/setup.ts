import "@testing-library/jest-dom";
import { vi, beforeEach } from "vitest";
import React from "react";

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Next.js Image
vi.mock("next/image", () => ({
  default: function MockImage(props: Record<string, unknown>) {
    return React.createElement("img", {
      src: props.src as string,
      alt: props.alt as string,
      width: props.width,
      height: props.height,
    });
  },
}));

// Mock Next.js Link
vi.mock("next/link", () => ({
  default: function MockLink({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return React.createElement("a", { href }, children);
  },
}));

// Mock Solana wallet adapter
vi.mock("@solana/wallet-adapter-react", () => ({
  useWallet: () => ({
    publicKey: null,
    connected: false,
    connecting: false,
    disconnect: vi.fn(),
    signMessage: vi.fn(),
    signTransaction: vi.fn(),
  }),
  useConnection: () => ({
    connection: {
      getBalance: vi.fn().mockResolvedValue(1000000000),
      getLatestBlockhash: vi.fn().mockResolvedValue({
        blockhash: "mock-blockhash",
        lastValidBlockHeight: 100,
      }),
    },
  }),
}));

// Mock fetch globally
global.fetch = vi.fn();

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});
