import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, handleApiError } from "@/app/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const response = NextResponse.json({ success: true });
    return clearSessionCookie(response);
  } catch (error) {
    return handleApiError(error, "POST /api/auth/logout");
  }
}
