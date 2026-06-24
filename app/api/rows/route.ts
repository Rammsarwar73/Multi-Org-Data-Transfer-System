import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { dataRows } from "@/app/lib/schema";
import { requireSession, handleApiError } from "@/app/lib/auth";
import { paginationSchema } from "@/app/lib/validate";
import { eq, desc, count } from "drizzle-orm";

// ── GET /api/rows — list paginated rows for current org ───────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();

    const { searchParams } = new URL(req.url);
    const parsed = paginationSchema.safeParse({
      page: searchParams.get("page") ?? 1,
      limit: searchParams.get("limit") ?? 50,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid pagination parameters." },
        { status: 400 }
      );
    }

    const { page, limit } = parsed.data;
    const offset = (page - 1) * limit;

    const [rows, totalResult] = await Promise.all([
      db
        .select()
        .from(dataRows)
        .where(eq(dataRows.orgId, session.orgId))
        .orderBy(desc(dataRows.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(dataRows)
        .where(eq(dataRows.orgId, session.orgId)),
    ]);

    const total = totalResult[0]?.total ?? 0;

    return NextResponse.json({
      rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleApiError(error, "GET /api/rows");
  }
}

// ── POST /api/rows — add a new row for current org ────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();

    const [newRow] = await db
      .insert(dataRows)
      .values({
        orgId: session.orgId,
        colA: "unlisted",
        colB: "unlisted",
        colC: "unlisted",
      })
      .returning();

    console.log(
      JSON.stringify({
        event: "row_added",
        rowId: newRow.id,
        orgId: session.orgId,
        timestamp: new Date().toISOString(),
      })
    );

    return NextResponse.json({ row: newRow }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "POST /api/rows");
  }
}
