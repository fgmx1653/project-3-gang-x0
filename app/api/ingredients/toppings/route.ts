import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

/** GET /api/ingredients/toppings - Get all inventory items marked as toppings */
export async function GET() {
  try {
    const result = await pool.query(
      `SELECT 
        id,
        ingredients AS name,
        price::numeric::float8 AS price,
        quantity
      FROM public.inventory
      WHERE istopping = 1
      ORDER BY ingredients ASC`
    );
    
    return NextResponse.json({ ok: true, toppings: result.rows });
  } catch (e: any) {
    console.error("toppings GET error:", e);
    return NextResponse.json(
      { ok: false, error: `DB error: ${e.message || e}` },
      { status: 500 }
    );
  }
}
