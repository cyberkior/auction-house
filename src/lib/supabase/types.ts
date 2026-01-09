import type {
  User,
  Auction,
  Bid,
  Settlement,
  Report,
  AuctionStatus,
  ModerationStatus,
  ReportCategory,
  ReportOutcome,
  SettlementStatus,
} from "@/types";

export type {
  User,
  Auction,
  Bid,
  Settlement,
  Report,
  AuctionStatus,
  ModerationStatus,
  ReportCategory,
  ReportOutcome,
  SettlementStatus,
};

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<User, "id" | "created_at" | "updated_at">>;
      };
      auctions: {
        Row: Auction;
        Insert: Omit<Auction, "id" | "created_at" | "updated_at" | "status" | "winner_id" | "winning_bid" | "moderation_status"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          status?: AuctionStatus;
          winner_id?: string | null;
          winning_bid?: number | null;
          moderation_status?: ModerationStatus;
        };
        Update: Partial<Omit<Auction, "id" | "created_at" | "updated_at">>;
      };
      bids: {
        Row: Bid;
        Insert: Omit<Bid, "id" | "created_at" | "is_top_3" | "outbid_at"> & {
          id?: string;
          created_at?: string;
          is_top_3?: boolean;
          outbid_at?: string | null;
        };
        Update: Partial<Omit<Bid, "id" | "created_at">>;
      };
      settlements: {
        Row: Settlement;
        Insert: Omit<Settlement, "id" | "created_at" | "status" | "payment_tx_signature" | "fee_tx_signature"> & {
          id?: string;
          created_at?: string;
          status?: SettlementStatus;
          payment_tx_signature?: string | null;
          fee_tx_signature?: string | null;
        };
        Update: Partial<Omit<Settlement, "id" | "created_at">>;
      };
      reports: {
        Row: Report;
        Insert: Omit<Report, "id" | "created_at" | "outcome"> & {
          id?: string;
          created_at?: string;
          outcome?: ReportOutcome;
        };
        Update: Partial<Omit<Report, "id" | "created_at">>;
      };
    };
    Functions: {
      get_or_create_user: {
        Args: { p_wallet_address: string };
        Returns: User;
      };
      update_auction_statuses: {
        Args: Record<string, never>;
        Returns: void;
      };
      place_bid: {
        Args: {
          p_auction_id: string;
          p_bidder_wallet: string;
          p_amount: number;
        };
        Returns: Bid;
      };
    };
  };
}
