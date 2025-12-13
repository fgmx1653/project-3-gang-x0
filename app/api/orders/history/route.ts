import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const customerId = searchParams.get("customerId");

        if (!customerId) {
            return NextResponse.json(
                { ok: false, error: "Customer ID required" },
                { status: 400 }
            );
        }

        // Get orders for this customer with their items
        const result = await pool.query(
            `SELECT
                o.order_id,
                o.order_date,
                o.order_time,
                COALESCE(os.status, 'pending') as status,
                json_agg(
                    json_build_object(
                        'menu_item_id', o.menu_item_id,
                        'menu_item_name', COALESCE(m.name, 'Unknown Item'),
                        'price', o.price,
                        'size', COALESCE(o.size, 1),
                        'boba', COALESCE(o.boba, 100),
                        'ice', COALESCE(o.ice, 100),
                        'sugar', COALESCE(o.sugar, 100),
                        'toppings', COALESCE((
                            SELECT json_agg(json_build_object('id', inv.id, 'name', inv.ingredients, 'price', inv.price))
                            FROM order_toppings ot
                            JOIN inventory inv ON ot.topping_id = inv.id
                            WHERE ot.order_id = o.order_id AND ot.order_item_id = o.order_item_id
                        ), '[]'::json)
                    )
                ) as items
            FROM orders o
            LEFT JOIN menu_items m ON o.menu_item_id = m.id
            LEFT JOIN order_status os ON o.order_id = os.order_id
            WHERE o.customer_id = $1
            GROUP BY o.order_id, o.order_date, o.order_time, os.status
            ORDER BY o.order_date DESC, o.order_time DESC
            LIMIT 50`,
            [customerId]
        );

        return NextResponse.json({
            ok: true,
            orders: result.rows,
        });
    } catch (error) {
        console.error("Order history fetch error:", error);
        return NextResponse.json(
            {
                ok: false,
                error: error instanceof Error ? error.message : "Failed to fetch order history",
            },
            { status: 500 }
        );
    }
}
