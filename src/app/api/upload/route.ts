import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { uploadArtwork } from "@/lib/supabase/storage";
import { rateLimit, getRateLimitIdentifier } from "@/lib/rate-limit/limiter";
import { handleApiError } from "@/lib/errors/handler";
import {
  NotFoundError,
  AuthorizationError,
  ValidationError,
} from "@/lib/errors/classes";

// POST /api/upload - Upload artwork image
export async function POST(request: NextRequest) {
  try {
    await rateLimit(getRateLimitIdentifier(request), "moderate");

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const walletAddress = formData.get("walletAddress") as string | null;

    if (!file) {
      throw new ValidationError("No file provided", [
        { field: "file", message: "File is required" },
      ]);
    }

    if (!walletAddress) {
      throw new ValidationError("Wallet address required", [
        { field: "walletAddress", message: "Wallet address is required" },
      ]);
    }

    // Verify user exists
    const supabase = createServerClient();
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, is_restricted")
      .eq("wallet_address", walletAddress)
      .single();

    if (userError || !user) {
      throw new NotFoundError("User");
    }

    if (user.is_restricted) {
      throw new AuthorizationError("User is restricted from uploading");
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
    return handleApiError(error);
  }
}
