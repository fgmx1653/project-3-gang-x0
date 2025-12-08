// app/api/trends/orders/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { orderHistoryQuerySchema, type ValidationErrorResponse, type OrderHistoryQuery } from "@/lib/validation/orderHistory";

/**
 * Validates and sanitizes query parameters using Zod schema
 * Returns parsed data or error response
 */
async function validateQueryParams(searchParams: URLSearchParams) {
  const rawParams = {
    start: searchParams.get("start") || undefined,
    end: searchParams.get("end") || undefined,
    timeStart: searchParams.get("timeStart") || undefined,
    timeEnd: searchParams.get("timeEnd") || undefined,
    employee: searchParams.get("employee") || undefined,
    menu: searchParams.get("menu") || undefined,
    limit: searchParams.get("limit") || undefined,
    offset: searchParams.get("offset") || undefined,
  };

  // Parse with Zod
  const result = orderHistoryQuerySchema.safeParse(rawParams);

  if (!result.success) {
    const firstError = result.error.issues[0];
    const errorResponse: ValidationErrorResponse = {
      ok: false,
      error: firstError.message,
      field: firstError.path[0]?.toString(),
      details: result.error.issues.map(issue => ({
        path: issue.path.map(String),
        message: issue.message,
      })),
    };
    return { success: false as const, error: errorResponse };
  }

  return { success: true as const, data: result.data };
}

/**
 * Verifies that employee ID exists in database
 */
async function verifyEmployeeExists(client: any, employeeId: number): Promise<boolean> {
  const result = await client.query(
    "SELECT 1 FROM employees WHERE id = $1",
    [employeeId]
  );
  return result.rows.length > 0;
}

/**
 * Verifies that menu item ID exists in database
 */
async function verifyMenuItemExists(client: any, menuId: number): Promise<boolean> {
  const result = await client.query(
    "SELECT 1 FROM menu_items WHERE id = $1",
    [menuId]
  );
  return result.rows.length > 0;
}

/**
 * Apply default values for missing optional parameters
 */
function applyDefaults(data: Partial<OrderHistoryQuery>) {
  const today = new Date();
  const weekAgo = new Date(Date.now() - 6 * 24 * 3600 * 1000);

  return {
    start: data.start || weekAgo.toISOString().slice(0, 10),
    end: data.end || today.toISOString().slice(0, 10),
    timeStart: data.timeStart || "00:00",
    timeEnd: data.timeEnd || "23:59",
    employee: data.employee,
    menu: data.menu,
    limit: data.limit ?? 100,
    offset: data.offset ?? 0,
  };
}

/**
 * GET /api/trends/orders
 *   ?start=YYYY-MM-DD
 *   ?end=YYYY-MM-DD
 *   ?timeStart=HH:MM
 *   ?timeEnd=HH:MM
 *   ?employee=ID (optional)
 *   ?menu=ID     (optional)
 *   ?limit=100   (default 100, max 500)
 *   ?offset=0
 */
export async function GET(req: Request) {
  const url = new URL(req.url);

  // Step 1: Validate query parameters
  const validationResult = await validateQueryParams(url.searchParams);

  if (!validationResult.success) {
    return NextResponse.json(validationResult.error, { status: 400 });
  }

  // Step 2: Apply defaults for optional fields
  const params = applyDefaults(validationResult.data);

  // Step 3: Connect to database
  const client = await pool.connect();

  try {
    // Step 4: Verify employee/menu IDs exist (if provided)
    if (params.employee !== undefined) {
      const employeeExists = await verifyEmployeeExists(client, params.employee);
      if (!employeeExists) {
        return NextResponse.json({
          ok: false,
          error: `Employee ID ${params.employee} does not exist`,
          field: "employee",
        } as ValidationErrorResponse, { status: 400 });
      }
    }

    if (params.menu !== undefined) {
      const menuExists = await verifyMenuItemExists(client, params.menu);
      if (!menuExists) {
        return NextResponse.json({
          ok: false,
          error: `Menu item ID ${params.menu} does not exist`,
          field: "menu",
        } as ValidationErrorResponse, { status: 400 });
      }
    }

    // Step 5: Build query
    const { start, end, timeStart, timeEnd, employee, menu, limit, offset } = params;

    const wrap = timeStart > timeEnd;
    const timeCond = wrap
      ? `(o.order_time >= $3::time OR o.order_time <= $4::time)`
      : `(o.order_time >= $3::time AND o.order_time <= $4::time)`;

    const queryParams: any[] = [start, end, timeStart, timeEnd];
    const extraConds: string[] = [];

    if (employee !== undefined) {
      queryParams.push(employee);
      extraConds.push(`o.employee = $${queryParams.length}`);
    }
    if (menu !== undefined) {
      queryParams.push(menu);
      extraConds.push(`o.menu_item_id = $${queryParams.length}`);
    }

    const where = `
      WHERE o.order_date >= $1::date
        AND o.order_date <= $2::date
        AND ${timeCond}
        ${extraConds.length ? `AND ${extraConds.join(" AND ")}` : ""}
    `;

    // Step 6: Execute queries
    const hasMenu = await client
      .query(`SELECT to_regclass('public.menu_items') IS NOT NULL AS ok`)
      .then(r => !!r.rows?.[0]?.ok);

    const withNames = `
      SELECT o.order_id, o.order_date, o.order_time,
             o.menu_item_id, mi.name AS menu_item_name,
             o.price::numeric::float8 AS price, o.employee
      FROM public.orders o
      JOIN public.menu_items mi ON mi.id = o.menu_item_id
      ${where}
      ORDER BY o.order_date ASC, o.order_time ASC, o.order_id ASC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const anon = `
      SELECT o.order_id, o.order_date, o.order_time,
             o.menu_item_id, NULL::text AS menu_item_name,
             o.price::numeric::float8 AS price, o.employee
      FROM public.orders o
      ${where}
      ORDER BY o.order_date ASC, o.order_time ASC, o.order_id ASC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const totalsSql = `
      SELECT
        COUNT(*)::int AS count,
        COALESCE(SUM(o.price),0)::numeric::float8 AS revenue
      FROM public.orders o
      ${where}
    `;

    const [rowsRes, totalsRes] = await Promise.all([
      client.query(hasMenu ? withNames : anon, queryParams),
      client.query(totalsSql, queryParams),
    ]);

    const totals = totalsRes.rows[0] || { count: 0, revenue: 0 };

    return NextResponse.json({
      ok: true,
      start,
      end,
      timeStart,
      timeEnd,
      wrap,
      count: totals.count,
      revenue: totals.revenue,
      items: rowsRes.rows,
    });

  } catch (e: any) {
    console.error("trends/orders GET error:", e);
    const msg =
      process.env.NODE_ENV === "production" ? "Server error" : `DB error: ${e?.message || e}`;
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  } finally {
    client.release();
  }
}
