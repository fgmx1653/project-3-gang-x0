import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

export async function POST(req: NextRequest) {
    try {
        const { userId, game = "matching" } = await req.json();

        if (!userId) {
            return NextResponse.json(
                { ok: false, error: "User ID is required" },
                { status: 400 }
            );
        }

        // Mark as played without awarding points
        const today = new Date().toISOString().split('T')[0];

        // Check if already marked for today
        const existing = await pool.query(
            `SELECT * FROM game_plays
             WHERE customer_id = $1
             AND play_date = $2
             AND game_type = $3`,
            [userId, today, game]
        );

        if (existing.rows.length === 0) {
            await pool.query(
                `INSERT INTO game_plays (customer_id, played_at, play_date, points_earned, completed, game_type)
                 VALUES ($1, NOW(), $2, 0, false, $3)`,
                [userId, today, game]
            );
        }

        return NextResponse.json({ ok: true });
    } catch (error: any) {
        console.error("Mark played error:", error);
        return NextResponse.json(
            { ok: false, error: error.message },
            { status: 500 }
        );
    }
}
