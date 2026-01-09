import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import type { ReportCategory } from "@/types";

// POST /api/reports - Submit a report
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, auctionId, category, description } = body;

    if (!walletAddress || !auctionId || !category) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const validCategories: ReportCategory[] = [
      "nsfw",
      "scam",
      "stolen",
      "harassment",
    ];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: "Invalid category" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Get user
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("wallet_address", walletAddress)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Verify auction exists
    const { data: auction, error: auctionError } = await supabase
      .from("auctions")
      .select("id, creator_id")
      .eq("id", auctionId)
      .single();

    if (auctionError || !auction) {
      return NextResponse.json(
        { error: "Auction not found" },
        { status: 404 }
      );
    }

    // Can't report your own auction
    if (auction.creator_id === user.id) {
      return NextResponse.json(
        { error: "Cannot report your own auction" },
        { status: 400 }
      );
    }

    // Check if user already reported this auction
    const { data: existingReport } = await supabase
      .from("reports")
      .select("id")
      .eq("reporter_id", user.id)
      .eq("auction_id", auctionId)
      .single();

    if (existingReport) {
      return NextResponse.json(
        { error: "You have already reported this auction" },
        { status: 400 }
      );
    }

    // Create report
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .insert({
        reporter_id: user.id,
        auction_id: auctionId,
        category,
        description: description || "",
      })
      .select()
      .single();

    if (reportError) {
      console.error("Failed to create report:", reportError);
      return NextResponse.json(
        { error: "Failed to submit report" },
        { status: 500 }
      );
    }

    // Check report count for this auction - auto-flag if threshold reached
    const { count: reportCount } = await supabase
      .from("reports")
      .select("*", { count: "exact", head: true })
      .eq("auction_id", auctionId)
      .eq("outcome", "pending");

    // Auto-flag if 3 or more pending reports
    if (reportCount && reportCount >= 3) {
      await supabase
        .from("auctions")
        .update({ moderation_status: "flagged" })
        .eq("id", auctionId);
    }

    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    console.error("Error creating report:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
