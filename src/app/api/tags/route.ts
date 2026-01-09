import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { rateLimit, getRateLimitIdentifier } from "@/lib/rate-limit/limiter";
import { handleApiError } from "@/lib/errors/handler";

// GET /api/tags - Get popular tags for filtering
export async function GET(request: NextRequest) {
  try {
    await rateLimit(getRateLimitIdentifier(request), "lenient");

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "20");

    const supabase = createServerClient();

    const { data, error } = await supabase.rpc("get_popular_tags", {
      limit_count: limit,
    });

    if (error) {
      console.error("Error fetching tags:", error);
      return NextResponse.json(
        { error: "Failed to fetch tags" },
        { status: 500 }
      );
    }

    return NextResponse.json({ tags: data || [] });
  } catch (error) {
    return handleApiError(error);
  }
}
