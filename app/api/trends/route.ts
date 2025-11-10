import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

function toISODate(d: Date) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    .toISOString().slice(0, 10);
}

type Cols = {
  dateCol: string;
  timeCol?: string;
  priceCol: string;
  itemCol: string;
  employeeCol?: string;
};

async function tableExists(name: string): Promise<boolean> {
  const r = await pool.query(`select to_regclass('public.${name}') is not null as ok`);
  return !!r.rows?.[0]?.ok;
}

async function getOrdersCols(): Promise<Cols | null> {
  const r = await pool.query<{ column_name: string }>(`
    select lower(column_name) as column_name
    from information_schema.columns
    where table_schema = 'public' and table_name = 'orders'
  `);
  const cols = r.rows.map(x => x.column_name);
  const dateCol = ["order_date", "date"].find(c => cols.includes(c));
  const timeCol = ["order_time", "time"].find(c => cols.includes(c));
  const priceCol = ["price", "amount", "total"].find(c => cols.includes(c));
  const itemCol  = ["menu_item_id", "item_id", "product_id"].find(c => cols.includes(c));
  const employeeCol = ["employee", "employee_id", "cashier_id"].find(c => cols.includes(c));
  if (!dateCol || !priceCol || !itemCol) return null;
  return { dateCol, timeCol, priceCol, itemCol, employeeCol };
}

/** GET /api/trends?start=YYYY-MM-DD&end=YYYY-MM-DD&group=day|week|month */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const group = (url.searchParams.get("group") || "day").toLowerCase() as "day"|"week"|"month";
  const iso = /^\d{4}-\d{2}-\d{2}$/;

  const today = new Date();
  const defaultEnd = toISODate(today);
  const defaultStart = toISODate(new Date(today.getTime() - 29*24*60*60*1000));

  const start = (url.searchParams.get("start") || defaultStart).slice(0,10);
  const end   = (url.searchParams.get("end")   || defaultEnd).slice(0,10);
  if (!iso.test(start) || !iso.test(end)) {
    return NextResponse.json({ ok:false, error:"Invalid date format (YYYY-MM-DD)" }, { status:400 });
  }

  const client = await pool.connect();
  try {
    const hasOrders     = await tableExists("orders");
    const hasMenuItems  = await tableExists("menu_items");
    const hasMenuRecipe = await tableExists("menu_recipe");
    const hasInventory  = await tableExists("inventory");

    if (!hasOrders) {
      return NextResponse.json({
        ok: true, start, end, group, series: [], top: [],
        debug: { note: "orders table not found", hasOrders, hasMenuItems, hasMenuRecipe, hasInventory }
      });
    }

    const cols = await getOrdersCols();
    if (!cols) {
      return NextResponse.json({
        ok: true, start, end, group, series: [], top: [],
        debug: { note: "orders missing required columns (need date + price + item id)", hasOrders, hasMenuItems, hasMenuRecipe, hasInventory }
      });
    }

    const { dateCol, priceCol, itemCol } = cols;

    // Build bucket expression for the requested grouping with a given alias
    const bucketExpr = (alias: "o" | "w") => {
      if (group === "week")  return `to_char(date_trunc('week', ${alias}.${dateCol}), 'IYYY-IW')`;
      if (group === "month") return `to_char(date_trunc('month', ${alias}.${dateCol}), 'YYYY-MM')`;
      return `to_char(${alias}.${dateCol}, 'YYYY-MM-DD')`;
    };

    // -------- Revenue-only aggregation (orders only) --------
    const dailyBase = `
      with orders_window as (
        select * from public.orders
        where ${dateCol} >= $1::date and ${dateCol} <= $2::date
      )
      select
        ${bucketExpr("o")} as bucket,
        count(*) as orders,
        coalesce(sum(o.${priceCol}),0)::numeric as revenue,
        0::numeric as est_cost,
        coalesce(sum(o.${priceCol}),0)::numeric as profit
      from orders_window o
      group by 1
      order by 1 asc
    `;

    // -------- Enhanced: add estimated cost from recipe + inventory --------
    const dailyEnhanced = `
      with item_costs as (
        select mr.menu_item_id, coalesce(sum(inv.price),0) as est_cost_per_item
        from public.menu_recipe mr
        join public.inventory inv on inv.id = mr.ingredient_id
        group by mr.menu_item_id
      ),
      orders_window as (
        select * from public.orders
        where ${dateCol} >= $1::date and ${dateCol} <= $2::date
      )
      select
        ${bucketExpr("w")} as bucket,
        count(*) as orders,
        coalesce(sum(w.${priceCol}),0)::numeric as revenue,
        coalesce(sum(ic.est_cost_per_item),0)::numeric as est_cost,
        (coalesce(sum(w.${priceCol}),0) - coalesce(sum(ic.est_cost_per_item),0))::numeric as profit
      from orders_window w
      left join item_costs ic on ic.menu_item_id = w.${itemCol}
      group by 1
      order by 1 asc
    `;

    // -------- Top items --------
    const topWithNames = `
      with orders_window as (
        select * from public.orders
        where ${dateCol} >= $1::date and ${dateCol} <= $2::date
      )
      select
        mi.id as menu_item_id,
        mi.name,
        count(*) as units,
        coalesce(sum(w.${priceCol}),0)::numeric as revenue
      from orders_window w
      join public.menu_items mi on mi.id = w.${itemCol}
      group by mi.id, mi.name
      order by units desc, revenue desc
      limit 10
    `;

    const topAnon = `
      with orders_window as (
        select * from public.orders
        where ${dateCol} >= $1::date and ${dateCol} <= $2::date
      )
      select
        w.${itemCol} as menu_item_id,
        count(*) as units,
        coalesce(sum(w.${priceCol}),0)::numeric as revenue
      from orders_window w
      group by w.${itemCol}
      order by units desc, revenue desc
      limit 10
    `;

    const [dailyRes, topRes] = await Promise.all([
      client.query(hasMenuRecipe && hasInventory ? dailyEnhanced : dailyBase, [start, end]),
      client.query(hasMenuItems ? topWithNames : topAnon, [start, end]),
    ]);

    const series = dailyRes.rows.map(r => ({
      bucket: r.bucket as string,
      orders: Number(r.orders),
      revenue: Number(r.revenue),
      est_cost: Number(r.est_cost),
      profit: Number(r.profit),
    }));

    const top = topRes.rows.map((r: any) => ({
      menu_item_id: Number(r.menu_item_id),
      name: r.name ?? `Item ${r.menu_item_id}`,
      units: Number(r.units),
      revenue: Number(r.revenue),
    }));

    return NextResponse.json({
      ok: true, start, end, group, series, top,
      debug: {
        hasOrders: true,
        hasMenuItems, hasMenuRecipe, hasInventory,
        detected: cols
      }
    });
  } catch (e) {
    console.error("Trends API crash:", e);
    const message = process.env.NODE_ENV === "production" ? "Server error" : String(e);
    return NextResponse.json({ ok:false, error: message }, { status:500 });
  } finally {
    client.release();
  }
}
