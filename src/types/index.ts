export type AuctionStatus =
  | "upcoming"
  | "current"
  | "past"
  | "settling"
  | "completed"
  | "failed";

export type ModerationStatus = "pending" | "approved" | "flagged" | "removed";

export type ReportCategory = "nsfw" | "scam" | "stolen" | "harassment";

export type ReportOutcome = "pending" | "dismissed" | "actioned";

export type SettlementStatus = "pending" | "paid" | "failed";

export interface User {
  id: string;
  wallet_address: string;
  username: string | null;
  avatar_url: string | null;
  credits: number;
  strikes: number;
  is_restricted: boolean;
  created_at: string;
  updated_at: string;
}

export interface Auction {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  image_url: string;
  tags: string[];
  reserve_price: number;
  min_bid_increment: number;
  start_time: string;
  end_time: string;
  status: AuctionStatus;
  winner_id: string | null;
  winning_bid: number | null;
  moderation_status: ModerationStatus;
  created_at: string;
  updated_at: string;
  // Joined fields
  creator?: User;
  bids_count?: number;
  highest_bid?: number;
}

export interface Bid {
  id: string;
  auction_id: string;
  bidder_id: string;
  amount: number;
  collateral_locked: number;
  is_top_3: boolean;
  created_at: string;
  outbid_at: string | null;
  // Joined fields
  bidder?: User;
}

export interface Settlement {
  id: string;
  auction_id: string;
  winner_id: string;
  payment_deadline: string;
  payment_tx_signature: string | null;
  fee_tx_signature: string | null;
  status: SettlementStatus;
  cascade_position: number;
  original_winner_id: string | null;
  cascade_reason: string | null;
  created_at: string;
  // Joined fields
  winner?: User;
  original_winner?: User;
}

export interface Report {
  id: string;
  reporter_id: string;
  auction_id: string;
  category: ReportCategory;
  description: string;
  outcome: ReportOutcome;
  created_at: string;
}

// Lamports conversion helpers
export const LAMPORTS_PER_SOL = 1_000_000_000;

export function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL;
}

export function solToLamports(sol: number): number {
  return Math.floor(sol * LAMPORTS_PER_SOL);
}
