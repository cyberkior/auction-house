import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// GET /api/auctions/[id] - Get single auction with bids
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
    console.error("Error fetching auction:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
