import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { isAuthenticated } from "@/lib/auth";

// GET /api/reports - List reports
export async function GET(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const outcome = searchParams.get("outcome") || "pending";
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  const supabase = createAdminClient();

  let query = supabase
    .from("reports")
    .select(`
      *,
      reporter:users!reporter_id(id, wallet_address, username),
      auction:auctions(id, title, image_url, creator_id, moderation_status)
    `)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (outcome !== "all") {
    query = query.eq("outcome", outcome);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }

  return NextResponse.json({ reports: data || [] });
}
