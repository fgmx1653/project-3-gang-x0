import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

export async function POST(req: NextRequest) {
    try {
        const { userId, points, moves, time, score, game = "matching" } = await req.json();

        if (!userId || points === undefined) {
            return NextResponse.json(
                { ok: false, error: "User ID and points are required" },
                { status: 400 }
            );
        }

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Check if already played today
            const today = new Date().toISOString().split('T')[0];
            const existing = await client.query(
                `SELECT * FROM game_plays
                 WHERE customer_id = $1
                 AND play_date = $2
                 AND game_type = $3`,
                [userId, today, game]
            );

            if (existing.rows.length > 0) {
                await client.query('ROLLBACK');
                return NextResponse.json(
                    { ok: false, error: "Already played today" },
                    { status: 400 }
                );
            }

            // Record game play
            await client.query(
                `INSERT INTO game_plays (customer_id, played_at, play_date, points_earned, moves, time_seconds, score, completed, game_type)
                 VALUES ($1, NOW(), $2, $3, $4, $5, $6, true, $7)`,
                [userId, today, points, moves, time, score, game]
            );

            // Award points to customer
            await client.query(
                `UPDATE customers
                 SET points = COALESCE(points, 0) + $1
                 WHERE id = $2`,
                [points, userId]
            );

            await client.query('COMMIT');

            return NextResponse.json({
                ok: true,
                pointsAwarded: points,
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error: any) {
        console.error("Award points error:", error);
        return NextResponse.json(
            { ok: false, error: error.message },
            { status: 500 }
        );
    }
}
