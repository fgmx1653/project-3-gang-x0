import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST(req: Request) {
    const client = await pool.connect();

    try {
        const { items, employeeId = null, specialInstructions = null, customerId = null } = await req.json();

        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json(
                { ok: false, error: "Invalid order items" },
                { status: 400 }
            );
        }

        // Allow NULL employeeId for customer kiosk orders
        // Employee orders will have a valid employeeId
        // customerId: use provided value if signed in on kiosk, otherwise -1
        const resolvedCustomerId = customerId ?? -1;

        // Start transaction
        await client.query("BEGIN");

        // --- TIMEZONE FIX START ---
        // Force Date and Time to be Central Time (CST/CDT)
        const now = new Date();
        const timeZone = "America/Chicago";
        
        // Get Date parts in CST
        const dateFormatter = new Intl.DateTimeFormat("en-US", {
            timeZone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });
        const dateParts = dateFormatter.formatToParts(now);
        const year = dateParts.find(p => p.type === 'year')?.value;
        const month = dateParts.find(p => p.type === 'month')?.value;
        const day = dateParts.find(p => p.type === 'day')?.value;
        const date = `${year}-${month}-${day}`; // YYYY-MM-DD in CST

        // Get Time parts in CST
        const timeFormatter = new Intl.DateTimeFormat("en-US", {
            timeZone,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        });
        const timeParts = timeFormatter.formatToParts(now);
        const hour = timeParts.find(p => p.type === 'hour')?.value;
        const minute = timeParts.find(p => p.type === 'minute')?.value;
        const second = timeParts.find(p => p.type === 'second')?.value;
        const time = `${hour}:${minute}:${second}`; // HH:MM:SS in CST
        // --- TIMEZONE FIX END ---

        // Get the next order_id from both orders and cancelled_orders to avoid ID reuse
        const maxOrderIdResult = await client.query(
            `SELECT GREATEST(
                COALESCE((SELECT MAX(order_id) FROM orders), 0),
                COALESCE((SELECT MAX(order_id) FROM cancelled_orders), 0)
            ) + 1 as next_id`
        );
        const nextOrderId = maxOrderIdResult.rows[0].next_id;

        let totalRevenue = 0;
        let totalCost = 0;
        let orderItemId = 0; // Track order_item_id for each item in the order

        // Process each item in the order

        for (const item of items) {
            const menuItemId = item.id;
            const sizeNum = Number(item.size || 1);
            const priceBase = parseFloat(item.price);
            const extra = Math.max(0, sizeNum - 1);
            
            // Calculate topping prices
            const toppings = item.toppings || [];
            let toppingTotal = 0;
            for (const topping of toppings) {
                toppingTotal += parseFloat(topping.price || 0);
            }
            
            const price = priceBase + extra + toppingTotal; // adjusted price for size and toppings
            const boba = item.boba ?? 100;
            const ice = item.ice ?? 100;
            const sugar = item.sugar ?? 100;
            totalRevenue += price;

            // Insert order record for this item (include size and order_item_id)
            await client.query(
                "INSERT INTO orders (order_id, order_date, order_time, menu_item_id, price, employee, boba, ice, sugar, customer_id, size, order_item_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)",
                [
                    nextOrderId,
                    date,
                    time,
                    menuItemId,
                    price,
                    employeeId,
                    boba,
                    ice,
                    sugar,
                    resolvedCustomerId,
                    sizeNum,
                    orderItemId,
                ]
            );

            // Insert toppings for this order item
            for (const topping of toppings) {
                await client.query(
                    "INSERT INTO order_toppings (order_id, order_item_id, topping_id) VALUES ($1, $2, $3)",
                    [nextOrderId, orderItemId, topping.id]
                );
                
                // Subtract topping from inventory
                const toppingResult = await client.query(
                    "SELECT price, quantity FROM inventory WHERE id = $1",
                    [topping.id]
                );
                
                if (toppingResult.rows.length > 0) {
                    const toppingData = toppingResult.rows[0];
                    const toppingCost = parseFloat(toppingData.price || 0);
                    totalCost += toppingCost;
                    
                    // Check inventory
                    if (toppingData.quantity < 1) {
                        await client.query("ROLLBACK");
                        return NextResponse.json(
                            {
                                ok: false,
                                error: `Insufficient inventory for topping: ${topping.name}`,
                            },
                            { status: 400 }
                        );
                    }
                    
                    // Decrement topping inventory
                    await client.query(
                        "UPDATE inventory SET quantity = quantity - 1 WHERE id = $1",
                        [topping.id]
                    );
                }
            }

            // Increment order_item_id for next item
            orderItemId++;

            // Get ingredients for this menu item from menu_recipe
            const recipeResult = await client.query(
                "SELECT ingredient_id FROM menu_recipe WHERE menu_item_id = $1",
                [menuItemId]
            );

            // Subtract ingredients from inventory (multiply by size)
            for (const recipeRow of recipeResult.rows) {
                const ingredientId = recipeRow.ingredient_id;

                // Get ingredient cost and quantity
                const ingredientResult = await client.query(
                    "SELECT price, quantity FROM inventory WHERE id = $1",
                    [ingredientId]
                );

                if (ingredientResult.rows.length > 0) {
                    const ingredient = ingredientResult.rows[0];
                    const ingredientCost = parseFloat(ingredient.price || 0);
                    totalCost += ingredientCost * sizeNum;

                    // Check if we have enough inventory for the requested size
                    if (ingredient.quantity < sizeNum) {
                        await client.query("ROLLBACK");
                        return NextResponse.json(
                            {
                                ok: false,
                                error: `Insufficient inventory for ingredient ID ${ingredientId}`,
                            },
                            { status: 400 }
                        );
                    }

                    // Decrement inventory quantity by sizeNum
                    await client.query(
                        "UPDATE inventory SET quantity = quantity - $1 WHERE id = $2",
                        [sizeNum, ingredientId]
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

        // Add order to order_status table with 'pending' status for kitchen display
        await client.query(
            `INSERT INTO order_status (order_id, status, updated_at, instructions)
             VALUES ($1, 'pending', CURRENT_TIMESTAMP, $2)
             ON CONFLICT (order_id) DO NOTHING`,
            [nextOrderId, specialInstructions]
        );

        // Award reward points to signed-in customers
        // Points earned = total * 10, rounded to nearest integer
        let pointsEarned = 0;
        if (resolvedCustomerId > 0) {
            pointsEarned = Math.round(totalRevenue * 10);
            await client.query(
                `UPDATE customers SET points = points + $1 WHERE id = $2`,
                [pointsEarned, resolvedCustomerId]
            );
        }

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
