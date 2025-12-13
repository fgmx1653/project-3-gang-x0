import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getChicagoDate, getChicagoDateTimeString } from "@/lib/timezone";

/**
 * GET /api/reports/x-report
 * Generate X-Report (temporary, not saved to database)
 * Shows hourly sales for current day
 * Can only be generated if no Z-Report exists for today
 */
export async function GET() {
  try {
    // Use Chicago timezone for consistent date handling
    const todayDateStr = getChicagoDate(); // Format: YYYY-MM-DD in Chicago timezone

    // Check if Z-Report has been generated for today
    const zReportCheck = await pool.query(
      `SELECT report_id
       FROM public.reports
       WHERE report_type = 'Z-Report'
       AND DATE(date_created) = CURRENT_DATE
       LIMIT 1;`
    );

    if (zReportCheck.rows.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Cannot generate X-Report: Z-Report has already been generated for today. Please wait until tomorrow."
        },
        { status: 400 }
      );
    }

    // Get hourly sales data
    const hourlySalesQuery = `
      SELECT
        EXTRACT(HOUR FROM order_time) AS hour,
        COUNT(DISTINCT order_id) AS orders,
        SUM(price) AS sales,
        COUNT(*) AS items
      FROM public.orders
      WHERE order_date = $1
      GROUP BY EXTRACT(HOUR FROM order_time)
      ORDER BY hour;
    `;

    const hourlySales = await pool.query(hourlySalesQuery, [todayDateStr]);

    // Get daily totals
    const totalsQuery = `
      SELECT
        COUNT(DISTINCT order_id) AS total_orders,
        COALESCE(SUM(price), 0) AS total_sales,
        COALESCE(SUM(price) * 0.0825, 0) AS total_taxes,
        COUNT(*) AS total_items,
        COALESCE(SUM(price) / NULLIF(COUNT(DISTINCT order_id), 0), 0) AS avg_order_value
      FROM public.orders
      WHERE order_date = $1;
    `;

    const totals = await pool.query(totalsQuery, [todayDateStr]);

    // Get top 10 selling items
    const topItemsQuery = `
      SELECT
        mi.name AS item_name,
        COUNT(*) AS quantity,
        SUM(o.price) AS revenue
      FROM public.orders o
      INNER JOIN public.menu_items mi ON o.menu_item_id = mi.id
      WHERE o.order_date = $1
      GROUP BY mi.name
      ORDER BY quantity DESC, revenue DESC
      LIMIT 10;
    `;

    const topItems = await pool.query(topItemsQuery, [todayDateStr]);

    return NextResponse.json({
      ok: true,
      report: {
        type: "X-Report",
        date: todayDateStr,
        generated: getChicagoDateTimeString(), // Chicago timezone timestamp
        totals: totals.rows[0],
        hourlySales: hourlySales.rows,
        topItems: topItems.rows,
      },
    });
  } catch (e: any) {
    console.error("X-Report error:", e);
    return NextResponse.json(
      { ok: false, error: `DB error: ${e.message || e}` },
      { status: 500 }
    );
  }
}
