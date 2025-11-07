import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(req: Request) {
    try {
        const result = await pool.query("SELECT * FROM menu_items ORDER BY id");
        return NextResponse.json({ ok: true, items: result.rows });
    } catch (error) {
        console.error("Menu API GET error:", error);
        return NextResponse.json(
            { ok: false, error: "Server error" },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        // adapt to schema: menu_items(name, id, price, isavail, seasonal)
        // isavail and seasonal are integers (0/1) in DB, not booleans
        // omit id column entirely and let DB handle it
        const { name, price = null, isavail = true, seasonal = false } = body;

        // Get the next available ID manually
        const maxIdResult = await pool.query(
            "SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM menu_items"
        );
        const nextId = maxIdResult.rows[0].next_id;

        const result = await pool.query(
            "INSERT INTO menu_items (name, id, price, isavail, seasonal) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [name, nextId, price, isavail ? 1 : 0, seasonal ? 1 : 0]
        );

        return NextResponse.json(
            { ok: true, item: result.rows[0] },
            { status: 201 }
        );
    } catch (error) {
        console.error("Menu API POST error:", error);
        return NextResponse.json(
            { ok: false, error: "Server error" },
            { status: 500 }
        );
    }
}

export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const { id, ...fields } = body;

        // Check for null/undefined, but allow id of 0
        if (id === undefined || id === null) {
            return NextResponse.json(
                { ok: false, error: "Missing id" },
                { status: 400 }
            );
        }

        const keys = Object.keys(fields);
        if (keys.length === 0) {
            return NextResponse.json(
                { ok: false, error: "No fields to update" },
                { status: 400 }
            );
        }

        // map incoming JS field names directly to DB columns (expects: name, price, isavail, seasonal)
        // convert boolean fields to integers for DB
        const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
        const values = keys.map((k) => {
            const val = (fields as any)[k];
            // convert booleans to 0/1 for isavail and seasonal
            if (
                (k === "isavail" || k === "seasonal") &&
                typeof val === "boolean"
            ) {
                return val ? 1 : 0;
            }
            return val;
        });
        values.push(id);

        const q = `UPDATE menu_items SET ${setClauses} WHERE id = $${values.length} RETURNING *`;
        const result = await pool.query(q, values);

        return NextResponse.json({ ok: true, item: result.rows[0] });
    } catch (error) {
        console.error("Menu API PUT error:", error);
        return NextResponse.json(
            { ok: false, error: "Server error" },
            { status: 500 }
        );
    }
}

export async function DELETE(req: Request) {
    try {
        // accept id either as query param or in json body
        const url = new URL(req.url);
        const idParam = url.searchParams.get("id");
        let id: number | null = idParam !== null ? Number(idParam) : null;

        // If id not in query params, try body
        if (id === null) {
            const body = await req.json().catch(() => null);
            if (body && body.id !== undefined && body.id !== null) {
                id = Number(body.id);
            }
        }

        // Check for null/undefined, but allow id of 0
        if (id === null || id === undefined) {
            return NextResponse.json(
                { ok: false, error: "Missing id" },
                { status: 400 }
            );
        }

        await pool.query("DELETE FROM menu_items WHERE id = $1", [id]);
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Menu API DELETE error:", error);
        return NextResponse.json(
            { ok: false, error: "Server error" },
            { status: 500 }
        );
    }
}
