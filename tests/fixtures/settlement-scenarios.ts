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
