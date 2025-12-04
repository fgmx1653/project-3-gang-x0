import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

/**
 * POST /api/reports
 * Save a report to the database
 * Body: { report_name, report_type, report_text }
 */
export async function POST(req: Request) {
  const ct = req.headers.get("content-type") || "";
  if (!ct.toLowerCase().includes("application/json")) {
    return NextResponse.json(
      { ok: false, error: "Content-Type must be application/json" },
      { status: 415 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const report_name = typeof body?.report_name === "string" ? body.report_name.trim() : "";
  const report_type = typeof body?.report_type === "string" ? body.report_type.trim() : "";
  const report_text = typeof body?.report_text === "string" ? body.report_text : "";

  if (!report_name) {
    return NextResponse.json(
      { ok: false, error: "report_name is required" },
      { status: 400 }
    );
  }

  if (!report_type) {
    return NextResponse.json(
      { ok: false, error: "report_type is required" },
      { status: 400 }
    );
  }

  if (!report_text) {
    return NextResponse.json(
      { ok: false, error: "report_text is required" },
      { status: 400 }
    );
  }

  try {
    // Try to insert without explicit report_id first (if DB has auto-increment)
    const insertQuery = `
      INSERT INTO public.reports (report_name, report_type, report_text, date_created)
      VALUES ($1, $2, $3, NOW())
      RETURNING report_id, report_name, report_type, date_created, report_text;
    `;

    try {
      const result = await pool.query(insertQuery, [report_name, report_type, report_text]);
      return NextResponse.json(
        { ok: true, report: result.rows[0] },
        { status: 201 }
      );
    } catch (e: any) {
      // If report_id is NOT NULL and no default, fall back to app-generated id
      const pgCode = e?.code;
      const column = e?.column;
      const isIdNull = pgCode === "23502" && (!column || column === "report_id" || /column "report_id"/i.test(String(e?.message)));

      if (!isIdNull) {
        throw e; // Re-throw if it's a different error
      }

      // Fallback: generate next report_id manually
      const insertWithIdQuery = `
        WITH next AS (
          SELECT COALESCE(MAX(report_id), 0) + 1 AS next_id FROM public.reports
        )
        INSERT INTO public.reports (report_id, report_name, report_type, report_text, date_created)
        SELECT next_id, $1, $2, $3, NOW() FROM next
        RETURNING report_id, report_name, report_type, date_created, report_text;
      `;

      const result = await pool.query(insertWithIdQuery, [report_name, report_type, report_text]);
      return NextResponse.json(
        { ok: true, report: result.rows[0], note: "Used app-generated report_id" },
        { status: 201 }
      );
    }
  } catch (e: any) {
    console.error("Reports POST error:", e);
    const msg = process.env.NODE_ENV === "production" ? "Server error" : `DB error: ${e?.message || e}`;
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/**
 * GET /api/reports
 * Retrieve all reports or filter by type
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const report_type = url.searchParams.get("type");

  try {
    let query = "SELECT * FROM public.reports";
    const params: any[] = [];

    if (report_type) {
      query += " WHERE report_type = $1";
      params.push(report_type);
    }

    query += " ORDER BY date_created DESC;";

    const result = await pool.query(query, params);
    return NextResponse.json({ ok: true, reports: result.rows });
  } catch (e: any) {
    console.error("Reports GET error:", e);
    return NextResponse.json(
      { ok: false, error: `DB error: ${e.message || e}` },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/reports?id=123
 * Delete a report by ID
 */
export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const report_id = url.searchParams.get("id");

  if (!report_id) {
    return NextResponse.json(
      { ok: false, error: "report_id is required" },
      { status: 400 }
    );
  }

  try {
    const result = await pool.query(
      "DELETE FROM public.reports WHERE report_id = $1 RETURNING report_id;",
      [parseInt(report_id)]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Report not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Report deleted successfully",
      deleted_id: result.rows[0].report_id
    });
  } catch (e: any) {
    console.error("Reports DELETE error:", e);
    const msg = process.env.NODE_ENV === "production" ? "Server error" : `DB error: ${e?.message || e}`;
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
