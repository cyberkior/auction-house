import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getWalletBalance } from "@/lib/solana/balance";
import { rateLimit, getRateLimitIdentifier } from "@/lib/rate-limit/limiter";
import { handleApiError } from "@/lib/errors/handler";
import {
  NotFoundError,
  AuthorizationError,
  ValidationError,
} from "@/lib/errors/classes";
import { validateBody } from "@/lib/validation/middleware";
import { placeBidSchema } from "@/lib/validation/schemas";

// POST /api/auctions/[id]/bid - Place a bid
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await rateLimit(getRateLimitIdentifier(request), "moderate");

    const body = await request.json();
    const { walletAddress, amount } = validateBody(placeBidSchema, body);

    const supabase = createServerClient();

    // Update auction statuses first
    await supabase.rpc("update_auction_statuses");

    // Get auction
    const { data: auction, error: auctionError } = await supabase
      .from("auctions")
      .select("*")
      .eq("id", params.id)
      .single();

    if (auctionError || !auction) {
      throw new NotFoundError("Auction");
    }

    // Verify auction is current
    if (auction.status !== "current") {
      throw new ValidationError("Auction is not active", [
        { field: "auction", message: "Auction is not currently active" },
      ]);
    }

    // Get user
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("wallet_address", walletAddress)
      .single();

    if (userError || !user) {
      throw new NotFoundError("User");
    }

    // Check if user is restricted
    if (user.is_restricted) {
      throw new AuthorizationError("User is restricted from bidding");
    }

    // Check if user is the creator
    if (auction.creator_id === user.id) {
      throw new ValidationError("Cannot bid on your own auction", [
        { field: "auction", message: "You cannot bid on your own auction" },
      ]);
    }

    // Get current highest bid with bidder info for notification
    const { data: highestBid } = await supabase
      .from("bids")
      .select("amount, bidder_id")
      .eq("auction_id", params.id)
      .order("amount", { ascending: false })
      .limit(1)
      .single();

    const currentHighest = highestBid?.amount || auction.reserve_price;
    const minimumBid = currentHighest + auction.min_bid_increment;

    if (amount < minimumBid) {
      throw new ValidationError(`Bid must be at least ${minimumBid / 1e9} SOL`, [
        {
          field: "amount",
          message: `Bid must be at least ${minimumBid / 1e9} SOL`,
        },
      ]);
    }

    // Check wallet balance
    const walletBalance = await getWalletBalance(walletAddress);
    if (walletBalance < amount) {
      throw new ValidationError("Insufficient wallet balance", [
        { field: "amount", message: "Insufficient wallet balance" },
      ]);
    }

    // Get user's existing committed bids (top 3 in other auctions)
    const { data: committedBids } = await supabase
      .from("bids")
      .select("amount")
      .eq("bidder_id", user.id)
      .eq("is_top_3", true)
      .neq("auction_id", params.id);

    const totalCommitted = (committedBids || []).reduce(
      (sum, b) => sum + b.amount,
      0
    );

    // Check if user has enough balance for this bid + committed
    if (walletBalance < amount + totalCommitted) {
      throw new ValidationError(
        "Insufficient balance. You have funds committed to other auctions.",
        [
          {
            field: "amount",
            message: "Insufficient balance due to committed bids",
          },
        ]
      );
    }

    // Place the bid using the database function
    const { data: bid, error: bidError } = await supabase.rpc("place_bid", {
      p_auction_id: params.id,
      p_bidder_wallet: walletAddress,
      p_amount: amount,
    });

    if (bidError) {
      console.error("Bid error:", bidError);
      return NextResponse.json(
        { error: bidError.message || "Failed to place bid" },
        { status: 400 }
      );
    }

    // Create outbid notification for previous high bidder
    if (highestBid?.bidder_id && highestBid.bidder_id !== user.id) {
      await supabase.from("notifications").insert({
        user_id: highestBid.bidder_id,
        type: "outbid",
        title: "You've been outbid!",
        message: `Someone placed a higher bid of ${(amount / 1e9).toFixed(2)} SOL on "${auction.title}"`,
        auction_id: params.id,
      });
    }

    return NextResponse.json({ bid }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
