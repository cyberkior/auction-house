import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// GET /api/auctions - List auctions with search and filtering
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");
    const trending = searchParams.get("trending") === "true";

    // Search and filter params
    const query_text = searchParams.get("q");
    const tags = searchParams.get("tags");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const sort = searchParams.get("sort") || "newest";

    const supabase = createServerClient();

    // First update auction statuses based on time
    await supabase.rpc("update_auction_statuses");

    // Build base query
    let dbQuery = supabase
      .from("auctions")
      .select(
        `
        *,
        creator:users!creator_id(id, wallet_address, username, avatar_url, credits),
        bids(count)
      `
      )
      .in("moderation_status", ["pending", "approved"]); // Show pending and approved

    // Full-text search
    if (query_text && query_text.trim()) {
      // Convert query to tsquery format (add :* for prefix matching)
      const searchTerms = query_text.trim().split(/\s+/).map(term => `${term}:*`).join(" & ");
      dbQuery = dbQuery.textSearch("search_vector", searchTerms, {
        type: "websearch",
        config: "english",
      });
    }

    // Filter by status
    if (status && ["upcoming", "current", "past", "settling", "completed", "failed"].includes(status)) {
      dbQuery = dbQuery.eq("status", status);
    } else if (status === "active") {
      dbQuery = dbQuery.in("status", ["upcoming", "current"]);
    }

    // Filter by tags (array contains)
    if (tags) {
      const tagArray = tags.split(",").map(t => t.trim().toLowerCase()).filter(Boolean);
      if (tagArray.length > 0) {
        dbQuery = dbQuery.contains("tags", tagArray);
      }
    }

    // Price range filter (using winning_bid or reserve_price)
    if (minPrice) {
      const min = parseInt(minPrice);
      if (!isNaN(min)) {
        dbQuery = dbQuery.gte("reserve_price", min);
      }
    }
    if (maxPrice) {
      const max = parseInt(maxPrice);
      if (!isNaN(max)) {
        dbQuery = dbQuery.lte("reserve_price", max);
      }
    }

    // Sorting
    switch (sort) {
      case "ending_soon":
        dbQuery = dbQuery
          .in("status", ["current"])
          .order("end_time", { ascending: true });
        break;
      case "newest":
        dbQuery = dbQuery.order("created_at", { ascending: false });
        break;
      case "price_low":
        dbQuery = dbQuery.order("reserve_price", { ascending: true });
        break;
      case "price_high":
        dbQuery = dbQuery.order("reserve_price", { ascending: false });
        break;
      default:
        dbQuery = dbQuery.order("created_at", { ascending: false });
    }

    // Trending filter (override sort)
    if (trending) {
      dbQuery = dbQuery
        .in("status", ["current", "upcoming"])
        .order("created_at", { ascending: false });
    }

    // Pagination
    dbQuery = dbQuery.range(offset, offset + limit - 1);

    const { data: auctions, error } = await dbQuery;

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch auctions" },
        { status: 500 }
      );
    }

    // Get highest bid for each auction
    const auctionsWithBids = await Promise.all(
      (auctions || []).map(async (auction) => {
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

    // Sort by most_bids after fetching if needed
    if (sort === "most_bids") {
      auctionsWithBids.sort((a, b) => (b.bids_count || 0) - (a.bids_count || 0));
    }

    return NextResponse.json({ auctions: auctionsWithBids });
  } catch (error) {
    console.error("Error fetching auctions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/auctions - Create auction
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      walletAddress,
      title,
      description,
      imageUrl,
      tags,
      reservePrice,
      minBidIncrement,
      startTime,
      endTime,
    } = body;

    // Validation
    if (!walletAddress || !title || !description || !imageUrl) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (title.length < 3 || title.length > 100) {
      return NextResponse.json(
        { error: "Title must be 3-100 characters" },
        { status: 400 }
      );
    }

    if (minBidIncrement <= 0) {
      return NextResponse.json(
        { error: "Min bid increment must be positive" },
        { status: 400 }
      );
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    const now = new Date();

    if (start <= now) {
      return NextResponse.json(
        { error: "Start time must be in the future" },
        { status: 400 }
      );
    }

    if (end <= start) {
      return NextResponse.json(
        { error: "End time must be after start time" },
        { status: 400 }
      );
    }

    if (end.getTime() - start.getTime() < 60 * 60 * 1000) {
      return NextResponse.json(
        { error: "Auction must be at least 1 hour" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Get user
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, is_restricted, credits")
      .eq("wallet_address", walletAddress)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (user.is_restricted) {
      return NextResponse.json(
        { error: "User is restricted from creating auctions" },
        { status: 403 }
      );
    }

    // Create auction
    const { data: auction, error: auctionError } = await supabase
      .from("auctions")
      .insert({
        creator_id: user.id,
        title,
        description,
        image_url: imageUrl,
        tags: tags || [],
        reserve_price: reservePrice || 0,
        min_bid_increment: minBidIncrement,
        start_time: startTime,
        end_time: endTime,
        status: "upcoming",
        moderation_status: "pending",
      })
      .select()
      .single();

    if (auctionError) {
      console.error("Failed to create auction:", auctionError);
      return NextResponse.json(
        { error: "Failed to create auction" },
        { status: 500 }
      );
    }

    // Award credits for creating auction
    await supabase
      .from("users")
      .update({ credits: user.credits + 10 })
      .eq("id", user.id);

    return NextResponse.json({ auction }, { status: 201 });
  } catch (error) {
    console.error("Error creating auction:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
