import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { otpCodes, users } from "@/app/lib/schema";
import { verifyOtpSchema } from "@/app/lib/validate";
import { signToken, setSessionCookie, handleApiError } from "@/app/lib/auth";
import { and, eq, gt } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    // ── Parse & validate ──────────────────────────────────────────────────────
    const body = await req.json().catch(() => ({}));
    const parsed = verifyOtpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }
    const { email, code } = parsed.data;

    // ── Find valid, unexpired OTP ─────────────────────────────────────────────
    const now = new Date();
    const otp = await db.query.otpCodes.findFirst({
      where: and(
        eq(otpCodes.email, email.toLowerCase()),
        eq(otpCodes.code, code),
        eq(otpCodes.used, false),
        gt(otpCodes.expiresAt, now)
      ),
    });

    if (!otp) {
      console.log(
        JSON.stringify({ event: "otp_verify_failed", email, timestamp: new Date().toISOString() })
      );
      return NextResponse.json(
        { error: "Invalid or expired code. Please request a new one." },
        { status: 401 }
      );
    }

    // ── Mark OTP as used ──────────────────────────────────────────────────────
    await db
      .update(otpCodes)
      .set({ used: true })
      .where(eq(otpCodes.id, otp.id));

    // ── Load user + org ───────────────────────────────────────────────────────
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
      with: { organization: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // ── Sign JWT and set cookie ───────────────────────────────────────────────
    const token = await signToken({
      userId: user.id,
      orgId: user.orgId,
      orgName: user.organization.name,
      email: user.email,
    });

    console.log(
      JSON.stringify({
        event: "login_success",
        email,
        orgId: user.orgId,
        timestamp: new Date().toISOString(),
      })
    );

    const response = NextResponse.json({
      success: true,
      user: {
        email: user.email,
        orgId: user.orgId,
        orgName: user.organization.name,
      },
    });

    return setSessionCookie(response, token);
  } catch (error) {
    return handleApiError(error, "POST /api/auth/verify-otp");
  }
}
