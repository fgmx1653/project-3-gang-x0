import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const start = searchParams.get("start") || "";
    const end = searchParams.get("end") || "";

    if (!start || !end) {
      return NextResponse.json({ ok: false, error: "Start and end dates are required" });
    }

    const client = await pool.connect();

    try {
      // Get ingredient usage from menu items (multiplied by size)
      const ingredientUsageQuery = `
        SELECT
          inv.id,
          inv.ingredients as name,
          SUM(COALESCE(o.size, 1)) as total_used
        FROM orders o
        JOIN menu_recipe mr ON o.menu_item_id = mr.menu_item_id
        JOIN inventory inv ON mr.ingredient_id = inv.id
        WHERE o.order_date >= $1 AND o.order_date <= $2
        GROUP BY inv.id, inv.ingredients
        ORDER BY total_used DESC
      `;

      const ingredientUsageResult = await client.query(ingredientUsageQuery, [start, end]);

      // Get topping usage from order_toppings (always count as 1)
      const toppingUsageQuery = `
        SELECT
          inv.id,
          inv.ingredients as name,
          COUNT(*) as total_used
        FROM order_toppings ot
        JOIN inventory inv ON ot.topping_id = inv.id
        JOIN orders o ON ot.order_id = o.order_id AND ot.order_item_id = o.order_item_id
        WHERE o.order_date >= $1 AND o.order_date <= $2
        GROUP BY inv.id, inv.ingredients
        ORDER BY total_used DESC
      `;

      const toppingUsageResult = await client.query(toppingUsageQuery, [start, end]);

      // Combine the results
      const usageMap = new Map<number, { id: number; name: string; total_used: number }>();

      // Add ingredient usage
      ingredientUsageResult.rows.forEach((row) => {
        usageMap.set(row.id, {
          id: row.id,
          name: row.name,
          total_used: parseInt(row.total_used),
        });
      });

      // Add topping usage (or combine if ingredient already exists)
      toppingUsageResult.rows.forEach((row) => {
        const existing = usageMap.get(row.id);
        if (existing) {
          existing.total_used += parseInt(row.total_used);
        } else {
          usageMap.set(row.id, {
            id: row.id,
            name: row.name,
            total_used: parseInt(row.total_used),
          });
        }
      });

      // Convert map to array and sort by usage
      const usage = Array.from(usageMap.values()).sort((a, b) => b.total_used - a.total_used);

      return NextResponse.json({
        ok: true,
        usage,
        start,
        end,
      });
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error("Error fetching inventory usage:", err);
    return NextResponse.json({
      ok: false,
      error: err.message || "Failed to fetch inventory usage",
    });
  }
}
