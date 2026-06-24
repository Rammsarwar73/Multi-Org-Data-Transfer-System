import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { dataRows } from "@/app/lib/schema";
import { requireSession, handleApiError } from "@/app/lib/auth";
import { and, eq } from "drizzle-orm";

// ── DELETE /api/rows/[id] ──────────────────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Row ID is required." }, { status: 400 });
    }

    // Verify ownership before deleting — prevents cross-org deletion
    const deleted = await db
      .delete(dataRows)
      .where(and(eq(dataRows.id, id), eq(dataRows.orgId, session.orgId)))
      .returning({ id: dataRows.id });

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: "Row not found or you do not have permission to delete it." },
        { status: 404 }
      );
    }

    console.log(
      JSON.stringify({
        event: "row_deleted",
        rowId: id,
        orgId: session.orgId,
        timestamp: new Date().toISOString(),
      })
    );

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    return handleApiError(error, "DELETE /api/rows/[id]");
  }
}
