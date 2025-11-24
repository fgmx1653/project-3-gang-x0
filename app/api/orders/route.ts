import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST(req: Request) {
    const client = await pool.connect();

    try {
        const { items, employeeId = null } = await req.json();

        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json(
                { ok: false, error: "Invalid order items" },
                { status: 400 }
            );
        }

        // Allow NULL employeeId for customer kiosk orders
        // Employee orders will have a valid employeeId

        // Start transaction
        await client.query("BEGIN");

        const orderDate = new Date();
        // Use local date instead of UTC to avoid timezone issues
        const year = orderDate.getFullYear();
        const month = String(orderDate.getMonth() + 1).padStart(2, "0");
        const day = String(orderDate.getDate()).padStart(2, "0");
        const date = `${year}-${month}-${day}`; // YYYY-MM-DD in local time
        const time = orderDate.toTimeString().split(" ")[0]; // HH:MM:SS

        // Get the next order_id
        const maxOrderIdResult = await client.query(
            "SELECT COALESCE(MAX(order_id), 0) + 1 as next_id FROM orders"
        );
        const nextOrderId = maxOrderIdResult.rows[0].next_id;

        let totalRevenue = 0;
        let totalCost = 0;

        // Process each item in the order
        for (const item of items) {
            const menuItemId = item.id;
            const price = parseFloat(item.price);
            totalRevenue += price;

            // Insert order record for this item
            await client.query(
                "INSERT INTO orders (order_id, order_date, order_time, menu_item_id, price, employee) VALUES ($1, $2, $3, $4, $5, $6)",
                [nextOrderId, date, time, menuItemId, price, employeeId]
            );

            // Get ingredients for this menu item from menu_recipe
            const recipeResult = await client.query(
                "SELECT ingredient_id FROM menu_recipe WHERE menu_item_id = $1",
                [menuItemId]
            );

            // Subtract ingredients from inventory
            for (const recipeRow of recipeResult.rows) {
                const ingredientId = recipeRow.ingredient_id;

                // Get ingredient cost
                const ingredientResult = await client.query(
                    "SELECT price, quantity FROM inventory WHERE id = $1",
                    [ingredientId]
                );

                if (ingredientResult.rows.length > 0) {
                    const ingredient = ingredientResult.rows[0];
                    const ingredientCost = parseFloat(ingredient.price || 0);
                    totalCost += ingredientCost;

                    // Check if we have enough inventory
                    if (ingredient.quantity <= 0) {
                        await client.query("ROLLBACK");
                        return NextResponse.json(
                            {
                                ok: false,
                                error: `Insufficient inventory for ingredient ID ${ingredientId}`,
                            },
                            { status: 400 }
                        );
                    }

                    // Decrement inventory quantity by 1
                    await client.query(
                        "UPDATE inventory SET quantity = quantity - 1 WHERE id = $1",
                        [ingredientId]
                    );
                }
            }
        }

        // Calculate profit
        const profit = totalRevenue - totalCost;

        // Insert into reports table as a profit record
        await client.query(
            `INSERT INTO reports (report_name, report_type, report_text)
       VALUES ($1, $2, $3)`,
            [
                `Order ${nextOrderId} Profit`,
                "profit",
                `Order ID: ${nextOrderId}, Revenue: $${totalRevenue.toFixed(
                    2
                )}, Cost: $${totalCost.toFixed(2)}, Profit: $${profit.toFixed(
                    2
                )}, Date: ${date} ${time}`,
            ]
        );

        // Commit transaction
        await client.query("COMMIT");

        return NextResponse.json({
            ok: true,
            orderId: nextOrderId,
            totalRevenue,
            totalCost,
            profit,
            message: "Order placed successfully",
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Order placement error:", error);
        return NextResponse.json(
            { ok: false, error: "Failed to place order" },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}
