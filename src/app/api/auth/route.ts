import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { createServerClient } from "@/lib/supabase/server";
import { rateLimit, getRateLimitIdentifier } from "@/lib/rate-limit/limiter";
import { handleApiError } from "@/lib/errors/handler";
import { AuthenticationError } from "@/lib/errors/classes";
import { validateBody } from "@/lib/validation/middleware";
import { authSchema } from "@/lib/validation/schemas";

export async function POST(request: NextRequest) {
  try {
    await rateLimit(getRateLimitIdentifier(request), "strict");

    const body = await request.json();
    const { walletAddress, signature, message } = validateBody(authSchema, body);

    // Verify the signature
    const publicKey = new PublicKey(walletAddress);
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.decode(signature);

    const isValid = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKey.toBytes()
    );

    if (!isValid) {
      throw new AuthenticationError("Invalid signature");
    }

    // Verify message format (prevent replay attacks with timestamp)
    const messageLines = message.split("\n");
    const timestampLine = messageLines.find((line: string) =>
      line.startsWith("Timestamp:")
    );

    if (timestampLine) {
      const timestamp = parseInt(timestampLine.split(":")[1].trim());
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      if (Math.abs(now - timestamp) > fiveMinutes) {
        throw new AuthenticationError("Message expired");
      }
    }

    // Get or create user in database
    const supabase = createServerClient();
    const { data: user, error } = await supabase.rpc("get_or_create_user", {
      p_wallet_address: walletAddress,
    });

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to authenticate" },
        { status: 500 }
      );
    }

    // Create a simple session token (in production, use JWT with proper expiry)
    const sessionToken = bs58.encode(
      nacl.randomBytes(32)
    );

    // Return user data and session
    return NextResponse.json({
      user,
      sessionToken,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
