// app/api/trends/orders/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

/**
 * GET /api/trends/orders
 *   ?start=YYYY-MM-DD
 *   ?end=YYYY-MM-DD
 *   ?timeStart=HH:MM
 *   ?timeEnd=HH:MM
 *   ?employee=ID (optional)
 *   ?menu=ID     (optional)
 *   ?limit=100   (default 100, max 500)
 *   ?offset=0
 */
export async function GET(req: Request) {
  const url = new URL(req.url);

  const start = (url.searchParams.get("start") || "").slice(0, 10);
  const end   = (url.searchParams.get("end")   || "").slice(0, 10);
  const timeStart = (url.searchParams.get("timeStart") || "00:00").slice(0, 5);
  const timeEnd   = (url.searchParams.get("timeEnd")   || "23:59").slice(0, 5);

  const employee = url.searchParams.get("employee");
  const menu = url.searchParams.get("menu");

  const limit = Math.min(+(url.searchParams.get("limit") || 100), 500);
  const offset = Math.max(+(url.searchParams.get("offset") || 0), 0);

  const isoDate = /^\d{4}-\d{2}-\d{2}$/;
  const hhmm = /^\d{2}:\d{2}$/;

  const today = new Date();
  const toISO = (d: Date) =>
    new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
      .toISOString()
      .slice(0, 10);

  const defaultEnd = toISO(today);
  const defaultStart = toISO(new Date(today.getTime() - 6 * 24 * 3600 * 1000)); // last 7 days

  const startDate = isoDate.test(start) ? start : defaultStart;
  const endDate   = isoDate.test(end)   ? end   : defaultEnd;

  const tStart = hhmm.test(timeStart) ? timeStart : "00:00";
  const tEnd   = hhmm.test(timeEnd)   ? timeEnd   : "23:59";

  const wrap = tStart > tEnd;
  const timeCond = wrap
    ? `(o.order_time >= $3::time OR o.order_time <= $4::time)`
    : `(o.order_time >= $3::time AND o.order_time <= $4::time)`;

  const params: any[] = [startDate, endDate, tStart, tEnd];
  const extraConds: string[] = [];

  if (employee) {
    params.push(Number(employee));
    extraConds.push(`o.employee = $${params.length}`);
  }
  if (menu) {
    params.push(Number(menu));
    extraConds.push(`o.menu_item_id = $${params.length}`);
  }

  const where = `
    WHERE o.order_date >= $1::date
      AND o.order_date <= $2::date
      AND ${timeCond}
      ${extraConds.length ? `AND ${extraConds.join(" AND ")}` : ""}
  `;

  const withNames = `
    SELECT o.order_id, o.order_date, o.order_time,
           o.menu_item_id, mi.name AS menu_item_name,
           o.price::numeric::float8 AS price, o.employee
    FROM public.orders o
    JOIN public.menu_items mi ON mi.id = o.menu_item_id
    ${where}
    ORDER BY o.order_date ASC, o.order_time ASC, o.order_id ASC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const anon = `
    SELECT o.order_id, o.order_date, o.order_time,
           o.menu_item_id, NULL::text AS menu_item_name,
           o.price::numeric::float8 AS price, o.employee
    FROM public.orders o
    ${where}
    ORDER BY o.order_date ASC, o.order_time ASC, o.order_id ASC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const totalsSql = `
    SELECT
      COUNT(*)::int AS count,
      COALESCE(SUM(o.price),0)::numeric::float8 AS revenue
    FROM public.orders o
    ${where}
  `;

  const client = await pool.connect();
  try {
    const hasMenu = await client
      .query(`SELECT to_regclass('public.menu_items') IS NOT NULL AS ok`)
      .then(r => !!r.rows?.[0]?.ok);

    const [rowsRes, totalsRes] = await Promise.all([
      client.query(hasMenu ? withNames : anon, params),
      client.query(totalsSql, params),
    ]);

    const totals = totalsRes.rows[0] || { count: 0, revenue: 0 };

    return NextResponse.json({
      ok: true,
      start: startDate,
      end: endDate,
      timeStart: tStart,
      timeEnd: tEnd,
      wrap,
      count: totals.count,
      revenue: totals.revenue,
      items: rowsRes.rows,
    });
  } catch (e: any) {
    console.error("trends/orders GET error:", e);
    const msg =
      process.env.NODE_ENV === "production" ? "Server error" : `DB error: ${e?.message || e}`;
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  } finally {
    client.release();
  }
}
