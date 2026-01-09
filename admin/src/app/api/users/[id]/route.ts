import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { isAuthenticated } from "@/lib/auth";

// GET /api/users/[id] - Get user details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Get user's auctions and reports
  const [{ data: auctions }, { data: reports }] = await Promise.all([
    supabase
      .from("auctions")
      .select("id, title, status, moderation_status, created_at")
      .eq("creator_id", params.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("reports")
      .select("id, category, outcome, created_at, auction:auctions(title)")
      .eq("auction_id", params.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return NextResponse.json({
    user: data,
    auctions: auctions || [],
    reports: reports || [],
  });
}

// PATCH /api/users/[id] - Update user (strike, restrict/unrestrict)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { action } = await request.json();

  const supabase = createAdminClient();

  // Get current user data
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("strikes, is_restricted")
    .eq("id", params.id)
    .single();

  if (userError || !user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let updates: Record<string, unknown> = {};

  switch (action) {
    case "strike":
      const newStrikes = (user.strikes || 0) + 1;
      updates = {
        strikes: newStrikes,
        is_restricted: newStrikes >= 3,
      };
      break;

    case "restrict":
      updates = { is_restricted: true };
      break;

    case "unrestrict":
      updates = { is_restricted: false };
      break;

    case "clear_strikes":
      updates = { strikes: 0 };
      break;

    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const { error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
