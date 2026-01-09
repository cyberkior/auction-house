import { NextRequest, NextResponse } from "next/server";
import { isValidAdminPassword, setAdminSession, clearAdminSession } from "@/lib/auth";

// POST /api/auth - Login
export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!isValidAdminPassword(password)) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    await setAdminSession();

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}

// DELETE /api/auth - Logout
export async function DELETE() {
  await clearAdminSession();
  return NextResponse.json({ success: true });
}
