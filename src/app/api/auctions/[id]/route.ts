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
import { deleteAuctionSchema } from "@/lib/validation/schemas";

// GET /api/auctions/[id] - Get single auction with bids
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await rateLimit(getRateLimitIdentifier(request), "lenient");

    const supabase = createServerClient();

    // Update auction statuses first
    await supabase.rpc("update_auction_statuses");

    // Fetch auction with creator
    const { data: auction, error: auctionError } = await supabase
      .from("auctions")
      .select(
        `
        *,
        creator:users!creator_id(id, wallet_address, username, avatar_url, credits)
      `
      )
      .eq("id", params.id)
      .single();

    if (auctionError || !auction) {
      return NextResponse.json(
        { error: "Auction not found" },
        { status: 404 }
      );
    }

    // Fetch bids with bidder info
    const { data: bids, error: bidsError } = await supabase
      .from("bids")
      .select(
        `
        *,
        bidder:users!bidder_id(id, wallet_address, username, avatar_url)
      `
      )
      .eq("auction_id", params.id)
      .order("amount", { ascending: false });

    if (bidsError) {
      console.error("Error fetching bids:", bidsError);
    }

    return NextResponse.json({
      auction: {
        ...auction,
        bids: bids || [],
        bids_count: bids?.length || 0,
        highest_bid: bids && bids.length > 0 ? bids[0].amount : null,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/auctions/[id] - Delete auction
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await rateLimit(getRateLimitIdentifier(request), "moderate");

    const body = await request.json();
    const { walletAddress } = validateBody(deleteAuctionSchema, body);

    const supabase = createServerClient();

    // Get auction with bid count
    const { data: auction, error: auctionError } = await supabase
      .from("auctions")
      .select(
        `
        *,
        creator:users!creator_id(wallet_address),
        bids(count)
      `
      )
      .eq("id", params.id)
      .single();

    if (auctionError || !auction) {
      throw new NotFoundError("Auction");
    }

    // Authorization check
    if (auction.creator.wallet_address !== walletAddress) {
      throw new AuthorizationError("Only auction creator can delete");
    }

    // Business rule checks
    if (["settling", "completed", "failed"].includes(auction.status)) {
      throw new ValidationError("Cannot delete auction in this status", [
        {
          field: "status",
          message: `Cannot delete ${auction.status} auction`,
        },
      ]);
    }

    if (auction.bids[0]?.count > 0) {
      throw new ValidationError("Cannot delete auction with bids", [
        { field: "bids", message: "Auction has existing bids" },
      ]);
    }

    // Soft delete
    const { error: updateError } = await supabase
      .from("auctions")
      .update({ moderation_status: "removed" })
      .eq("id", params.id);

    if (updateError) throw new DatabaseError("Failed to delete auction");

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
