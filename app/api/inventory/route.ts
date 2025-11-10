import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

/** GET /api/inventory?q=fruit&low=10 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();
  const low = url.searchParams.get("low");
  const lowNum = low != null ? Number(low) : undefined;

  const filters: string[] = [];
  const params: any[] = [];

  if (q) {
    params.push(`%${q}%`);
    filters.push(`lower(ingredients) LIKE $${params.length}`);
  }
  if (!Number.isNaN(lowNum) && lowNum !== undefined) {
    params.push(lowNum);
    filters.push(`quantity <= $${params.length}`);
  }

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  try {
    const result = await pool.query(
      `
      SELECT
        id,
        ingredients AS name,
        price::numeric::float8 AS price,
        quantity
      FROM public.inventory
      ${where}
      ORDER BY id ASC;
      `,
      params
    );
    return NextResponse.json({ ok: true, items: result.rows });
  } catch (e: any) {
    console.error("inventory GET error:", e);
    return NextResponse.json(
      { ok: false, error: `DB error: ${e.message || e}` },
      { status: 500 }
    );
  }
}

/** POST /api/inventory  body: { name, quantity, price } */
export async function POST(req: Request) {
  // Require JSON body
  const ct = req.headers.get("content-type") || "";
  if (!ct.toLowerCase().includes("application/json")) {
    return NextResponse.json(
      { ok: false, error: "Content-Type must be application/json" },
      { status: 415 }
    );
  }

  // Parse + validate
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const quantity = Number(body?.quantity);
  const price = Number(body?.price);

  if (!name) {
    return NextResponse.json({ ok: false, error: "Name required" }, { status: 400 });
  }
  if (!Number.isFinite(quantity) || quantity < 0) {
    return NextResponse.json({ ok: false, error: "Quantity must be non-negative" }, { status: 400 });
  }
  if (!Number.isFinite(price) || price < 0) {
    return NextResponse.json({ ok: false, error: "Price must be non-negative" }, { status: 400 });
  }

  // Attempt 1: normal insert (assumes DB generates id)
  const insertNoId = `
    INSERT INTO public.inventory (ingredients, quantity, price)
    VALUES ($1, $2, $3)
    RETURNING id, ingredients AS name, price::numeric::float8 AS price, quantity;
  `;

  try {
    const res1 = await pool.query(insertNoId, [name, quantity, price]);
    return NextResponse.json({ ok: true, item: res1.rows[0] });
  } catch (e: any) {
    // If id is NOT NULL and no default, fall back to app-generated id
    const pgCode = e?.code;     // e.g., '23502' for NOT NULL violation
    const column = e?.column;   // may be 'id'
    const isIdNull = pgCode === "23502" && (!column || column === "id" || /column "id"/i.test(String(e?.message)));

    if (!isIdNull) {
      const msg = process.env.NODE_ENV === "production" ? "Server error" : `DB error: ${e?.message || e}`;
      console.error("inventory POST error (attempt 1):", e);
      return NextResponse.json({ ok: false, error: msg }, { status: 500 });
    }
  }

  // Attempt 2 (fallback): compute next id as MAX(id)+1 and insert with explicit id.
  // Note: This is not safe for high-concurrency, but fine for a small project.
  const insertWithNextId = `
    WITH next AS (
      SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM public.inventory
    )
    INSERT INTO public.inventory (id, ingredients, quantity, price)
    SELECT next_id, $1, $2, $3 FROM next
    RETURNING id, ingredients AS name, price::numeric::float8 AS price, quantity;
  `;

  try {
    const res2 = await pool.query(insertWithNextId, [name, quantity, price]);
    return NextResponse.json({ ok: true, item: res2.rows[0], note: "Inserted with app-generated id (consider adding IDENTITY to the table)" });
  } catch (e2: any) {
    console.error("inventory POST error (fallback attempt):", e2);
    const msg = process.env.NODE_ENV === "production" ? "Server error" : `DB error: ${e2?.message || e2}`;
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
