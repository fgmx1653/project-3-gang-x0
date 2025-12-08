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

        // Get all orders from today, grouped by order_id
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");
        const todayDate = `${year}-${month}-${day}`;

        console.log("Fetching orders for date:", todayDate);

        // Ensure cancelled_orders table exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS cancelled_orders (
                order_id INTEGER NOT NULL,
                order_date DATE NOT NULL,
                order_time TIME NOT NULL,
                menu_item_id INTEGER NOT NULL,
                price DECIMAL(10, 2) NOT NULL,
                employee INTEGER,
                boba INTEGER DEFAULT 100,
                ice INTEGER DEFAULT 100,
                sugar INTEGER DEFAULT 100,
                cancelled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Get orders from both orders table (active) and cancelled_orders table (cancelled)
        // Use UNION to avoid duplicates if an order exists in both tables
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
        AND NOT EXISTS (
          SELECT 1 FROM cancelled_orders co WHERE co.order_id = o.order_id
        )
      GROUP BY o.order_id, os.status
      
      UNION ALL
      
      SELECT
        co.order_id,
        MIN(co.order_date) as order_date,
        MIN(co.order_time) as order_time,
        MIN(co.employee) as employee,
        'cancelled' as status,
        json_agg(
          json_build_object(
            'menu_item_id', co.menu_item_id,
            'menu_item_name', COALESCE(m.name, 'Unknown Item'),
            'price', co.price,
            'boba', COALESCE(co.boba, 100),
            'ice', COALESCE(co.ice, 100),
            'sugar', COALESCE(co.sugar, 100)
          )
        ) as items
      FROM cancelled_orders co
      LEFT JOIN menu_items m ON co.menu_item_id = m.id
      WHERE co.order_date = $1
      GROUP BY co.order_id
      
      ORDER BY order_id DESC`,
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

        if (
            !status ||
            !["pending", "completed", "cancelled"].includes(status)
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Invalid status. Must be 'pending', 'completed', or 'cancelled'",
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
