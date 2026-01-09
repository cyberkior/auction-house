import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { uploadArtwork } from "@/lib/supabase/storage";

// POST /api/upload - Upload artwork image
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const walletAddress = formData.get("walletAddress") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address required" },
        { status: 400 }
      );
    }

    // Verify user exists
    const supabase = createServerClient();
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, is_restricted")
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
        { error: "User is restricted from uploading" },
        { status: 403 }
      );
    }

    // Upload the file
    const result = await uploadArtwork(file, user.id);

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ url: result.url });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
