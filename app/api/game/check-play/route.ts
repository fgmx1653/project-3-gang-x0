import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("userId");

        if (!userId) {
            return NextResponse.json(
                { ok: false, error: "User ID is required" },
                { status: 400 }
            );
        }

        // Check if user has played today (based on date, not timestamp)
        const today = new Date().toISOString().split('T')[0];

        const result = await pool.query(
            `SELECT * FROM game_plays
             WHERE customer_id = $1
             AND play_date = $2`,
            [userId, today]
        );

        const hasPlayedToday = result.rows.length > 0;

        return NextResponse.json({
            ok: true,
            hasPlayedToday,
        });
    } catch (error: any) {
        console.error("Check play status error:", error);
        return NextResponse.json(
            { ok: false, error: error.message },
            { status: 500 }
        );
    }
}
