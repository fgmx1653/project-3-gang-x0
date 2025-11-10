import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items, employeeId = null } = body; // NULL for customer kiosk orders

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No items provided" },
        { status: 400 }
      );
    }

    // Get the next order_id
    const orderIdResult = await pool.query(
      "SELECT COALESCE(MAX(order_id), -1) + 1 AS next_order_id FROM orders"
    );
    const orderId = orderIdResult.rows[0].next_order_id;

    // Get current date and time in local timezone
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const orderDate = `${year}-${month}-${day}`; // YYYY-MM-DD in local time
    const orderTime = now.toTimeString().split(" ")[0]; // HH:MM:SS

    // Insert all order items
    const insertPromises = items.map((item: any) => {
      return pool.query(
        `INSERT INTO orders (order_id, order_date, order_time, menu_item_id, price, employee)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [orderId, orderDate, orderTime, item.id, item.price, employeeId]
      );
    });

    await Promise.all(insertPromises);

    return NextResponse.json({
      ok: true,
      orderId: orderId,
      message: "Order created successfully",
    });
  } catch (error) {
    console.error("Order creation error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to create order" },
      { status: 500 }
    );
  }
}
