import { NextRequest, NextResponse } from "next/server";
import { getSession, handleApiError } from "@/app/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ user: null });
    }
    return NextResponse.json({
      user: {
        email: session.email,
        orgId: session.orgId,
        orgName: session.orgName,
      },
    });
  } catch (error) {
    return handleApiError(error, "GET /api/auth/me");
  }
}
