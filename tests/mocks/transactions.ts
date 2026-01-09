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
