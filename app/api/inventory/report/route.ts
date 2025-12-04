import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

/**
 * GET /api/inventory/report?threshold=10
 * Generate inventory report showing items below threshold and affected menu items
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const thresholdParam = url.searchParams.get("threshold");

  if (!thresholdParam) {
    return NextResponse.json(
      { ok: false, error: "Threshold parameter is required" },
      { status: 400 }
    );
  }

  const threshold = Number(thresholdParam);
  if (!Number.isFinite(threshold) || threshold < 0) {
    return NextResponse.json(
      { ok: false, error: "Threshold must be a non-negative number" },
      { status: 400 }
    );
  }

  try {
    // Get all inventory items below threshold
    const lowStockQuery = `
      SELECT
        id,
        ingredients AS name,
        quantity,
        price::numeric::float8 AS price
      FROM public.inventory
      WHERE quantity < $1
      ORDER BY quantity ASC, ingredients ASC;
    `;
    const lowStockResult = await pool.query(lowStockQuery, [threshold]);
    const lowStockItems = lowStockResult.rows;

    // Get IDs of low stock items
    const lowStockIds = lowStockItems.map((item: any) => item.id);

    // Find menu items that cannot be made due to low stock
    // A menu item cannot be made if ANY of its required ingredients are below threshold
    let affectedMenuItems: any[] = [];

    if (lowStockIds.length > 0) {
      const affectedMenuQuery = `
        SELECT DISTINCT
          mi.id,
          mi.name,
          mi.price::numeric::float8 AS price,
          array_agg(DISTINCT i.ingredients) AS missing_ingredients
        FROM menu_items mi
        INNER JOIN menu_recipe mr ON mi.id = mr.menu_item_id
        INNER JOIN inventory i ON mr.ingredient_id = i.id
        WHERE i.id = ANY($1::int[])
        GROUP BY mi.id, mi.name, mi.price
        ORDER BY mi.name ASC;
      `;
      const affectedMenuResult = await pool.query(affectedMenuQuery, [lowStockIds]);
      affectedMenuItems = affectedMenuResult.rows;
    }

    return NextResponse.json({
      ok: true,
      report: {
        threshold,
        lowStockItems,
        affectedMenuItems,
        summary: {
          totalLowStock: lowStockItems.length,
          totalAffectedMenuItems: affectedMenuItems.length,
        },
      },
    });
  } catch (e: any) {
    console.error("Inventory report error:", e);
    return NextResponse.json(
      { ok: false, error: `DB error: ${e.message || e}` },
      { status: 500 }
    );
  }
}
