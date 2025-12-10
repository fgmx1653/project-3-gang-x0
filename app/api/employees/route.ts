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

    // Normalize email: treat empty/whitespace-only strings as null and normalize casing
    const normalizedEmail =
      typeof email === "string" && email.trim() !== ""
        ? email.trim().toLowerCase()
        : null;
    // Normalize google_id similarly (empty -> null)
    const normalizedGoogleId =
      typeof google_id === "string" && google_id.trim() !== ""
        ? google_id.trim()
        : null;

    // If an email was provided (non-empty after normalization), ensure it's not already used
    if (normalizedEmail) {
      try {
        const check = await pool.query(
          "SELECT id FROM employees WHERE email = $1 LIMIT 1",
          [normalizedEmail]
        );
        if (check.rows && check.rows.length > 0) {
          return NextResponse.json(
            { ok: false, error: "email_in_use", message: "Email already in use" },
            { status: 409 }
          );
        }
      } catch (e) {
        // if check fails for some reason, continue to insertion and let the DB return a proper error
        console.warn("Could not verify existing email before insert", e);
      }
    }

    // If a google_id was provided (non-empty after normalization), ensure it's not already used
    if (normalizedGoogleId) {
      try {
        const checkG = await pool.query(
          "SELECT id FROM employees WHERE google_id = $1 LIMIT 1",
          [normalizedGoogleId]
        );
        if (checkG.rows && checkG.rows.length > 0) {
          return NextResponse.json(
            { ok: false, error: "google_id_in_use", message: "Google ID already in use" },
            { status: 409 }
          );
        }
      } catch (e) {
        console.warn("Could not verify existing google_id before insert", e);
      }
    }

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
      normalizedEmail,
      normalizedGoogleId,
      name,
    ];
    const res = await pool.query(q, vals);
    return NextResponse.json({ ok: true, employee: res.rows[0] });
  } catch (err: any) {
    console.error("POST /api/employees error", err);
    // Handle unique constraint (duplicate email) gracefully
    if (err) {
      if (err.code === "23505") {
        // Prefer constraint name if available
        const c = err.constraint || String(err);
        if (String(c).includes("employees_email_key") || String(err).includes("employees_email_key")) {
          return NextResponse.json(
            { ok: false, error: "email_in_use", message: "Email already in use" },
            { status: 409 }
          );
        }
        if (String(c).includes("employees_google_id_key") || String(err).includes("employees_google_id_key")) {
          return NextResponse.json(
            { ok: false, error: "google_id_in_use", message: "Google ID already in use" },
            { status: 409 }
          );
        }
      }
    }
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

    // If updating email or google_id, normalize them and check uniqueness (exclude current id)
    if (keys.includes("email")) {
      const rawEmail = body.email;
      const norm = typeof rawEmail === "string" && rawEmail.trim() !== "" ? rawEmail.trim().toLowerCase() : null;
      // replace body.email with normalized value used later when building vals
      body.email = norm;
      if (norm) {
        const check = await pool.query(
          "SELECT id FROM employees WHERE email = $1 AND id <> $2 LIMIT 1",
          [norm, id]
        );
        if (check.rows && check.rows.length > 0) {
          return NextResponse.json(
            { ok: false, error: "email_in_use", message: "Email already in use" },
            { status: 409 }
          );
        }
      }
    }

    if (keys.includes("google_id")) {
      const rawG = body.google_id;
      const normG = typeof rawG === "string" && rawG.trim() !== "" ? rawG.trim() : null;
      body.google_id = normG;
      if (normG) {
        const checkG = await pool.query(
          "SELECT id FROM employees WHERE google_id = $1 AND id <> $2 LIMIT 1",
          [normG, id]
        );
        if (checkG.rows && checkG.rows.length > 0) {
          return NextResponse.json(
            { ok: false, error: "google_id_in_use", message: "Google ID already in use" },
            { status: 409 }
          );
        }
      }
    }

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
