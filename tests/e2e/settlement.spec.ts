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
});
