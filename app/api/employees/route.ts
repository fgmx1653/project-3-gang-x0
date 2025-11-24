import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  try {
    const res = await pool.query("SELECT * FROM employees ORDER BY id");
    return NextResponse.json({ ok: true, employees: res.rows });
  } catch (err: any) {
    console.error("GET /api/employees error", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      username = "",
      password = "",
      ismanager = 0,
      employdate = null,
      hrsalary = null,
      email = null,
      google_id = null,
      name = null,
    } = body;

    // Some DB schemas may not provide a default for `id`.
    // Use a safe fallback that assigns id = max(id)+1 when necessary.
    const q = `INSERT INTO employees (id, username, password, ismanager, employdate, hrsalary, email, google_id, name)
      VALUES ((SELECT COALESCE(MAX(id),0)+1 FROM employees), $1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`;
    const vals = [
      username,
      password,
      ismanager ? 1 : 0,
      employdate,
      hrsalary,
      email,
      google_id,
      name,
    ];
    const res = await pool.query(q, vals);
    return NextResponse.json({ ok: true, employee: res.rows[0] });
  } catch (err: any) {
    console.error("POST /api/employees error", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const id = body.id;
    if (!id)
      return NextResponse.json(
        { ok: false, error: "id required" },
        { status: 400 }
      );

    const allowed = [
      "username",
      "password",
      "ismanager",
      "employdate",
      "hrsalary",
      "email",
      "google_id",
      "name",
    ];
    const keys = Object.keys(body).filter(
      (k) => allowed.includes(k) && k !== "id"
    );
    if (keys.length === 0)
      return NextResponse.json(
        { ok: false, error: "no fields to update" },
        { status: 400 }
      );

    const set = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
    const vals = keys.map((k) => {
      // coerce boolean ismanager -> 0/1
      if (k === "ismanager") return body[k] ? 1 : 0;
      return body[k];
    });
    vals.push(id);
    const q = `UPDATE employees SET ${set} WHERE id = $${vals.length} RETURNING *`;
    const res = await pool.query(q, vals);
    return NextResponse.json({ ok: true, employee: res.rows[0] });
  } catch (err: any) {
    console.error("PUT /api/employees error", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id)
      return NextResponse.json(
        { ok: false, error: "id required" },
        { status: 400 }
      );
    const res = await pool.query(
      "DELETE FROM employees WHERE id = $1 RETURNING *",
      [Number(id)]
    );
    return NextResponse.json({ ok: true, employee: res.rows[0] });
  } catch (err: any) {
    console.error("DELETE /api/employees error", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
