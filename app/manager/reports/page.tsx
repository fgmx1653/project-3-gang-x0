"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";               // ← NEW
import { ArrowLeft, History } from "lucide-react";                  // ← NEW
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

type Report = {
  report_id: number;
  report_name: string;
  report_type: string;
  date_created: string;
  report_text: string;
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

  // Reports History state
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [filterStartDate, setFilterStartDate] = useState<string>("");
  const [filterEndDate, setFilterEndDate] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // X-Report and Z-Report state
  const [xReportDialogOpen, setXReportDialogOpen] = useState(false);
  const [zReportDialogOpen, setZReportDialogOpen] = useState(false);
  const [dailyReportData, setDailyReportData] = useState<any>(null);
  const [dailyReportLoading, setDailyReportLoading] = useState(false);
  const [dailyReportError, setDailyReportError] = useState<string | null>(null);

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

  const loadReports = async () => {
    setReportsLoading(true);
    setReportsError(null);
    try {
      const res = await fetch("/api/reports", { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to load reports");
      setReports(data.reports || []);
    } catch (e: any) {
      setReportsError(e?.message || "Error loading reports");
    } finally {
      setReportsLoading(false);
    }
  };

  const openHistoryDialog = () => {
    setHistoryDialogOpen(true);
    setSelectedReport(null);
    setFilterStartDate("");
    setFilterEndDate("");
    setFilterCategory("all");
    loadReports();
  };

  const filteredReports = useMemo(() => {
    let filtered = reports;

    // Filter by category
    if (filterCategory !== "all") {
      filtered = filtered.filter((report) => {
        const reportType = report.report_type.toLowerCase();
        if (filterCategory === "profit") {
          // Profit reports might have different naming, adjust as needed
          return reportType.includes("profit") || reportType.includes("trends");
        } else if (filterCategory === "z-report") {
          return reportType === "z-report";
        } else if (filterCategory === "inventory") {
          return reportType.includes("inventory");
        }
        return true;
      });
    }

    // Filter by date range
    if (filterStartDate || filterEndDate) {
      filtered = filtered.filter((report) => {
        const reportDate = new Date(report.date_created);
        const start = filterStartDate ? new Date(filterStartDate) : null;
        const end = filterEndDate ? new Date(filterEndDate) : null;

        if (start && reportDate < start) return false;
        if (end) {
          const endOfDay = new Date(end);
          endOfDay.setHours(23, 59, 59, 999);
          if (reportDate > endOfDay) return false;
        }
        return true;
      });
    }

    return filtered;
  }, [reports, filterStartDate, filterEndDate, filterCategory]);

  const generateXReport = async () => {
    setDailyReportLoading(true);
    setDailyReportError(null);
    try {
      const res = await fetch("/api/reports/x-report");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to generate X-Report");
      setDailyReportData(data.report);
      setXReportDialogOpen(true);
    } catch (e: any) {
      setDailyReportError(e?.message || "Error generating X-Report");
      alert(e?.message || "Error generating X-Report");
    } finally {
      setDailyReportLoading(false);
    }
  };

  const generateZReport = async () => {
    if (!confirm("Are you sure you want to generate a Z-Report? This can only be done once per day and will be saved to the database.")) {
      return;
    }

    setDailyReportLoading(true);
    setDailyReportError(null);
    try {
      const res = await fetch("/api/reports/z-report", { method: "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to generate Z-Report");
      setDailyReportData(data.report);
      setZReportDialogOpen(true);
      alert("Z-Report generated and saved successfully!");
    } catch (e: any) {
      setDailyReportError(e?.message || "Error generating Z-Report");
      alert(e?.message || "Error generating Z-Report");
    } finally {
      setDailyReportLoading(false);
    }
  };

  const deleteReport = async (reportId: number) => {
    if (!confirm("Are you sure you want to delete this report? This action cannot be undone.")) {
      return;
    }

    try {
      const res = await fetch(`/api/reports?id=${reportId}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to delete report");

      // Reload reports list
      await loadReports();
      setSelectedReport(null);
      alert("Report deleted successfully!");
    } catch (e: any) {
      alert(e?.message || "Error deleting report");
    }
  };

  const formatReportText = (report: any) => {
    if (typeof report.report_text === "string") {
      return report.report_text;
    }
    // Format for X/Z reports
    const { type, date, generated, totals, hourlySales, topItems } = report;
    let text = `═══════════════════════════════════════════════════\n`;
    text += `                    ${type || 'REPORT'}                       \n`;
    text += `═══════════════════════════════════════════════════\n`;
    text += `Date: ${date}\n`;
    text += `Generated: ${new Date(generated).toLocaleString()}\n`;
    text += `═══════════════════════════════════════════════════\n\n`;
    text += `DAILY TOTALS\n`;
    text += `───────────────────────────────────────────────────\n`;
    text += `Total Sales:          $${parseFloat(totals.total_sales).toFixed(2)}\n`;
    text += `Total Taxes:          $${parseFloat(totals.total_taxes).toFixed(2)}\n`;
    text += `Total Orders:         ${totals.total_orders}\n`;
    text += `Total Items Sold:     ${totals.total_items}\n`;
    text += `Average Order Value:  $${parseFloat(totals.avg_order_value).toFixed(2)}\n\n`;
    text += `HOURLY SALES BREAKDOWN\n`;
    text += `───────────────────────────────────────────────────\n`;
    text += `Hour                Orders        Sales      Items\n`;
    text += `───────────────────────────────────────────────────\n`;

    if (hourlySales.length === 0) {
      text += `No sales recorded today.\n`;
    } else {
      hourlySales.forEach((row: any) => {
        const hour = parseInt(row.hour);
        const nextHour = hour + 1;
        const hourStr = `${hour.toString().padStart(2, '0')}:00 - ${nextHour.toString().padStart(2, '0')}:00`;
        const orders = row.orders.toString().padStart(8);
        const sales = parseFloat(row.sales).toFixed(2);
        const items = row.items.toString().padStart(10);
        text += `${hourStr}      ${orders}  $ ${sales.padStart(10)}   ${items}\n`;
      });
    }

    text += `\nTOP 10 SELLING ITEMS\n`;
    text += `───────────────────────────────────────────────────\n`;
    text += `Item                                  Qty      Revenue\n`;
    text += `───────────────────────────────────────────────────\n`;

    if (topItems.length === 0) {
      text += `No items sold today.\n`;
    } else {
      topItems.forEach((item: any) => {
        const itemName = item.item_name.padEnd(35);
        const qty = item.quantity.toString().padStart(5);
        const revenue = parseFloat(item.revenue).toFixed(2);
        text += `${itemName}  ${qty}  $ ${revenue.padStart(10)}\n`;
      });
    }

    text += `\n═══════════════════════════════════════════════════\n`;
    text += `                 END OF REPORT                     \n`;
    text += `═══════════════════════════════════════════════════\n`;

    return text;
  };

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
            <Button onClick={openHistoryDialog} variant="outline" className="gap-2">
              <History className="h-4 w-4" /> Reports History
            </Button>
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

        {/* X-Report and Z-Report Buttons */}
        <Card>
          <CardHeader><CardTitle>Daily Reports</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Button
                onClick={generateXReport}
                disabled={dailyReportLoading}
                className="gap-2"
              >
                Generate X-Report
              </Button>
              <Button
                onClick={generateZReport}
                disabled={dailyReportLoading}
                variant="destructive"
                className="gap-2"
              >
                Generate Z-Report
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              <strong>X-Report:</strong> View current day's sales activity by hour (can be run multiple times). <br />
              <strong>Z-Report:</strong> End-of-day report that saves to database (can only be run once per day).
            </p>
          </CardContent>
        </Card>

        {/* Reports History Dialog */}
        <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Reports History</DialogTitle>
              <DialogDescription>
                View all saved reports. Use the date filters to narrow down results.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Filters */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Category:</label>
                  <select
                    className="border rounded-md px-3 py-2 h-9 min-w-[140px]"
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                  >
                    <option value="all">All Reports</option>
                    <option value="z-report">Z-Report</option>
                    <option value="inventory">Inventory Report</option>
                    <option value="profit">Profit/Trends</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">From:</label>
                  <Input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="w-44"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">To:</label>
                  <Input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="w-44"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilterStartDate("");
                    setFilterEndDate("");
                    setFilterCategory("all");
                  }}
                >
                  Clear Filters
                </Button>
              </div>

              {/* Reports List */}
              {reportsLoading ? (
                <div className="py-6 text-center text-muted-foreground">Loading reports...</div>
              ) : reportsError ? (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">
                  {reportsError}
                </div>
              ) : selectedReport ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{selectedReport.report_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedReport.report_type} • {new Date(selectedReport.date_created).toLocaleString()}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setSelectedReport(null)}>
                      Back to List
                    </Button>
                  </div>
                  <div className="border rounded-lg p-4 bg-muted/30 max-h-[50vh] overflow-y-auto">
                    <pre className="text-xs whitespace-pre-wrap font-mono">
                      {selectedReport.report_text}
                    </pre>
                  </div>
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground">
                  {reports.length === 0 ? "No reports found" : "No reports match the selected date range"}
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3">Report Name</th>
                        <th className="text-left p-3">Type</th>
                        <th className="text-left p-3">Date Created</th>
                        <th className="text-left p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReports.map((report) => (
                        <tr key={report.report_id} className="border-t hover:bg-muted/50">
                          <td className="p-3">{report.report_name}</td>
                          <td className="p-3">{report.report_type}</td>
                          <td className="p-3">{new Date(report.date_created).toLocaleString()}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedReport(report)}
                              >
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteReport(report.report_id)}
                              >
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setHistoryDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* X-Report Dialog */}
        <Dialog open={xReportDialogOpen} onOpenChange={setXReportDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>X-Report - Current Day Sales</DialogTitle>
              <DialogDescription>
                This is a temporary report showing today's sales activity. It is not saved to the database.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {dailyReportData && (
                <div className="border rounded-lg p-4 bg-muted/30 max-h-[60vh] overflow-y-auto">
                  <pre className="text-xs whitespace-pre-wrap font-mono">
                    {formatReportText(dailyReportData)}
                  </pre>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setXReportDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Z-Report Dialog */}
        <Dialog open={zReportDialogOpen} onOpenChange={setZReportDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Z-Report - End of Day Report</DialogTitle>
              <DialogDescription>
                This report has been saved to the database and marks the end of the business day.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {dailyReportData && (
                <div className="border rounded-lg p-4 bg-muted/30 max-h-[60vh] overflow-y-auto">
                  <pre className="text-xs whitespace-pre-wrap font-mono">
                    {dailyReportData.report_text || formatReportText(dailyReportData)}
                  </pre>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setZReportDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
