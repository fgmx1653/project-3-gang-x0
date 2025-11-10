"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";               // ← NEW
import { ArrowLeft } from "lucide-react";                  // ← NEW
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SeriesPoint = {
  bucket: string;
  orders: number;
  revenue: number;
  est_cost: number;
  profit: number;
};

type TopItem = {
  menu_item_id: number;
  name: string;
  units: number;
  revenue: number;
};

type GraphType = "bar" | "line" | "pie";
type Metric = "revenue" | "profit" | "orders";

function formatCurrency(n: number) {
  return `$${n.toFixed(2)}`;
}

const metricLabel: Record<Metric, string> = {
  revenue: "Revenue",
  profit: "Profit",
  orders: "Orders",
};

export default function TrendsPage() {
  const router = useRouter();                               // ← NEW

  const [start, setStart] = useState<string>("");
  const [end, setEnd] = useState<string>("");
  const [group, setGroup] = useState<"day"|"week"|"month">("day");
  const [metric, setMetric] = useState<Metric>("revenue");
  const [graph, setGraph] = useState<GraphType>("bar");
  const [loading, setLoading] = useState(true);
  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const [top, setTop] = useState<TopItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (start) params.set("start", start);
      if (end) params.set("end", end);
      if (group) params.set("group", group);
      const res = await fetch(`/api/trends?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to load trends");
      setSeries(data.series ?? []);
      setTop(data.top ?? []);
      if (!start) setStart(data.start);
      if (!end) setEnd(data.end);
    } catch (e: any) {
      setError(e?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const maxY = useMemo(() => {
    if (series.length === 0) return 1;
    const vals = series.map(s =>
      metric === "orders" ? s.orders : metric === "revenue" ? s.revenue : s.profit
    );
    return Math.max(1, ...vals);
  }, [series, metric]);

  return (
    // Use the global background by NOT setting any bg-* here.
    // Just a centered container like other manager pages.
    <div className="min-h-screen"> {/* ← relies on app/globals.css background */}
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Top Bar: Back + Title/Controls */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            {/* BACK BUTTON */}
            <Button variant="ghost" onClick={() => router.back()} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <h1 className="text-2xl font-semibold">Trends</h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm">Start:</label>
              <Input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-44"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm">End:</label>
              <Input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-44"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm">Group:</label>
              <select
                className="border rounded-md px-2 py-1 h-9"
                value={group}
                onChange={(e) => setGroup(e.target.value as any)}
              >
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm">Metric:</label>
              <select
                className="border rounded-md px-2 py-1 h-9"
                value={metric}
                onChange={(e) => setMetric(e.target.value as Metric)}
              >
                <option value="revenue">Revenue</option>
                <option value="profit">Profit</option>
                <option value="orders">Orders</option>
              </select>
            </div>
            <Button onClick={load}>Refresh</Button>
          </div>
        </div>

        {/* Graph type buttons */}
        <div className="flex items-center gap-2">
          <Button variant={graph === "bar" ? "default" : "outline"} onClick={() => setGraph("bar")}>Bar</Button>
          <Button variant={graph === "line" ? "default" : "outline"} onClick={() => setGraph("line")}>Line</Button>
          <Button variant={graph === "pie" ? "default" : "outline"} onClick={() => setGraph("pie")}>Pie</Button>
        </div>

        {error && (
          <Card className="border-destructive">
            <CardHeader><CardTitle className="text-destructive">Error</CardTitle></CardHeader>
            <CardContent><p>{error}</p></CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>
              {metricLabel[metric]} by {group === "day" ? "Day" : group === "week" ? "Week" : "Month"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartArea loading={loading} graph={graph} metric={metric} series={series} maxY={maxY} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Top Items (in range)</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left border-b">
                  <tr>
                    <th className="py-2 pr-4">Item</th>
                    <th className="py-2 pr-4">Units</th>
                    <th className="py-2 pr-4">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td className="py-3" colSpan={3}>Loading…</td></tr>
                  ) : top.length === 0 ? (
                    <tr><td className="py-3" colSpan={3}>No data</td></tr>
                  ) : top.map(t => (
                    <tr key={t.menu_item_id} className="border-b last:border-0">
                      <td className="py-2 pr-4">{t.name}</td>
                      <td className="py-2 pr-4">{t.units}</td>
                      <td className="py-2 pr-4">{formatCurrency(t.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ===== Charts (unchanged) ===== */
function ChartArea({
  loading, graph, metric, series, maxY,
}: {
  loading: boolean;
  graph: GraphType;
  metric: Metric;
  series: SeriesPoint[];
  maxY: number;
}) {
  if (loading) return <div className="py-6 text-sm">Loading…</div>;
  if (!series || series.length === 0) return <div className="py-6 text-sm">No data</div>;

  if (graph === "pie") {
    const values = series.map(s =>
      metric === "orders" ? s.orders : metric === "revenue" ? s.revenue : s.profit
    );
    const total = values.reduce((a, b) => a + b, 0) || 1;
    const slices = series.map((s, i) => ({ label: s.bucket, value: values[i] }));
    const sorted = [...slices].sort((a, b) => b.value - a.value);
    const top8 = sorted.slice(0, 8);
    const rest = sorted.slice(8).reduce((a, s) => a + s.value, 0);
    const data = rest > 0 ? [...top8, { label: "Other", value: rest }] : top8;

    return <PieSVG data={data} total={total} />;
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[720px] w-full">
        <SeriesSVG kind={graph} metric={metric} series={series} maxY={maxY} height={320} padding={40} />
      </div>
    </div>
  );
}

function SeriesSVG({
  kind, metric, series, maxY, height, padding
}: {
  kind: "bar" | "line";
  metric: Metric;
  series: SeriesPoint[];
  maxY: number;
  height: number;
  padding: number;
}) {
  const width = Math.max(720, 70 * series.length + padding * 2);
  const yScale = (v: number) => {
    const innerH = height - padding * 2;
    return padding + (innerH - (v / maxY) * innerH);
  };
  const xStep = (width - padding * 2) / Math.max(1, series.length);
  const labelEvery = series.length > 24 ? Math.ceil(series.length / 24) : 1;

  const vals = series.map(s =>
    metric === "orders" ? s.orders : metric === "revenue" ? s.revenue : s.profit
  );

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[320px]">
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="currentColor" strokeWidth="1" />
      <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="currentColor" strokeWidth="1" />
      {Array.from({ length: 5 }).map((_, i) => {
        const val = (maxY * i) / 4;
        const y = yScale(val);
        return (
          <g key={i}>
            <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="currentColor" strokeOpacity="0.15" />
            <text x={padding - 8} y={y + 4} textAnchor="end" className="text-[10px] fill-current">
              {metric === "orders" ? Math.round(val) : `$${val.toFixed(0)}`}
            </text>
          </g>
        );
      })}
      {kind === "bar" ? (
        series.map((s, i) => {
          const x = padding + i * xStep + xStep * 0.1;
          const w = xStep * 0.8;
          const v = vals[i];
          const y = yScale(v);
          return (
            <g key={s.bucket}>
              <rect x={x} y={y} width={w} height={(height - padding) - y} fill="currentColor" opacity={0.7} />
            </g>
          );
        })
      ) : (
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          points={series.map((s, i) => {
            const x = padding + i * xStep + xStep / 2;
            const y = yScale(vals[i]);
            return `${x},${y}`;
          }).join(" ")}
        />
      )}
      {series.map((s, i) => {
        if (i % labelEvery !== 0) return null;
        const x = padding + i * xStep + xStep / 2;
        return (
          <text
            key={s.bucket}
            x={x}
            y={height - padding + 12}
            textAnchor="middle"
            className="text-[10px] fill-current"
          >
            {s.bucket}
          </text>
        );
      })}
      <text x={width / 2} y={16} textAnchor="middle" className="text-[12px] font-semibold fill-current">
        {metricLabel[metric]} over time
      </text>
    </svg>
  );
}

function PieSVG({ data, total }: { data: { label: string; value: number }[]; total: number }) {
  const size = 320;
  const r = 120;
  const cx = size / 2;
  const cy = size / 2 + 10;
  let angle = -Math.PI / 2;

  const arcs = data.map((d, i) => {
    const frac = d.value / (total || 1);
    const theta = frac * Math.PI * 2;
    const x1 = cx + r * Math.cos(angle);
    const y1 = cy + r * Math.sin(angle);
    const x2 = cx + r * Math.cos(angle + theta);
    const y2 = cy + r * Math.sin(angle + theta);
    const largeArc = theta > Math.PI ? 1 : 0;
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    angle += theta;
    return { path, label: d.label, value: d.value };
  });

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[720px] h-[360px]">
        {arcs.map((a, i) => (
          <path key={i} d={a.path} fill="currentColor" opacity={0.25 + (i % 6) * 0.1} />
        ))}
        <text x={size / 2} y={24} textAnchor="middle" className="text-[12px] font-semibold fill-current">Pie (top slices)</text>
        <text x={size / 2} y={cy} textAnchor="middle" className="text-[14px] font-semibold fill-current">
          {`Total ${formatCurrency(total)}`}
        </text>
      </svg>
      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
        {data.map((d, i) => (
          <div key={i} className="text-sm">
            <span className="inline-block w-3 h-3 mr-2 align-middle bg-current" style={{ opacity: 0.25 + (i % 6) * 0.1 }} />
            {d.label}: {formatCurrency(d.value)}
          </div>
        ))}
      </div>
    </div>
  );
}
