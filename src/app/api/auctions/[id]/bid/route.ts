import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getWalletBalance } from "@/lib/solana/balance";

// POST /api/auctions/[id]/bid - Place a bid
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { walletAddress, amount } = body;

    if (!walletAddress || !amount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid bid amount" },
        { status: 400 }
      );
    }

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
      return NextResponse.json(
        { error: "Auction not found" },
        { status: 404 }
      );
    }

    // Verify auction is current
    if (auction.status !== "current") {
      return NextResponse.json(
        { error: "Auction is not active" },
        { status: 400 }
      );
    }

    // Get user
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("wallet_address", walletAddress)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if user is restricted
    if (user.is_restricted) {
      return NextResponse.json(
        { error: "User is restricted from bidding" },
        { status: 403 }
      );
    }

    // Check if user is the creator
    if (auction.creator_id === user.id) {
      return NextResponse.json(
        { error: "Cannot bid on your own auction" },
        { status: 400 }
      );
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
      return NextResponse.json(
        {
          error: `Bid must be at least ${minimumBid / 1e9} SOL`,
        },
        { status: 400 }
      );
    }

    // Check wallet balance
    const walletBalance = await getWalletBalance(walletAddress);
    if (walletBalance < amount) {
      return NextResponse.json(
        { error: "Insufficient wallet balance" },
        { status: 400 }
      );
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
      return NextResponse.json(
        {
          error:
            "Insufficient balance. You have funds committed to other auctions.",
        },
        { status: 400 }
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
    console.error("Error placing bid:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
