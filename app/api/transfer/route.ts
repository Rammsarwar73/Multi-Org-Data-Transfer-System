import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { dataRows, organizations, transfers } from "@/app/lib/schema";
import { requireSession, handleApiError } from "@/app/lib/auth";
import { transferSchema } from "@/app/lib/validate";
import { checkTransferLimit } from "@/app/lib/rate-limit";
import { sendTransferNotification } from "@/app/lib/email";
import { eq, ne } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();

    // ── Rate limit ─────────────────────────────────────────────────────────────
    const rateResult = checkTransferLimit(session.orgId);
    if (!rateResult.success) {
      return NextResponse.json(
        { error: "Transfer limit reached. You may transfer up to 5 times per hour." },
        { status: 429 }
      );
    }

    // ── Parse & validate body ──────────────────────────────────────────────────
    const body = await req.json().catch(() => ({}));
    const parsed = transferSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }
    const { message } = parsed.data;

    // ── Find recipient org (the other org) ────────────────────────────────────
    const recipientOrg = await db.query.organizations.findFirst({
      where: ne(organizations.id, session.orgId),
    });

    if (!recipientOrg) {
      return NextResponse.json(
        { error: "No recipient organization found." },
        { status: 404 }
      );
    }

    // ── Get all current rows from the sender org ───────────────────────────────
    const senderRows = await db
      .select()
      .from(dataRows)
      .where(eq(dataRows.orgId, session.orgId));

    if (senderRows.length === 0) {
      return NextResponse.json(
        { error: "No data rows to transfer." },
        { status: 400 }
      );
    }

    // ── Create transfer record ─────────────────────────────────────────────────
    const [transfer] = await db
      .insert(transfers)
      .values({
        fromOrgId: session.orgId,
        toOrgId: recipientOrg.id,
        message: message.trim(),
        rowCount: String(senderRows.length),
      })
      .returning();

    // ── Copy rows to recipient org ─────────────────────────────────────────────
    // Each copied row gets sourceTransferId set, so:
    //   - Org B sees these rows
    //   - New rows Org A adds later (sourceTransferId = NULL, orgId = orgA) are NOT visible to Org B
    const BATCH_SIZE = 100;
    const rowsToInsert = senderRows.map((r) => ({
      orgId: recipientOrg.id,
      colA: r.colA,
      colB: r.colB,
      colC: r.colC,
      sourceTransferId: transfer.id,
    }));

    for (let i = 0; i < rowsToInsert.length; i += BATCH_SIZE) {
      await db.insert(dataRows).values(rowsToInsert.slice(i, i + BATCH_SIZE));
    }

    // ── Send email notification to recipient org ───────────────────────────────
    try {
      await sendTransferNotification({
        to: recipientOrg.email,
        fromOrgName: session.orgName,
        message: message.trim(),
        rowCount: senderRows.length,
        transferredAt: transfer.transferredAt,
      });
    } catch (emailErr) {
      // Non-fatal: log the error but don't fail the transfer
      console.error(
        JSON.stringify({
          event: "transfer_email_failed",
          transferId: transfer.id,
          error: emailErr instanceof Error ? emailErr.message : String(emailErr),
          timestamp: new Date().toISOString(),
        })
      );
    }

    console.log(
      JSON.stringify({
        event: "transfer_complete",
        transferId: transfer.id,
        fromOrgId: session.orgId,
        toOrgId: recipientOrg.id,
        rowCount: senderRows.length,
        timestamp: new Date().toISOString(),
      })
    );

    return NextResponse.json({
      success: true,
      transfer: {
        id: transfer.id,
        toOrgName: recipientOrg.name,
        rowCount: senderRows.length,
        transferredAt: transfer.transferredAt,
      },
    });
  } catch (error) {
    return handleApiError(error, "POST /api/transfer");
  }
}
