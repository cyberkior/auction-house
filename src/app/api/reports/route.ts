import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import type { ReportCategory } from "@/types";
import { rateLimit, getRateLimitIdentifier } from "@/lib/rate-limit/limiter";
import { handleApiError } from "@/lib/errors/handler";
import { NotFoundError, ValidationError } from "@/lib/errors/classes";
import { validateBody } from "@/lib/validation/middleware";
import { reportSchema } from "@/lib/validation/schemas";

// POST /api/reports - Submit a report
export async function POST(request: NextRequest) {
  try {
    await rateLimit(getRateLimitIdentifier(request), "moderate");

    const body = await request.json();
    const { walletAddress, auctionId, category, description } = validateBody(
      reportSchema,
      body
    );

    const supabase = createServerClient();

    // Get user
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("wallet_address", walletAddress)
      .single();

    if (userError || !user) {
      throw new NotFoundError("User");
    }

    // Verify auction exists
    const { data: auction, error: auctionError } = await supabase
      .from("auctions")
      .select("id, creator_id")
      .eq("id", auctionId)
      .single();

    if (auctionError || !auction) {
      throw new NotFoundError("Auction");
    }

    // Can't report your own auction
    if (auction.creator_id === user.id) {
      throw new ValidationError("Cannot report your own auction", [
        { field: "auctionId", message: "Cannot report your own auction" },
      ]);
    }

    // Check if user already reported this auction
    const { data: existingReport } = await supabase
      .from("reports")
      .select("id")
      .eq("reporter_id", user.id)
      .eq("auction_id", auctionId)
      .single();

    if (existingReport) {
      throw new ValidationError("You have already reported this auction", [
        { field: "auctionId", message: "Duplicate report" },
      ]);
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
    return handleApiError(error);
  }
}
