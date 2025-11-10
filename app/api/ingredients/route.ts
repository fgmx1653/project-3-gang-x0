import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(req: Request) {
    try {
        const result = await pool.query("SELECT * FROM inventory ORDER BY id");
        return NextResponse.json({ ok: true, ingredients: result.rows });
    } catch (error) {
        console.error("Ingredients API GET error:", error);
        return NextResponse.json(
            { ok: false, error: "Server error" },
            { status: 500 }
        );
    }
}
