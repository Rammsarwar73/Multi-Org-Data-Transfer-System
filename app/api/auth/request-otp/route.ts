import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { otpCodes, users, organizations } from "@/app/lib/schema";
import { requestOtpSchema } from "@/app/lib/validate";
import { checkOtpLimit } from "@/app/lib/rate-limit";
import { sendOtp } from "@/app/lib/email";
import { handleApiError } from "@/app/lib/auth";
import { eq, and, gt } from "drizzle-orm";

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
  try {
    // ── Parse & validate body ──────────────────────────────────────────────────
    const body = await req.json().catch(() => ({}));
    const parsed = requestOtpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }
    const { email } = parsed.data;

    // ── Check rate limit ───────────────────────────────────────────────────────
    const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
    const rateKey = `otp:${ip}:${email}`;
    const rateLimitResult = checkOtpLimit(rateKey);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before requesting a new code." },
        { status: 429 }
      );
    }

    // ── Verify the email belongs to a known user ───────────────────────────────
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
      with: { organization: true },
    });

    if (!user) {
      // Security: don't reveal whether the email exists — always return success
      console.log(
        JSON.stringify({ event: "otp_request_unknown_email", email, timestamp: new Date().toISOString() })
      );
      return NextResponse.json({
        message: "If that email is registered, a code has been sent.",
      });
    }

    // ── Invalidate any existing unused OTPs for this email ────────────────────
    await db
      .update(otpCodes)
      .set({ used: true })
      .where(and(eq(otpCodes.email, email.toLowerCase()), eq(otpCodes.used, false)));

    // ── Generate & store new OTP ───────────────────────────────────────────────
    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await db.insert(otpCodes).values({
      email: email.toLowerCase(),
      code,
      expiresAt,
    });

    // ── Send OTP email ─────────────────────────────────────────────────────────
    await sendOtp(email, code);

    console.log(
      JSON.stringify({ event: "otp_sent", email, orgId: user.orgId, timestamp: new Date().toISOString() })
    );

    return NextResponse.json({
      message: "If that email is registered, a code has been sent.",
    });
  } catch (error) {
    return handleApiError(error, "POST /api/auth/request-otp");
  }
}
