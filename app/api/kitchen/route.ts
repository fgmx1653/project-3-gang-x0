import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(req: Request) {
    try {
        // First, ensure order_status table exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS order_status (
                order_id INTEGER PRIMARY KEY,
                status VARCHAR(20) DEFAULT 'pending',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Get all orders from today (CST), grouped by order_id
        const now = new Date();
        const formatter = new Intl.DateTimeFormat("en-US", {
            timeZone: "America/Chicago",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        });
        const parts = formatter.formatToParts(now);
        const getPart = (type: string) => parts.find(p => p.type === type)?.value;
        
        const year = getPart('year');
        const month = getPart('month');
        const day = getPart('day');
        const todayDate = `${year}-${month}-${day}`;

        console.log("Fetching orders for date (CST):", todayDate);

        const result = await pool.query(
            `SELECT
        o.order_id,
        MIN(o.order_date) as order_date,
        MIN(o.order_time) as order_time,
        MIN(o.employee) as employee,
        COALESCE(os.status, 'pending') as status,
        json_agg(
          json_build_object(
            'menu_item_id', o.menu_item_id,
            'menu_item_name', COALESCE(m.name, 'Unknown Item'),
            'price', o.price,
            'boba', COALESCE(o.boba, 100),
            'ice', COALESCE(o.ice, 100),
            'sugar', COALESCE(o.sugar, 100)
          )
        ) as items
      FROM orders o
      LEFT JOIN menu_items m ON o.menu_item_id = m.id
      LEFT JOIN order_status os ON o.order_id = os.order_id
      WHERE o.order_date = $1
      GROUP BY o.order_id, os.status
      ORDER BY o.order_id DESC`,
            [todayDate]
        );

        console.log("Found", result.rows.length, "orders");

        return NextResponse.json({
            ok: true,
            orders: result.rows,
        });
    } catch (error) {
        console.error("Kitchen orders fetch error:", error);
        console.error(
            "Error details:",
            error instanceof Error ? error.message : String(error)
        );
        return NextResponse.json(
            {
                ok: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to fetch orders",
            },
            { status: 500 }
        );
    }
}

// Mark order as completed or change status
export async function POST(req: Request) {
    try {
        const { orderId, status } = await req.json();

        if (!orderId) {
            return NextResponse.json(
                { ok: false, error: "Order ID required" },
                { status: 400 }
            );
        }

        if (!status || !["pending", "completed"].includes(status)) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Invalid status. Must be 'pending' or 'completed'",
                },
                { status: 400 }
            );
        }

        // Upsert status into order_status table
        await pool.query(
            `INSERT INTO order_status (order_id, status, updated_at)
             VALUES ($1, $2, CURRENT_TIMESTAMP)
             ON CONFLICT (order_id) 
             DO UPDATE SET status = $2, updated_at = CURRENT_TIMESTAMP`,
            [orderId, status]
        );

        console.log(`Order ${orderId} marked as ${status}`);

        return NextResponse.json({
            ok: true,
            message: `Order ${orderId} marked as ${status}`,
        });
    } catch (error) {
        console.error("Kitchen order update error:", error);
        return NextResponse.json(
            { ok: false, error: "Failed to update order" },
            { status: 500 }
        );
    }
}
