import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// Small fallback dataset used during local development when the database is unavailable.
const FALLBACK_MENU = [
  { id: 1, name: "Classic Milk Tea", price: 3.5, seasonal: 0 },
  { id: 2, name: "Taro Milk Tea", price: 4.0, seasonal: 0 },
  { id: 3, name: "Matcha Green Tea", price: 3.75, seasonal: 0 },
  { id: 4, name: "Brown Sugar Boba", price: 4.25, seasonal: 1 },
];

export async function GET(req: Request) {
  try {
    // Try to return all menu items from the database
    const result = await pool.query("SELECT * FROM menu_items ORDER BY id");
    return NextResponse.json({ ok: true, items: result.rows });
  } catch (error) {
    // Log the error, but return fallback data so the kiosk and menu UI remain usable during dev.
    console.error("Menu API error (using fallback):", error);
    return NextResponse.json({
      ok: true,
      items: FALLBACK_MENU,
      fallback: true,
    });
  }
}
