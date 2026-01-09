import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { rateLimit, getRateLimitIdentifier } from "@/lib/rate-limit/limiter";
import { handleApiError } from "@/lib/errors/handler";
import {
  NotFoundError,
  AuthorizationError,
  ValidationError,
  DatabaseError,
} from "@/lib/errors/classes";
import { validateBody } from "@/lib/validation/middleware";
import { deleteBidSchema } from "@/lib/validation/schemas";

// DELETE /api/bids/[id] - Retract bid
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await rateLimit(getRateLimitIdentifier(request), "moderate");

    const body = await request.json();
    const { walletAddress } = validateBody(deleteBidSchema, body);

    const supabase = createServerClient();

    // Get bid with auction info
    const { data: bid, error: bidError } = await supabase
      .from("bids")
      .select(
        `
        *,
        bidder:users!bidder_id(wallet_address),
        auction:auctions!auction_id(status, title)
      `
      )
      .eq("id", params.id)
      .single();

    if (bidError || !bid) {
      throw new NotFoundError("Bid");
    }

    // Authorization check
    if (bid.bidder.wallet_address !== walletAddress) {
      throw new AuthorizationError("Only bidder can retract bid");
    }

    // Business rule checks - auction status
    if (["settling", "completed", "failed"].includes(bid.auction.status)) {
      throw new ValidationError("Cannot retract bid for ended auction", [
        { field: "auction", message: "Auction has ended" },
      ]);
    }

    // Check if winning bid
    const { data: highestBid } = await supabase
      .from("bids")
      .select("id")
      .eq("auction_id", bid.auction_id)
      .order("amount", { ascending: false })
      .limit(1)
      .single();

    if (highestBid?.id === bid.id) {
      throw new ValidationError("Cannot retract winning bid", [
        { field: "bid", message: "You are currently the highest bidder" },
      ]);
    }

    // Delete bid
    const { error: deleteError } = await supabase
      .from("bids")
      .delete()
      .eq("id", params.id);

    if (deleteError) throw new DatabaseError("Failed to delete bid");

    // Recalculate top 3 bids for auction
    await supabase.rpc("update_top_3_bids", { p_auction_id: bid.auction_id });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
