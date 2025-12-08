import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(req: Request) {
  try {
    // Time window: past 1 month
    // For each category (milk, green, black, seasonal) pick the most-ordered menu_item_id

    const qMilk = `SELECT mi.id, COUNT(*) as cnt
      FROM orders o
      JOIN menu_items mi ON mi.id = o.menu_item_id
      WHERE o.order_date >= CURRENT_DATE - INTERVAL '1 month'
        AND mi.name ILIKE '%milk%'
        AND mi.name NOT ILIKE '%green%'
      GROUP BY mi.id
      ORDER BY cnt DESC
      LIMIT 1`;

    const qGreen = `SELECT mi.id, COUNT(*) as cnt
      FROM orders o
      JOIN menu_items mi ON mi.id = o.menu_item_id
      WHERE o.order_date >= CURRENT_DATE - INTERVAL '1 month'
        AND mi.name ILIKE '%green%'
      GROUP BY mi.id
      ORDER BY cnt DESC
      LIMIT 1`;

    const qBlack = `SELECT mi.id, COUNT(*) as cnt
      FROM orders o
      JOIN menu_items mi ON mi.id = o.menu_item_id
      WHERE o.order_date >= CURRENT_DATE - INTERVAL '1 month'
        AND mi.name ILIKE '%black%'
        AND mi.name NOT ILIKE '%milk%'
      GROUP BY mi.id
      ORDER BY cnt DESC
      LIMIT 1`;

    const qSeasonal = `SELECT mi.id, COUNT(*) as cnt
      FROM orders o
      JOIN menu_items mi ON mi.id = o.menu_item_id
      WHERE o.order_date >= CURRENT_DATE - INTERVAL '1 month'
        AND mi.seasonal = 1
      GROUP BY mi.id
      ORDER BY cnt DESC
      LIMIT 1`;

    const [milkRes, greenRes, blackRes, seasonalRes] = await Promise.all([
      pool.query(qMilk),
      pool.query(qGreen),
      pool.query(qBlack),
      pool.query(qSeasonal),
    ]);

    const popular = {
      milk: milkRes.rows[0]?.id ?? null,
      green: greenRes.rows[0]?.id ?? null,
      black: blackRes.rows[0]?.id ?? null,
      seasonal: seasonalRes.rows[0]?.id ?? null,
    };

    return NextResponse.json({ ok: true, popular });
  } catch (error) {
    console.error("Popular API error:", error);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
