import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

/**
 * POST /api/orders/cancel
 * Body: { orderId: number }
 *
 * Cancels an order by:
 * 1. Creating cancelled_orders table if it doesn't exist
 * 2. Moving order records from orders to cancelled_orders
 * 3. Restoring inventory for all ingredients
 * 4. Adding negative profit record to reports
 * 5. Updating order_status to 'cancelled'
 */
export async function POST(req: Request) {
    const client = await pool.connect();

    try {
        const { orderId } = await req.json();

        if (!orderId || typeof orderId !== "number") {
            return NextResponse.json(
                { ok: false, error: "Valid order ID required" },
                { status: 400 }
            );
        }

        // Start transaction
        await client.query("BEGIN");

        // Check if order exists and is not already cancelled
        const orderCheck = await client.query(
            "SELECT COUNT(*) as count FROM orders WHERE order_id = $1",
            [orderId]
        );

        if (orderCheck.rows[0].count === "0") {
            await client.query("ROLLBACK");
            return NextResponse.json(
                { ok: false, error: "Order not found or already cancelled" },
                { status: 404 }
            );
        }

        // Get current order status
        const statusCheck = await client.query(
            "SELECT status FROM order_status WHERE order_id = $1",
            [orderId]
        );

        const currentStatus = statusCheck.rows[0]?.status;
        if (currentStatus === "cancelled") {
            await client.query("ROLLBACK");
            return NextResponse.json(
                { ok: false, error: "Order is already cancelled" },
                { status: 400 }
            );
        }

        // Create cancelled_orders table if it doesn't exist (mirrors orders structure)
        await client.query(`
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
                size INTEGER DEFAULT 1,
                cancelled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Get all order items for this order_id
        const orderItems = await client.query(
            `SELECT order_id, order_date, order_time, menu_item_id, price, 
                    employee, boba, ice, sugar, size
             FROM orders 
             WHERE order_id = $1`,
            [orderId]
        );

        if (orderItems.rows.length === 0) {
            await client.query("ROLLBACK");
            return NextResponse.json(
                { ok: false, error: "No order items found" },
                { status: 404 }
            );
        }

        let totalRevenue = 0;
        let totalCost = 0;

        // Process each item in the order
        for (const item of orderItems.rows) {
            const menuItemId = item.menu_item_id;
            const price = parseFloat(item.price);
            totalRevenue += price;

            // Move order item to cancelled_orders
            const sizeNum = Number(item.size || 1);

            await client.query(
                `INSERT INTO cancelled_orders 
                 (order_id, order_date, order_time, menu_item_id, price, employee, boba, ice, sugar, size, cancelled_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)`,
                [
                    item.order_id,
                    item.order_date,
                    item.order_time,
                    menuItemId,
                    price,
                    item.employee,
                    item.boba,
                    item.ice,
                    item.sugar,
                    sizeNum,
                ]
            );

            // Get ingredients for this menu item to restore inventory
            const recipeResult = await client.query(
                "SELECT ingredient_id FROM menu_recipe WHERE menu_item_id = $1",
                [menuItemId]
            );

            // Restore ingredients to inventory
            for (const recipeRow of recipeResult.rows) {
                const ingredientId = recipeRow.ingredient_id;

                // Get ingredient cost for profit calculation
                const ingredientResult = await client.query(
                    "SELECT price FROM inventory WHERE id = $1",
                    [ingredientId]
                );

                if (ingredientResult.rows.length > 0) {
                    const sizeNum = Number(item.size || 1);
                    const ingredientCost = parseFloat(
                        ingredientResult.rows[0].price || 0
                    );
                    totalCost += ingredientCost * sizeNum;

                    // Restore inventory quantity by incrementing by sizeNum
                    await client.query(
                        "UPDATE inventory SET quantity = quantity + $1 WHERE id = $2",
                        [sizeNum, ingredientId]
                    );
                }
            }
        }

        // Delete order items from orders table
        await client.query("DELETE FROM orders WHERE order_id = $1", [orderId]);

        // Calculate profit loss (as negative)
        const profit = -(totalRevenue - totalCost);

        // Add cancellation record to reports (negative profit)
        const cancelDate = new Date();
        const year = cancelDate.getFullYear();
        const month = String(cancelDate.getMonth() + 1).padStart(2, "0");
        const day = String(cancelDate.getDate()).padStart(2, "0");
        const date = `${year}-${month}-${day}`;
        const time = cancelDate.toTimeString().split(" ")[0];

        await client.query(
            `INSERT INTO reports (report_name, report_type, report_text)
             VALUES ($1, $2, $3)`,
            [
                `Order ${orderId} Cancelled`,
                "cancellation",
                `Order ID: ${orderId}, Revenue Lost: $${totalRevenue.toFixed(
                    2
                )}, Cost Saved: $${totalCost.toFixed(
                    2
                )}, Net Impact: $${profit.toFixed(
                    2
                )}, Cancelled: ${date} ${time}`,
            ]
        );

        // Update order_status to 'cancelled'
        await client.query(
            `INSERT INTO order_status (order_id, status, updated_at)
             VALUES ($1, 'cancelled', CURRENT_TIMESTAMP)
             ON CONFLICT (order_id) 
             DO UPDATE SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP`,
            [orderId]
        );

        // Commit transaction
        await client.query("COMMIT");

        console.log(`Order ${orderId} cancelled successfully`);

        return NextResponse.json({
            ok: true,
            orderId,
            message: `Order ${orderId} cancelled successfully`,
            itemsCancelled: orderItems.rows.length,
            refundAmount: totalRevenue,
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Order cancellation error:", error);
        return NextResponse.json(
            {
                ok: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to cancel order",
            },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}
