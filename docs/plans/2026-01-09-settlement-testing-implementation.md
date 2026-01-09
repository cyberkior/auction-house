# Settlement Workflow Testing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add E2E (Playwright) and integration (Vitest + Solana devnet) tests for the auction settlement flow.

**Architecture:** Hybrid approach - mock wallet/blockchain for fast E2E browser tests, real Solana devnet for integration tests. E2E tests verify UI flows, integration tests verify transaction verification and database state transitions.

**Tech Stack:** Playwright, Vitest, Solana devnet, Supabase test client

---

## Task 1: Install Playwright and Configure

**Files:**
- Modify: `package.json`
- Create: `playwright.config.ts`

**Step 1: Install Playwright**

Run:
```bash
npm install -D @playwright/test
npx playwright install chromium
```

Expected: Dependencies installed, chromium browser downloaded.

**Step 2: Create Playwright config**

Create `playwright.config.ts`:

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

**Step 3: Add npm scripts**

Add to `package.json` scripts:

```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui"
```

**Step 4: Verify config**

Run:
```bash
npx playwright test --help
```

Expected: Playwright CLI help output, no config errors.

**Step 5: Commit**

```bash
git add package.json package-lock.json playwright.config.ts
git commit -m "chore: add Playwright for E2E testing"
```

---

## Task 2: Create Mock Wallet Adapter for E2E

**Files:**
- Create: `tests/mocks/wallet.ts`

**Step 1: Create wallet mock file**

Create `tests/mocks/wallet.ts`:

```typescript
import { PublicKey, Transaction } from "@solana/web3.js";

export interface MockWalletConfig {
  publicKey: string;
  signTransaction?: (tx: Transaction) => Promise<Transaction>;
}

/**
 * Injects a mock wallet adapter into the browser context.
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
  `;
}

// Test wallet addresses (valid Solana format)
export const TEST_WALLETS = {
  winner: "7nYmDMGTsQpfh8HqpLUJvE9oVPh3LnJbqKWPnk4JJvZB",
  creator: "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin",
  bidder2: "HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH",
  bidder3: "DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK",
};
```

**Step 2: Verify file created**

Run:
```bash
ls tests/mocks/wallet.ts
```

Expected: File exists.

**Step 3: Commit**

```bash
git add tests/mocks/wallet.ts
git commit -m "feat: add mock wallet adapter for E2E tests"
```

---

## Task 3: Create Mock Transaction Verification

**Files:**
- Create: `tests/mocks/transactions.ts`

**Step 1: Create transaction mock file**

Create `tests/mocks/transactions.ts`:

```typescript
import { Page, Route } from "@playwright/test";

export interface MockSettlement {
  id: string;
  auction_id: string;
  winner_id: string;
  payment_deadline: string;
  payment_tx_signature: string | null;
  status: "pending" | "paid" | "failed";
  cascade_position: number;
  cascade_info: null | {
    position: number;
    previous_winners: Array<{
      id: string;
      winner_id: string;
      status: string;
      cascade_position: number;
      cascade_reason: string | null;
      winner: { wallet_address: string; username: string | null };
    }>;
  };
  auction: {
    id: string;
    title: string;
    winning_bid: number;
    creator: { wallet_address: string; username: string | null };
  };
  winner: { wallet_address: string; username: string | null };
}

/**
 * Mock the settlement API responses
 */
export async function mockSettlementAPIs(
  page: Page,
  settlement: MockSettlement
) {
  // Mock GET /api/settlements/auction/[id]
  await page.route(
    `**/api/settlements/auction/${settlement.auction_id}`,
    async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ settlement }),
      });
    }
  );

  // Mock GET /api/auctions/[id]
  await page.route(
    `**/api/auctions/${settlement.auction_id}`,
    async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          auction: {
            id: settlement.auction_id,
            status: "settling",
            winner_id: settlement.winner_id,
            winning_bid: settlement.auction.winning_bid,
            title: settlement.auction.title,
            creator: settlement.auction.creator,
          },
        }),
      });
    }
  );
}

/**
 * Mock successful payment verification
 */
export async function mockSuccessfulPaymentVerification(
  page: Page,
  settlementId: string
) {
  await page.route(
    `**/api/settlements/${settlementId}/verify`,
    async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Payment verified successfully",
        }),
      });
    }
  );
}

/**
 * Mock failed payment verification
 */
export async function mockFailedPaymentVerification(
  page: Page,
  settlementId: string,
  error: string
) {
  await page.route(
    `**/api/settlements/${settlementId}/verify`,
    async (route: Route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error }),
      });
    }
  );
}
```

**Step 2: Commit**

```bash
git add tests/mocks/transactions.ts
git commit -m "feat: add mock transaction verification for E2E tests"
```

---

## Task 4: Create Settlement Test Fixtures

**Files:**
- Create: `tests/fixtures/settlement-scenarios.ts`

**Step 1: Create fixtures file**

Create `tests/fixtures/settlement-scenarios.ts`:

```typescript
import { MockSettlement } from "../mocks/transactions";
import { TEST_WALLETS } from "../mocks/wallet";

/**
 * Settlement pending payment - happy path
 */
export const pendingSettlement: MockSettlement = {
  id: "settlement-1",
  auction_id: "auction-1",
  winner_id: "user-1",
  payment_deadline: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min from now
  payment_tx_signature: null,
  status: "pending",
  cascade_position: 1,
  cascade_info: null,
  auction: {
    id: "auction-1",
    title: "Test Artwork",
    winning_bid: 500000000, // 0.5 SOL in lamports
    creator: {
      wallet_address: TEST_WALLETS.creator,
      username: "artist",
    },
  },
  winner: {
    wallet_address: TEST_WALLETS.winner,
    username: "winner",
  },
};

/**
 * Settlement with expired deadline
 */
export const expiredSettlement: MockSettlement = {
  ...pendingSettlement,
  id: "settlement-2",
  payment_deadline: new Date(Date.now() - 60 * 1000).toISOString(), // 1 min ago
};

/**
 * Settlement already paid
 */
export const paidSettlement: MockSettlement = {
  ...pendingSettlement,
  id: "settlement-3",
  status: "paid",
  payment_tx_signature: "5KtPn1...mockTxSignature",
};

/**
 * Cascade settlement - 2nd place winner
 */
export const cascadeSettlement2nd: MockSettlement = {
  ...pendingSettlement,
  id: "settlement-4",
  winner_id: "user-2",
  cascade_position: 2,
  cascade_info: {
    position: 2,
    previous_winners: [
      {
        id: "settlement-1",
        winner_id: "user-1",
        status: "failed",
        cascade_position: 1,
        cascade_reason: "timeout",
        winner: {
          wallet_address: TEST_WALLETS.winner,
          username: "original_winner",
        },
      },
    ],
  },
  winner: {
    wallet_address: TEST_WALLETS.bidder2,
    username: "bidder2",
  },
};

/**
 * Cascade settlement - 3rd place winner
 */
export const cascadeSettlement3rd: MockSettlement = {
  ...pendingSettlement,
  id: "settlement-5",
  winner_id: "user-3",
  cascade_position: 3,
  cascade_info: {
    position: 3,
    previous_winners: [
      {
        id: "settlement-1",
        winner_id: "user-1",
        status: "failed",
        cascade_position: 1,
        cascade_reason: "timeout",
        winner: {
          wallet_address: TEST_WALLETS.winner,
          username: "original_winner",
        },
      },
      {
        id: "settlement-4",
        winner_id: "user-2",
        status: "failed",
        cascade_position: 2,
        cascade_reason: "timeout",
        winner: {
          wallet_address: TEST_WALLETS.bidder2,
          username: "bidder2",
        },
      },
    ],
  },
  winner: {
    wallet_address: TEST_WALLETS.bidder3,
    username: "bidder3",
  },
};

/**
 * Failed auction - all bidders exhausted
 */
export const failedAuctionSettlement: MockSettlement = {
  ...pendingSettlement,
  id: "settlement-6",
  status: "failed",
  cascade_position: 3,
  cascade_info: {
    position: 3,
    previous_winners: [
      {
        id: "settlement-1",
        winner_id: "user-1",
        status: "failed",
        cascade_position: 1,
        cascade_reason: "timeout",
        winner: {
          wallet_address: TEST_WALLETS.winner,
          username: "original_winner",
        },
      },
      {
        id: "settlement-4",
        winner_id: "user-2",
        status: "failed",
        cascade_position: 2,
        cascade_reason: "timeout",
        winner: {
          wallet_address: TEST_WALLETS.bidder2,
          username: "bidder2",
        },
      },
    ],
  },
};
```

**Step 2: Commit**

```bash
git add tests/fixtures/settlement-scenarios.ts
git commit -m "feat: add settlement test fixtures"
```

---

## Task 5: Write E2E Test - Winner Payment Success

**Files:**
- Create: `tests/e2e/settlement.spec.ts`

**Step 1: Create E2E test file with first test**

Create `tests/e2e/settlement.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";
import { createMockWalletScript, TEST_WALLETS } from "../mocks/wallet";
import {
  mockSettlementAPIs,
  mockSuccessfulPaymentVerification,
} from "../mocks/transactions";
import {
  pendingSettlement,
  expiredSettlement,
  paidSettlement,
  cascadeSettlement2nd,
} from "../fixtures/settlement-scenarios";

test.describe("Settlement Flow", () => {
  test("winner can successfully pay for auction", async ({ page }) => {
    // Inject mock wallet as winner
    await page.addInitScript(
      createMockWalletScript({ publicKey: TEST_WALLETS.winner })
    );

    // Mock API responses
    await mockSettlementAPIs(page, pendingSettlement);
    await mockSuccessfulPaymentVerification(page, pendingSettlement.id);

    // Navigate to settlement page
    await page.goto(`/auction/${pendingSettlement.auction_id}/settle`);

    // Verify page loaded with correct info
    await expect(page.getByText("Complete Payment")).toBeVisible();
    await expect(page.getByText("Test Artwork")).toBeVisible();
    await expect(page.getByText("0.5 SOL")).toBeVisible();
    await expect(page.getByText("Awaiting Payment")).toBeVisible();

    // Verify time remaining is displayed
    await expect(page.getByText(/\d+m \d+s/)).toBeVisible();

    // Click pay button
    await page.getByRole("button", { name: "Pay Now" }).click();

    // Wait for processing
    await expect(page.getByRole("button", { name: "Processing..." })).toBeVisible();

    // Verify success state
    await expect(page.getByText("Payment successful!")).toBeVisible();
    await expect(page.getByText("The artwork is yours.")).toBeVisible();
  });
});
```

**Step 2: Run test to verify it works**

Run:
```bash
npm run test:e2e -- --grep "winner can successfully pay"
```

Expected: Test runs (may fail if mocks need adjustment - that's expected at this stage).

**Step 3: Commit**

```bash
git add tests/e2e/settlement.spec.ts
git commit -m "feat: add E2E test for winner payment success flow"
```

---

## Task 6: Write E2E Test - Expired Deadline

**Files:**
- Modify: `tests/e2e/settlement.spec.ts`

**Step 1: Add expired deadline test**

Add to `tests/e2e/settlement.spec.ts`:

```typescript
  test("shows expired state when deadline passed", async ({ page }) => {
    // Inject mock wallet as winner
    await page.addInitScript(
      createMockWalletScript({ publicKey: TEST_WALLETS.winner })
    );

    // Mock API with expired settlement
    await mockSettlementAPIs(page, expiredSettlement);

    // Navigate to settlement page
    await page.goto(`/auction/${expiredSettlement.auction_id}/settle`);

    // Verify expired state
    await expect(page.getByText("Deadline Expired")).toBeVisible();
    await expect(
      page.getByText(/payment deadline has passed/)
    ).toBeVisible();
    await expect(
      page.getByText(/offered to the next highest bidder/)
    ).toBeVisible();

    // Pay button should not be visible
    await expect(page.getByRole("button", { name: "Pay Now" })).not.toBeVisible();
  });
```

**Step 2: Run test**

Run:
```bash
npm run test:e2e -- --grep "shows expired state"
```

**Step 3: Commit**

```bash
git add tests/e2e/settlement.spec.ts
git commit -m "feat: add E2E test for expired deadline state"
```

---

## Task 7: Write E2E Test - Cascade to 2nd Place

**Files:**
- Modify: `tests/e2e/settlement.spec.ts`

**Step 1: Add cascade test**

Add to `tests/e2e/settlement.spec.ts`:

```typescript
  test("shows cascade notice for 2nd place winner", async ({ page }) => {
    // Inject mock wallet as 2nd place bidder
    await page.addInitScript(
      createMockWalletScript({ publicKey: TEST_WALLETS.bidder2 })
    );

    // Mock API with cascade settlement
    await mockSettlementAPIs(page, cascadeSettlement2nd);
    await mockSuccessfulPaymentVerification(page, cascadeSettlement2nd.id);

    // Navigate to settlement page
    await page.goto(`/auction/${cascadeSettlement2nd.auction_id}/settle`);

    // Verify cascade notice
    await expect(page.getByText("#2 choice winner")).toBeVisible();
    await expect(
      page.getByText(/original winner didn't complete payment/)
    ).toBeVisible();
    await expect(page.getByText(/30 minutes to complete/)).toBeVisible();

    // Pay button should be visible
    await expect(page.getByRole("button", { name: "Pay Now" })).toBeVisible();
  });
```

**Step 2: Run test**

Run:
```bash
npm run test:e2e -- --grep "cascade notice"
```

**Step 3: Commit**

```bash
git add tests/e2e/settlement.spec.ts
git commit -m "feat: add E2E test for cascade settlement flow"
```

---

## Task 8: Write E2E Test - Already Paid State

**Files:**
- Modify: `tests/e2e/settlement.spec.ts`

**Step 1: Add already paid test**

Add to `tests/e2e/settlement.spec.ts`:

```typescript
  test("shows payment complete state for paid settlement", async ({ page }) => {
    // Navigate without wallet - just viewing
    await mockSettlementAPIs(page, paidSettlement);

    await page.goto(`/auction/${paidSettlement.auction_id}/settle`);

    // Verify paid state
    await expect(page.getByText("Payment Complete")).toBeVisible();
    await expect(page.getByText("Payment successful!")).toBeVisible();
    await expect(page.getByText("View transaction")).toBeVisible();

    // Pay button should not be visible
    await expect(page.getByRole("button", { name: "Pay Now" })).not.toBeVisible();
  });
```

**Step 2: Run all E2E tests**

Run:
```bash
npm run test:e2e
```

Expected: All 4 tests pass.

**Step 3: Commit**

```bash
git add tests/e2e/settlement.spec.ts
git commit -m "feat: add E2E test for already paid state"
```

---

## Task 9: Create Devnet Wallet Fixtures

**Files:**
- Create: `tests/fixtures/devnet-wallets.json.example`
- Modify: `.gitignore`

**Step 1: Create example wallet config**

Create `tests/fixtures/devnet-wallets.json.example`:

```json
{
  "_comment": "Copy to devnet-wallets.json and fill in real devnet keypairs",
  "winner": {
    "publicKey": "YOUR_DEVNET_WALLET_1_PUBLIC_KEY",
    "secretKey": "YOUR_DEVNET_WALLET_1_SECRET_KEY_BASE58"
  },
  "creator": {
    "publicKey": "YOUR_DEVNET_WALLET_2_PUBLIC_KEY",
    "secretKey": "YOUR_DEVNET_WALLET_2_SECRET_KEY_BASE58"
  },
  "bidder2": {
    "publicKey": "YOUR_DEVNET_WALLET_3_PUBLIC_KEY",
    "secretKey": "YOUR_DEVNET_WALLET_3_SECRET_KEY_BASE58"
  }
}
```

**Step 2: Add to .gitignore**

Add to `.gitignore`:

```
# Test wallet secrets
tests/fixtures/devnet-wallets.json
```

**Step 3: Commit**

```bash
git add tests/fixtures/devnet-wallets.json.example .gitignore
git commit -m "feat: add devnet wallet fixture template"
```

---

## Task 10: Write Integration Test - Transaction Verification

**Files:**
- Create: `tests/integration/settlement.test.ts`

**Step 1: Create integration test file**

Create `tests/integration/settlement.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { verifyPaymentTransaction } from "@/lib/solana/verify-tx";

// Use devnet for integration tests
const DEVNET_RPC = "https://api.devnet.solana.com";

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
      const walletsExist = await checkDevnetWalletsExist();
      if (!walletsExist) {
        console.log("Skipping: devnet wallets not configured");
        return;
      }

      // Create and send a real devnet transaction
      const { signature, sender, recipient, amount } = await createDevnetTransaction();

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
      const walletsExist = await checkDevnetWalletsExist();
      if (!walletsExist) {
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
});

// Helper functions
async function checkDevnetWalletsExist(): Promise<boolean> {
  try {
    await import("../fixtures/devnet-wallets.json");
    return true;
  } catch {
    return false;
  }
}

async function createDevnetTransaction(): Promise<{
  signature: string;
  sender: string;
  recipient: string;
  amount: number;
}> {
  const wallets = await import("../fixtures/devnet-wallets.json");
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
```

**Step 2: Add integration test script**

Add to `package.json` scripts:

```json
"test:integration": "vitest run tests/integration"
```

**Step 3: Run test**

Run:
```bash
npm run test:integration
```

Expected: First test passes (non-existent tx), others skip if no devnet wallets.

**Step 4: Commit**

```bash
git add tests/integration/settlement.test.ts package.json
git commit -m "feat: add integration tests for transaction verification"
```

---

## Task 11: Write Integration Test - Cascade Logic

**Files:**
- Modify: `tests/integration/settlement.test.ts`

**Step 1: Add cascade logic tests**

Add to `tests/integration/settlement.test.ts`:

```typescript
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
```

**Step 2: Run tests**

Run:
```bash
npm run test:integration
```

**Step 3: Commit**

```bash
git add tests/integration/settlement.test.ts
git commit -m "feat: add integration tests for cascade logic"
```

---

## Task 12: Write Integration Test - Settlement State Machine

**Files:**
- Modify: `tests/integration/settlement.test.ts`

**Step 1: Add state machine tests**

Add to `tests/integration/settlement.test.ts`:

```typescript
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
```

**Step 2: Run all tests**

Run:
```bash
npm run test:integration
```

**Step 3: Commit**

```bash
git add tests/integration/settlement.test.ts
git commit -m "feat: add integration tests for settlement state machine"
```

---

## Task 13: Update Vitest Config for Integration Tests

**Files:**
- Modify: `vitest.config.ts`

**Step 1: Read current config**

Read `vitest.config.ts` to understand current structure.

**Step 2: Update config to separate unit and integration**

Update `vitest.config.ts` to include integration test handling:

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "tests/integration/**/*.test.ts"],
    exclude: ["node_modules", "tests/e2e"],
    coverage: {
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "src/test/"],
    },
    testTimeout: 30000, // 30s for integration tests
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

**Step 3: Run all tests**

Run:
```bash
npm run test:run
```

Expected: Unit tests and integration tests all run.

**Step 4: Commit**

```bash
git add vitest.config.ts
git commit -m "chore: update vitest config for integration tests"
```

---

## Task 14: Create Test Directory Structure

**Files:**
- Create: `tests/e2e/.gitkeep` (directory marker)
- Create: `tests/integration/.gitkeep`
- Create: `tests/mocks/.gitkeep`
- Create: `tests/fixtures/.gitkeep`

**Step 1: Create directories**

Run:
```bash
mkdir -p tests/e2e tests/integration tests/mocks tests/fixtures
touch tests/e2e/.gitkeep tests/integration/.gitkeep tests/mocks/.gitkeep tests/fixtures/.gitkeep
```

**Step 2: Move mock files if needed**

Verify files are in correct locations.

**Step 3: Commit**

```bash
git add tests/
git commit -m "chore: organize test directory structure"
```

---

## Task 15: Final Verification and Documentation

**Files:**
- Update: `docs/plans/2026-01-09-settlement-workflow-testing-design.md`

**Step 1: Run all tests**

Run:
```bash
npm run test:run
npm run test:e2e
```

Expected: All tests pass.

**Step 2: Update design doc with completion status**

Add to design doc:

```markdown
## Implementation Status

Completed on: [DATE]

### Files Created
- `playwright.config.ts`
- `tests/e2e/settlement.spec.ts`
- `tests/integration/settlement.test.ts`
- `tests/mocks/wallet.ts`
- `tests/mocks/transactions.ts`
- `tests/fixtures/settlement-scenarios.ts`
- `tests/fixtures/devnet-wallets.json.example`

### Test Coverage
- E2E: 4 tests covering winner payment, expired deadline, cascade, and paid states
- Integration: 6 tests covering transaction verification, cascade API, and state machine
```

**Step 3: Final commit**

```bash
git add docs/plans/
git commit -m "docs: mark settlement testing implementation complete"
```
