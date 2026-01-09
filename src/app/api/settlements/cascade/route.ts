import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// POST /api/settlements/cascade - Process expired settlements and cascade to next bidder
// This endpoint should be called by a cron job every minute
export async function POST(request: NextRequest) {
  try {
    // Optional: Verify cron secret for security
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = createServerClient();

    // Call the database function to process cascades
    const { data, error } = await supabase.rpc("process_settlement_cascade");

    if (error) {
      console.error("Cascade processing error:", error);
      return NextResponse.json(
        { error: "Failed to process cascades" },
        { status: 500 }
      );
    }

    const result = data?.[0] || { processed_count: 0, cascaded_count: 0, failed_count: 0 };

    return NextResponse.json({
      success: true,
      processed: result.processed_count,
      cascaded: result.cascaded_count,
      failed: result.failed_count,
    });
  } catch (error) {
    console.error("Error processing cascade:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/settlements/cascade - Check for pending expired settlements (diagnostic)
export async function GET() {
  try {
    const supabase = createServerClient();

    const { data: expiredSettlements, error } = await supabase
      .from("settlements")
      .select(`
        *,
        auction:auctions(id, title, winning_bid),
        winner:users!winner_id(wallet_address, username)
      `)
      .eq("status", "pending")
      .lt("payment_deadline", new Date().toISOString())
      .order("payment_deadline", { ascending: true });

    if (error) {
      console.error("Error fetching expired settlements:", error);
      return NextResponse.json(
        { error: "Failed to fetch expired settlements" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      count: expiredSettlements?.length || 0,
      settlements: expiredSettlements || [],
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
