import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { isAuthenticated } from "@/lib/auth";

// GET /api/reports/[id] - Get single report
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("reports")
    .select(`
      *,
      reporter:users!reporter_id(id, wallet_address, username, strikes),
      auction:auctions(
        id, title, description, image_url, creator_id, moderation_status,
        creator:users!creator_id(id, wallet_address, username, strikes, is_restricted)
      )
    `)
    .eq("id", params.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  return NextResponse.json({ report: data });
}

// PATCH /api/reports/[id] - Update report outcome
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { outcome, strikeUser, removeAuction } = await request.json();

  if (!outcome || !["dismissed", "actioned"].includes(outcome)) {
    return NextResponse.json({ error: "Invalid outcome" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Get report details
  const { data: report, error: reportError } = await supabase
    .from("reports")
    .select(`
      *,
      auction:auctions(id, creator_id)
    `)
    .eq("id", params.id)
    .single();

  if (reportError || !report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  // Update report outcome
  await supabase
    .from("reports")
    .update({ outcome })
    .eq("id", params.id);

  // If actioned, apply consequences
  if (outcome === "actioned") {
    const auction = report.auction as { id: string; creator_id: string };

    // Remove auction if requested
    if (removeAuction && auction) {
      await supabase
        .from("auctions")
        .update({ moderation_status: "removed" })
        .eq("id", auction.id);
    }

    // Strike user if requested
    if (strikeUser && auction) {
      const { data: user } = await supabase
        .from("users")
        .select("strikes")
        .eq("id", auction.creator_id)
        .single();

      if (user) {
        const newStrikes = (user.strikes || 0) + 1;
        await supabase
          .from("users")
          .update({
            strikes: newStrikes,
            is_restricted: newStrikes >= 3,
          })
          .eq("id", auction.creator_id);
      }
    }
  }

  return NextResponse.json({ success: true });
}
