import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

// ─── OTP Email ────────────────────────────────────────────────────────────────
export async function sendOtp(to: string, code: string): Promise<void> {
  const actualTo = to.replace(/\+[^@]+/, "");
  const { error } = await resend.emails.send({
    from: FROM,
    to: actualTo,
    subject: "Your Secure Data Portal Login Code",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #091028; color: #edf2ff; border-radius: 12px;">
        <h1 style="font-size: 22px; margin-bottom: 8px; color: #657cff;">Secure Data Portal</h1>
        <p style="color: #aeb7d5; margin-bottom: 24px;">Your one-time login code:</p>
        <div style="font-size: 40px; font-weight: 700; letter-spacing: 10px; color: #fff; background: #1a244a; padding: 20px 28px; border-radius: 12px; text-align: center; border: 1px solid #324173;">
          ${code}
        </div>
        <p style="color: #aeb7d5; font-size: 13px; margin-top: 20px;">
          This code expires in <strong>10 minutes</strong>. If you did not request this, please ignore this email.
        </p>
      </div>
    `,
  });

  if (error) {
    console.error(
      JSON.stringify({ event: "email_otp_error", to, error, timestamp: new Date().toISOString() })
    );
    throw new Error("Failed to send OTP email.");
  }

  console.log(
    JSON.stringify({ event: "email_otp_sent", to, timestamp: new Date().toISOString() })
  );
}

// ─── Transfer Notification Email ──────────────────────────────────────────────
export async function sendTransferNotification(params: {
  to: string;
  fromOrgName: string;
  message: string;
  rowCount: number;
  transferredAt: Date;
}): Promise<void> {
  const { to, fromOrgName, message, rowCount, transferredAt } = params;
  const dateStr = transferredAt.toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "UTC",
  });

  const actualTo = to.replace(/\+[^@]+/, "");
  const { error } = await resend.emails.send({
    from: FROM,
    to: actualTo,
    subject: `New Data Transfer from ${fromOrgName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 32px; background: #091028; color: #edf2ff; border-radius: 12px;">
        <h1 style="font-size: 22px; margin-bottom: 4px; color: #657cff;">Secure Data Portal</h1>
        <p style="color: #aeb7d5; margin-bottom: 24px;">You have received a new data transfer.</p>

        <div style="background: #1a244a; border: 1px solid #324173; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
          <p style="margin: 0 0 8px 0;"><strong>From:</strong> ${fromOrgName}</p>
          <p style="margin: 0 0 8px 0;"><strong>Records transferred:</strong> ${rowCount.toLocaleString()}</p>
          <p style="margin: 0 0 8px 0;"><strong>Date:</strong> ${dateStr} UTC</p>
        </div>

        ${
          message
            ? `<div style="background: #131c3a; border-left: 3px solid #657cff; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                <p style="margin: 0 0 6px 0; font-size: 12px; color: #aeb7d5; text-transform: uppercase; letter-spacing: 1px;">Message from sender</p>
                <p style="margin: 0; color: #edf2ff;">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
              </div>`
            : ""
        }

        <p style="color: #aeb7d5; font-size: 13px; margin-top: 20px;">
          Log in to your dashboard to view the transferred data.
        </p>
      </div>
    `,
  });

  if (error) {
    console.error(
      JSON.stringify({ event: "email_transfer_notification_error", to, error, timestamp: new Date().toISOString() })
    );
    throw new Error("Failed to send transfer notification email.");
  }

  console.log(
    JSON.stringify({ event: "email_transfer_notification_sent", to, fromOrgName, rowCount, timestamp: new Date().toISOString() })
  );
}
