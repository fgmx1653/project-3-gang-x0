// app/api/inventory/[id]/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// Helper: works whether ctx.params is an object or a Promise
async function getParams(ctx: { params: { id: string } } | { params: Promise<{ id: string }> }) {
  // @ts-ignore – handle both shapes at runtime
  const p = await ctx.params;
  return p as { id: string };
}

/** PUT /api/inventory/:id  body: { name?, quantity?, price? } */
export async function PUT(req: Request, ctx: { params: { id: string } } | { params: Promise<{ id: string }> }) {
  const { id: idStr } = await getParams(ctx);
  const id = Number(idStr);
  if (Number.isNaN(id)) return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });

  const body = await req.json();
  const name = body?.name != null ? String(body.name).trim() : undefined;
  const quantity = body?.quantity != null ? Number(body.quantity) : undefined;
  const price = body?.price != null ? Number(body.price) : undefined;
  const istopping = body?.istopping != null ? (Number(body.istopping) === 1 ? 1 : 0) : undefined;

  const sets: string[] = [];
  const values: any[] = [];
  if (name !== undefined)      { values.push(name);      sets.push(`ingredients = $${values.length}`); }
  if (quantity !== undefined)  { values.push(quantity);  sets.push(`quantity = $${values.length}`); }
  if (price !== undefined)     { values.push(price);     sets.push(`price = $${values.length}`); }
  if (istopping !== undefined) { values.push(istopping); sets.push(`istopping = $${values.length}`); }
  if (sets.length === 0) return NextResponse.json({ ok: false, error: "No fields to update" }, { status: 400 });

  values.push(id);
  try {
    const row = (await pool.query(
      `update public.inventory
         set ${sets.join(", ")}
       where id = $${values.length}
       returning id, ingredients as name, price::numeric::float8 as price, quantity, COALESCE(istopping, 0) as istopping`,
      values
    )).rows[0];
    return NextResponse.json({ ok: true, item: row });
  } catch (e) {
    console.error("inventory PUT error:", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

/** PATCH /api/inventory/:id  body: { delta: number } */
export async function PATCH(req: Request, ctx: { params: { id: string } } | { params: Promise<{ id: string }> }) {
  const { id: idStr } = await getParams(ctx);
  const id = Number(idStr);
  if (Number.isNaN(id)) return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });

  const body = await req.json();
  const delta = Number(body?.delta);
  if (Number.isNaN(delta)) return NextResponse.json({ ok: false, error: "delta required" }, { status: 400 });

  try {
    const row = (await pool.query(
      `update public.inventory
         set quantity = quantity + $1
       where id = $2
       returning id, quantity`,
      [delta, id]
    )).rows[0];
    return NextResponse.json({ ok: true, item: row });
  } catch (e) {
    console.error("inventory PATCH error:", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

/** DELETE /api/inventory/:id */
export async function DELETE(_req: Request, ctx: { params: { id: string } } | { params: Promise<{ id: string }> }) {
  const { id: idStr } = await getParams(ctx);
  const id = Number(idStr);
  if (Number.isNaN(id)) return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });

  try {
    await pool.query(`delete from public.inventory where id = $1`, [id]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("inventory DELETE error:", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
