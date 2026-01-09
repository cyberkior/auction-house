import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { verifyPaymentTransaction } from "@/lib/solana/verify-tx";

// POST /api/settlements/[id]/verify - Verify payment transaction
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { txSignature, walletAddress } = body;

    if (!txSignature || !walletAddress) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Get settlement
    const { data: settlement, error: settlementError } = await supabase
      .from("settlements")
      .select(
        `
        *,
        auction:auctions(
          *,
          creator:users!creator_id(wallet_address)
        ),
        winner:users!winner_id(wallet_address)
      `
      )
      .eq("id", params.id)
      .single();

    if (settlementError || !settlement) {
      return NextResponse.json(
        { error: "Settlement not found" },
        { status: 404 }
      );
    }

    // Verify the requester is the winner
    if (settlement.winner.wallet_address !== walletAddress) {
      return NextResponse.json(
        { error: "Not authorized" },
        { status: 403 }
      );
    }

    // Check if already paid
    if (settlement.status === "paid") {
      return NextResponse.json(
        { error: "Already paid" },
        { status: 400 }
      );
    }

    // Check if deadline passed
    if (new Date(settlement.payment_deadline) < new Date()) {
      return NextResponse.json(
        { error: "Payment deadline has passed" },
        { status: 400 }
      );
    }

    // Verify the transaction
    const verification = await verifyPaymentTransaction(
      txSignature,
      walletAddress,
      settlement.auction.creator.wallet_address,
      settlement.auction.winning_bid
    );

    if (!verification.isValid) {
      return NextResponse.json(
        { error: verification.error || "Invalid transaction" },
        { status: 400 }
      );
    }

    // Update settlement as paid
    const { error: updateError } = await supabase
      .from("settlements")
      .update({
        status: "paid",
        payment_tx_signature: txSignature,
      })
      .eq("id", params.id);

    if (updateError) {
      console.error("Failed to update settlement:", updateError);
      return NextResponse.json(
        { error: "Failed to update settlement" },
        { status: 500 }
      );
    }

    // Update auction status to completed
    await supabase
      .from("auctions")
      .update({ status: "completed" })
      .eq("id", settlement.auction_id);

    // Award credits to winner for successful payment
    const { data: winnerUser } = await supabase
      .from("users")
      .select("credits")
      .eq("id", settlement.winner_id)
      .single();

    if (winnerUser) {
      await supabase
        .from("users")
        .update({ credits: winnerUser.credits + 20 })
        .eq("id", settlement.winner_id);
    }

    // Award credits to creator for successful sale
    const { data: creatorUser } = await supabase
      .from("users")
      .select("id, credits")
      .eq("wallet_address", settlement.auction.creator.wallet_address)
      .single();

    if (creatorUser) {
      await supabase
        .from("users")
        .update({ credits: creatorUser.credits + 30 })
        .eq("id", creatorUser.id);

      // Notify creator about the sale
      await supabase.from("notifications").insert({
        user_id: creatorUser.id,
        type: "payment_received",
        title: "Payment received!",
        message: `Your auction "${settlement.auction.title}" sold for ${(settlement.auction.winning_bid / 1e9).toFixed(2)} SOL`,
        auction_id: settlement.auction_id,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Payment verified successfully",
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/settlements/[id]/verify - Get settlement status
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient();

    const { data: settlement, error } = await supabase
      .from("settlements")
      .select(
        `
        *,
        auction:auctions(
          id,
          title,
          winning_bid,
          creator:users!creator_id(wallet_address, username)
        ),
        winner:users!winner_id(wallet_address, username)
      `
      )
      .eq("id", params.id)
      .single();

    if (error || !settlement) {
      return NextResponse.json(
        { error: "Settlement not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ settlement });
  } catch (error) {
    console.error("Error fetching settlement:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
