import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getChicagoDate, getChicagoDateTimeString } from "@/lib/timezone";

/**
 * POST /api/reports/z-report
 * Generate Z-Report (saved to database, can only be done once per day)
 * Shows final daily sales totals and hourly breakdown
 * Automatically saved to reports table
 */
export async function POST() {
  try {
    // Use Chicago timezone for consistent date handling
    const todayDateStr = getChicagoDate(); // Format: YYYY-MM-DD in Chicago timezone

    // Check if Z-Report already exists for today
    const existingZReport = await pool.query(
      `SELECT report_id
       FROM public.reports
       WHERE report_type = 'Z-Report'
       AND DATE(date_created) = CURRENT_DATE
       LIMIT 1;`
    );

    if (existingZReport.rows.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "A Z-Report has already been generated for today. Only one Z-Report can be generated per day."
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

    // Format the report text
    const dateStr = todayDateStr;
    const generatedStr = getChicagoDateTimeString(); // Chicago timezone timestamp
    const totalSales = parseFloat(totals.rows[0].total_sales) || 0;
    const totalTaxes = parseFloat(totals.rows[0].total_taxes) || 0;
    const totalOrders = parseInt(totals.rows[0].total_orders) || 0;
    const totalItems = parseInt(totals.rows[0].total_items) || 0;
    const avgOrderValue = parseFloat(totals.rows[0].avg_order_value) || 0;

    let reportText = `═══════════════════════════════════════════════════\n`;
    reportText += `                    Z-REPORT                       \n`;
    reportText += `═══════════════════════════════════════════════════\n`;
    reportText += `Date: ${dateStr}\n`;
    reportText += `Generated: ${generatedStr}\n`;
    reportText += `═══════════════════════════════════════════════════\n\n`;
    reportText += `DAILY TOTALS\n`;
    reportText += `───────────────────────────────────────────────────\n`;
    reportText += `Total Sales:          $${totalSales.toFixed(2)}\n`;
    reportText += `Total Taxes:          $${totalTaxes.toFixed(2)}\n`;
    reportText += `Total Orders:         ${totalOrders}\n`;
    reportText += `Total Items Sold:     ${totalItems}\n`;
    reportText += `Average Order Value:  $${avgOrderValue.toFixed(2)}\n\n`;
    reportText += `HOURLY SALES BREAKDOWN\n`;
    reportText += `───────────────────────────────────────────────────\n`;
    reportText += `Hour                Orders        Sales      Items\n`;
    reportText += `───────────────────────────────────────────────────\n`;

    if (hourlySales.rows.length === 0) {
      reportText += `No sales recorded today.\n`;
    } else {
      hourlySales.rows.forEach((row: any) => {
        const hour = parseInt(row.hour);
        const nextHour = hour + 1;
        const hourStr = `${hour.toString().padStart(2, '0')}:00 - ${nextHour.toString().padStart(2, '0')}:00`;
        const orders = row.orders.toString().padStart(8);
        const sales = parseFloat(row.sales).toFixed(2);
        const items = row.items.toString().padStart(10);
        reportText += `${hourStr}      ${orders}  $ ${sales.padStart(10)}   ${items}\n`;
      });
    }

    reportText += `\nTOP 10 SELLING ITEMS\n`;
    reportText += `───────────────────────────────────────────────────\n`;
    reportText += `Item                                  Qty      Revenue\n`;
    reportText += `───────────────────────────────────────────────────\n`;

    if (topItems.rows.length === 0) {
      reportText += `No items sold today.\n`;
    } else {
      topItems.rows.forEach((item: any) => {
        const itemName = item.item_name.padEnd(35);
        const qty = item.quantity.toString().padStart(5);
        const revenue = parseFloat(item.revenue).toFixed(2);
        reportText += `${itemName}  ${qty}  $ ${revenue.padStart(10)}\n`;
      });
    }

    reportText += `\n═══════════════════════════════════════════════════\n`;
    reportText += `                 END OF REPORT                     \n`;
    reportText += `═══════════════════════════════════════════════════\n`;

    // Save Z-Report to database
    const reportName = `Z-Report - ${dateStr}`;

    // Try insert without explicit ID first
    try {
      const insertResult = await pool.query(
        `INSERT INTO public.reports (report_name, report_type, report_text, date_created)
         VALUES ($1, $2, $3, NOW())
         RETURNING report_id, report_name, report_type, date_created, report_text;`,
        [reportName, "Z-Report", reportText]
      );

      return NextResponse.json({
        ok: true,
        report: insertResult.rows[0],
        message: "Z-Report generated and saved successfully"
      });
    } catch (e: any) {
      // If report_id requires manual generation
      const pgCode = e?.code;
      if (pgCode === "23502") {
        const nextIdResult = await pool.query(
          `SELECT COALESCE(MAX(report_id), 0) + 1 AS next_id FROM public.reports;`
        );
        const nextId = nextIdResult.rows[0].next_id;

        const insertResult = await pool.query(
          `INSERT INTO public.reports (report_id, report_name, report_type, report_text, date_created)
           VALUES ($1, $2, $3, $4, NOW())
           RETURNING report_id, report_name, report_type, date_created, report_text;`,
          [nextId, reportName, "Z-Report", reportText]
        );

        return NextResponse.json({
          ok: true,
          report: insertResult.rows[0],
          message: "Z-Report generated and saved successfully"
        });
      }
      throw e;
    }
  } catch (e: any) {
    console.error("Z-Report error:", e);
    return NextResponse.json(
      { ok: false, error: `DB error: ${e.message || e}` },
      { status: 500 }
    );
  }
}
