import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { transfers, organizations, dataRows } from "@/app/lib/schema";
import { requireSession, handleApiError } from "@/app/lib/auth";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();

    // Fetch all transfers received by this org, including sender info
    const received = await db.query.transfers.findMany({
      where: eq(transfers.toOrgId, session.orgId),
      with: {
        fromOrg: true,
      },
      orderBy: [desc(transfers.transferredAt)],
    });

    const inboxItems = received.map((t) => ({
      id: t.id,
      fromOrgName: t.fromOrg.name,
      fromOrgEmail: t.fromOrg.email,
      message: t.message,
      rowCount: Number(t.rowCount),
      transferredAt: t.transferredAt,
    }));

    return NextResponse.json({ transfers: inboxItems });
  } catch (error) {
    return handleApiError(error, "GET /api/inbox");
  }
}
