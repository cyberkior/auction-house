import type { Auction, Bid, User } from "@/types";

export const mockUser: User = {
  id: "user-1",
  wallet_address: "7nYmDMGTsQpfh8HqpLUJvE9oVPh3LnJbqKWPnk4JJvZB",
  username: "testuser",
  avatar_url: null,
  credits: 100,
  strikes: 0,
  is_restricted: false,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

export const mockAuction: Auction = {
  id: "auction-1",
  creator_id: "user-2",
  title: "Test Artwork",
  description: "A beautiful digital artwork",
  image_url: "https://example.com/image.png",
  tags: ["art", "digital"],
  reserve_price: 100000000, // 0.1 SOL
  min_bid_increment: 10000000, // 0.01 SOL
  start_time: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // Started 1 hour ago
  end_time: new Date(Date.now() + 1000 * 60 * 60).toISOString(), // Ends in 1 hour
  status: "current",
  winner_id: null,
  winning_bid: null,
  moderation_status: "pending",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  creator: {
    id: "user-2",
    wallet_address: "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin",
    username: "artist",
    avatar_url: null,
    credits: 150,
    strikes: 0,
    is_restricted: false,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  bids_count: 2,
  highest_bid: 200000000, // 0.2 SOL
};

export const mockBid: Bid = {
  id: "bid-1",
  auction_id: "auction-1",
  bidder_id: "user-1",
  amount: 200000000, // 0.2 SOL
  collateral_locked: 20000000, // 0.02 SOL
  is_top_3: true,
  created_at: "2024-01-01T01:00:00Z",
  outbid_at: null,
  bidder: mockUser,
};

export const mockUpcomingAuction: Auction = {
  ...mockAuction,
  id: "auction-2",
  status: "upcoming",
  start_time: new Date(Date.now() + 1000 * 60 * 60).toISOString(), // Starts in 1 hour
  end_time: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(), // Ends in 2 hours
};

export const mockPastAuction: Auction = {
  ...mockAuction,
  id: "auction-3",
  status: "completed",
  winner_id: "user-1",
  winning_bid: 500000000, // 0.5 SOL
  start_time: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // Started 24 hours ago
  end_time: new Date(Date.now() - 1000 * 60 * 60 * 23).toISOString(), // Ended 23 hours ago
};

export function createMockFetchResponse<T>(data: T, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(data),
  } as Response);
}
