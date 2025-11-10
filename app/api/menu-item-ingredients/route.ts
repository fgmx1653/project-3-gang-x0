import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// Get ingredients for a specific menu item
export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const menuItemId = url.searchParams.get("menu_item_id");

        if (menuItemId === null || menuItemId === undefined) {
            return NextResponse.json(
                { ok: false, error: "Missing menu_item_id" },
                { status: 400 }
            );
        }

        const result = await pool.query(
            "SELECT ingredient_id FROM menu_recipe WHERE menu_item_id = $1",
            [Number(menuItemId)]
        );

        return NextResponse.json({
            ok: true,
            ingredientIds: result.rows.map((r) => r.ingredient_id),
        });
    } catch (error) {
        console.error("Menu item ingredients API GET error:", error);
        return NextResponse.json(
            { ok: false, error: "Server error" },
            { status: 500 }
        );
    }
}

// Update ingredients for a menu item (replaces all)
export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const { menu_item_id, ingredient_ids } = body;

        if (menu_item_id === null || menu_item_id === undefined) {
            return NextResponse.json(
                { ok: false, error: "Missing menu_item_id" },
                { status: 400 }
            );
        }

        if (!Array.isArray(ingredient_ids)) {
            return NextResponse.json(
                { ok: false, error: "ingredient_ids must be an array" },
                { status: 400 }
            );
        }

        // Delete existing ingredient associations
        await pool.query("DELETE FROM menu_recipe WHERE menu_item_id = $1", [
            menu_item_id,
        ]);

        // Insert new ingredient associations
        if (ingredient_ids.length > 0) {
            const values = ingredient_ids
                .map((id, idx) => `($1, $${idx + 2})`)
                .join(", ");
            const params = [menu_item_id, ...ingredient_ids];

            await pool.query(
                `INSERT INTO menu_recipe (menu_item_id, ingredient_id) VALUES ${values}`,
                params
            );
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Menu item ingredients API PUT error:", error);
        return NextResponse.json(
            { ok: false, error: "Server error" },
            { status: 500 }
        );
    }
}
