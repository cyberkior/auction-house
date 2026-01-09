import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// GET /api/settlements/auction/[id] - Get settlement by auction ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient();

    // First, ensure the auction exists and is in settling state
    const { data: auction, error: auctionError } = await supabase
      .from("auctions")
      .select(
        `
        *,
        creator:users!creator_id(wallet_address, username)
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

    // Get the most recent pending settlement for this auction
    // (there may be multiple due to cascade)
    let { data: settlement, error: settlementError } = await supabase
      .from("settlements")
      .select(
        `
        *,
        winner:users!winner_id(wallet_address, username),
        original_winner:users!original_winner_id(wallet_address, username)
      `
      )
      .eq("auction_id", params.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // If no settlement exists and auction is in settling state, create one
    if (!settlement && auction.status === "settling" && auction.winner_id) {
      const paymentDeadline = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      const { data: newSettlement, error: createError } = await supabase
        .from("settlements")
        .insert({
          auction_id: params.id,
          winner_id: auction.winner_id,
          payment_deadline: paymentDeadline.toISOString(),
          status: "pending",
          cascade_position: 1,
        })
        .select(
          `
          *,
          winner:users!winner_id(wallet_address, username),
          original_winner:users!original_winner_id(wallet_address, username)
        `
        )
        .single();

      if (createError) {
        console.error("Failed to create settlement:", createError);
        return NextResponse.json(
          { error: "Failed to create settlement" },
          { status: 500 }
        );
      }

      settlement = newSettlement;
    }

    if (!settlement) {
      return NextResponse.json(
        { error: "Settlement not found" },
        { status: 404 }
      );
    }

    // Get previous failed settlements for cascade context
    const { data: previousSettlements } = await supabase
      .from("settlements")
      .select(
        `
        id,
        winner_id,
        status,
        cascade_position,
        cascade_reason,
        winner:users!winner_id(wallet_address, username)
      `
      )
      .eq("auction_id", params.id)
      .eq("status", "failed")
      .order("cascade_position", { ascending: true });

    // Add auction details and cascade info to settlement
    return NextResponse.json({
      settlement: {
        ...settlement,
        auction: {
          id: auction.id,
          title: auction.title,
          winning_bid: auction.winning_bid,
          creator: auction.creator,
        },
        cascade_info: settlement.cascade_position > 1 ? {
          position: settlement.cascade_position,
          previous_winners: previousSettlements || [],
        } : null,
      },
    });
  } catch (error) {
    console.error("Error fetching settlement:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
