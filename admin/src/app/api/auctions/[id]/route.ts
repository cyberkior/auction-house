import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { isAuthenticated } from "@/lib/auth";

// GET /api/auctions/[id] - Get single auction with details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("auctions")
    .select(`
      *,
      creator:users!creator_id(id, wallet_address, username, strikes, is_restricted),
      reports(id, category, description, outcome, created_at)
    `)
    .eq("id", params.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Auction not found" }, { status: 404 });
  }

  return NextResponse.json({ auction: data });
}

// PATCH /api/auctions/[id] - Update auction moderation status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { moderation_status } = await request.json();

  if (!moderation_status || !["pending", "approved", "flagged", "removed"].includes(moderation_status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("auctions")
    .update({ moderation_status })
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: "Failed to update auction" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
