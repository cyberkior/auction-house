import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { rateLimit, getRateLimitIdentifier } from "@/lib/rate-limit/limiter";
import { handleApiError } from "@/lib/errors/handler";
import {
  NotFoundError,
  AuthorizationError,
  ValidationError,
} from "@/lib/errors/classes";
import { validateBody } from "@/lib/validation/middleware";
import { updateUserSchema } from "@/lib/validation/schemas";

// GET /api/users/[address] - Get user profile with stats
export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    await rateLimit(getRateLimitIdentifier(request), "lenient");

    const supabase = createServerClient();

    // Get user
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("wallet_address", params.address)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Get user's created auctions
    const { data: createdAuctions } = await supabase
      .from("auctions")
      .select(
        `
        *,
        bids(count)
      `
      )
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    // Get highest bid for each auction
    const auctionsWithBids = await Promise.all(
      (createdAuctions || []).map(async (auction) => {
        const { data: highestBid } = await supabase
          .from("bids")
          .select("amount")
          .eq("auction_id", auction.id)
          .order("amount", { ascending: false })
          .limit(1)
          .single();

        return {
          ...auction,
          highest_bid: highestBid?.amount || null,
          bids_count: auction.bids?.[0]?.count || 0,
        };
      })
    );

    // Get user's bids
    const { data: userBids } = await supabase
      .from("bids")
      .select(
        `
        *,
        auction:auctions(id, title, image_url, status, end_time, winning_bid, winner_id)
      `
      )
      .eq("bidder_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    // Calculate stats
    const totalAuctions = createdAuctions?.length || 0;
    const completedAuctions =
      createdAuctions?.filter((a) => a.status === "completed").length || 0;
    const totalBids = userBids?.length || 0;
    const wonAuctions =
      userBids?.filter(
        (b) =>
          b.auction?.winner_id === user.id &&
          b.auction?.status === "completed"
      ).length || 0;

    return NextResponse.json({
      user,
      stats: {
        totalAuctions,
        completedAuctions,
        totalBids,
        wonAuctions,
      },
      createdAuctions: auctionsWithBids,
      bids: userBids || [],
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/users/[address] - Update user profile
export async function PATCH(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    await rateLimit(getRateLimitIdentifier(request), "moderate");

    const body = await request.json();
    const { username, avatarUrl, requesterWallet } = validateBody(
      updateUserSchema,
      body
    );

    // Verify the requester is the user
    if (requesterWallet !== params.address) {
      throw new AuthorizationError("Not authorized to update this profile");
    }

    const supabase = createServerClient();

    const updates: { username?: string; avatar_url?: string } = {};
    if (username !== undefined) updates.username = username;
    if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;

    const { data: user, error } = await supabase
      .from("users")
      .update(updates)
      .eq("wallet_address", params.address)
      .select()
      .single();

    if (error) {
      console.error("Update error:", error);
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    return handleApiError(error);
  }
}
