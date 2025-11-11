// app/manager/orders/history/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw, Download } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type OrderRow = {
  order_id: number;
  order_date: string;
  order_time: string;
  menu_item_id: number;
  menu_item_name: string | null;
  price: number;
  employee: number;
};

export default function OrdersHistoryPage() {
  const router = useRouter();
  const todayISO = new Date().toISOString().slice(0, 10);
  const weekAgoISO = new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString().slice(0, 10);

  const [start, setStart] = useState<string>(weekAgoISO);
  const [end, setEnd] = useState<string>(todayISO);
  const [timeStart, setTimeStart] = useState<string>("00:00");
  const [timeEnd, setTimeEnd] = useState<string>("23:59");
  const [employee, setEmployee] = useState<string>("");
  const [menu, setMenu] = useState<string>("");

  const [limit, setLimit] = useState<number>(100);
  const [offset, setOffset] = useState<number>(0);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<OrderRow[]>([]);
  const [count, setCount] = useState<number>(0);
  const [revenue, setRevenue] = useState<number>(0);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (start) params.set("start", start);
      if (end) params.set("end", end);
      if (timeStart) params.set("timeStart", timeStart);
      if (timeEnd) params.set("timeEnd", timeEnd);
      if (employee.trim()) params.set("employee", employee.trim());
      if (menu.trim()) params.set("menu", menu.trim());
      params.set("limit", String(limit));
      params.set("offset", String(offset));

      const res = await fetch(`/api/trends/orders?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to load orders");

      setItems(data.items || []);
      setCount(data.count || 0);
      setRevenue(data.revenue || 0);
    } catch (e: any) {
      setError(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-line */ }, []);

  function exportCSV() {
    const header = ["order_id","order_date","order_time","menu_item_id","menu_item_name","price","employee"];
    const rows = items.map(r => [
      r.order_id,
      r.order_date,
      r.order_time,
      r.menu_item_id,
      r.menu_item_name ?? "",
      r.price,
      r.employee,
    ]);
    const csv = [header, ...rows]
      .map(line => line.map(v => {
        const s = String(v ?? "");
        return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders_${start}_${end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const pageFrom = offset + 1;
  const pageTo = Math.min(offset + limit, count);

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => router.back()} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <h1 className="text-2xl font-semibold">Order History</h1>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={exportCSV}>
              <Download className="h-4 w-4" /> CSV
            </Button>
            <Button className="gap-2" onClick={load}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <div><label className="text-sm block mb-1">Start date</label><Input type="date" value={start} onChange={e => setStart(e.target.value)} /></div>
              <div><label className="text-sm block mb-1">End date</label><Input type="date" value={end} onChange={e => setEnd(e.target.value)} /></div>
              <div><label className="text-sm block mb-1">Start time</label><Input type="time" value={timeStart} onChange={e => setTimeStart(e.target.value)} /></div>
              <div><label className="text-sm block mb-1">End time</label><Input type="time" value={timeEnd} onChange={e => setTimeEnd(e.target.value)} /></div>
              <div><label className="text-sm block mb-1">Employee (optional)</label><Input placeholder="e.g., 3" value={employee} onChange={e => setEmployee(e.target.value)} /></div>
              <div><label className="text-sm block mb-1">Menu Item ID (optional)</label><Input placeholder="e.g., 17" value={menu} onChange={e => setMenu(e.target.value)} /></div>
            </div>

            <div className="mt-4 flex gap-2 items-center">
              <label className="text-sm">Limit</label>
              <Input className="w-24" type="number" value={limit} onChange={e => setLimit(Math.max(1, Number(e.target.value) || 1))} />
              <label className="text-sm">Offset</label>
              <Input className="w-24" type="number" value={offset} onChange={e => setOffset(Math.max(0, Number(e.target.value) || 0))} />
              <Button onClick={() => { setOffset(0); load(); }} className="ml-2">Apply</Button>
            </div>
            {error && <div className="mt-3 text-sm text-destructive">{error}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-8 text-sm">
              <div><span className="font-semibold">Orders:</span> {count}</div>
              <div><span className="font-semibold">Revenue:</span> ${revenue.toFixed(2)}</div>
              <div className="opacity-70">Showing {items.length ? `${pageFrom}-${pageTo}` : "0"} of {count}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
