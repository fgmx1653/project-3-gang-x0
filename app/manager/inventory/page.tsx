// app/manager/inventory/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, RefreshCw, Save, Trash2, FileText, BarChart3 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Item = {
  id: number;
  name: string;       // mapped from ingredients
  quantity: number;
  price: number;      // unit cost
  istopping: number;  // 0 or 1
};

export default function InventoryPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // new item form
  const [nName, setNName] = useState("");
  const [nQty, setNQty] = useState<number | "">("");
  const [nPrice, setNPrice] = useState<number | "">("");
  const [nIsTopping, setNIsTopping] = useState(false);

  // inline edits
  const [edit, setEdit] = useState<Record<number, Partial<Item>>>({});

  // inventory report dialog
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportThreshold, setReportThreshold] = useState<number | "">("");
  const [reportData, setReportData] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // product usage chart dialog
  const [usageDialogOpen, setUsageDialogOpen] = useState(false);
  const [usageStart, setUsageStart] = useState<string>("");
  const [usageEnd, setUsageEnd] = useState<string>("");
  const [usageData, setUsageData] = useState<any>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL("/api/inventory", window.location.origin);
      if (q.trim()) url.searchParams.set("q", q.trim());
      const res = await fetch(url.toString(), { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to fetch inventory");
      setItems(data.items || []);
    } catch (e: any) {
      setError(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-line */ }, []);

  const setField = (id: number, key: keyof Item, val: any) =>
    setEdit(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [key]: val } }));

  const saveRow = async (id: number) => {
    setError(null);

    const patch = edit[id];
    if (!patch) return;

    // Validation
    if (patch.name !== undefined && !patch.name.trim()) {
      setError("Ingredient name cannot be empty.");
      return;
    }
    if (patch.quantity !== undefined) {
      if (isNaN(Number(patch.quantity)) || Number(patch.quantity) < 0) {
        setError("Quantity must be a non-negative number.");
        return;
      }
    }
    if (patch.price !== undefined) {
      if (isNaN(Number(patch.price)) || Number(patch.price) < 0) {
        setError("Unit cost must be a non-negative number.");
        return;
      }
    }

    try {
      const res = await fetch(`/api/inventory/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Update failed");
      setEdit(prev => { const n = { ...prev }; delete n[id]; return n; });
      await load();
    } catch (e: any) {
      setError(e?.message || "Error");
    }
  };

  const restock = async (id: number, delta: number) => {
    setError(null);

    const item = items.find(i => i.id === id);
    if (!item) {
      setError("Item not found.");
      return;
    }

    if (item.quantity + delta < 0) {
      setError("Quantity cannot go below zero.");
      return;
    }

    try {
      const res = await fetch(`/api/inventory/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Restock failed");
      setItems(prev => prev.map(it => it.id === id ? { ...it, quantity: data.item.quantity } : it));
    } catch (e: any) {
      setError(e?.message || "Error");
    }
  };

  const addItem = async () => {
    setError(null);

    // Input validation
    if (!nName.trim()) {
      setError("Ingredient name cannot be empty.");
      return;
    }
    if (nQty === "" || isNaN(Number(nQty)) || Number(nQty) < 0) {
      setError("Quantity must be a non-negative number.");
      return;
    }
    if (nPrice === "" || isNaN(Number(nPrice)) || Number(nPrice) < 0) {
      setError("Unit cost must be a non-negative number.");
      return;
    }

    try {
      const payload = {
        name: nName.trim(),
        quantity: Number(nQty),
        price: Number(nPrice),
        istopping: nIsTopping ? 1 : 0,
      };
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Add failed");
      setNName(""); setNQty(""); setNPrice(""); setNIsTopping(false);
      await load();
    } catch (e: any) {
      setError(e?.message || "Error");
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this item?")) return;
    setError(null);
    try {
      const res = await fetch(`/api/inventory/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Delete failed");
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (e: any) {
      setError(e?.message || "Error");
    }
  };

  const openReportDialog = () => {
    setReportDialogOpen(true);
    setReportThreshold("");
    setReportData(null);
    setReportError(null);
  };

  const generateReport = async () => {
    if (reportThreshold === "" || reportThreshold < 0) {
      setReportError("Please enter a valid threshold value");
      return;
    }

    setReportLoading(true);
    setReportError(null);
    try {
      const res = await fetch(`/api/inventory/report?threshold=${reportThreshold}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to generate report");
      setReportData(data.report);
    } catch (e: any) {
      setReportError(e?.message || "Error generating report");
    } finally {
      setReportLoading(false);
    }
  };

  const saveReport = async () => {
    if (!reportData) return;

    setSaving(true);
    setReportError(null);
    try {
      // Format report as human-readable text
      const timestamp = new Date().toLocaleString();
      let reportText = `INVENTORY REPORT\n`;
      reportText += `Generated: ${timestamp}\n`;
      reportText += `Threshold: ${reportData.threshold}\n`;
      reportText += `\n========================================\n`;
      reportText += `SUMMARY\n`;
      reportText += `========================================\n`;
      reportText += `Total Low Stock Items: ${reportData.summary.totalLowStock}\n`;
      reportText += `Total Affected Menu Items: ${reportData.summary.totalAffectedMenuItems}\n`;
      reportText += `\n========================================\n`;
      reportText += `INVENTORY ITEMS BELOW THRESHOLD\n`;
      reportText += `========================================\n`;

      if (reportData.lowStockItems.length === 0) {
        reportText += `No items below threshold.\n`;
      } else {
        reportData.lowStockItems.forEach((item: any) => {
          reportText += `\nID: ${item.id}\n`;
          reportText += `  Ingredient: ${item.name}\n`;
          reportText += `  Quantity: ${item.quantity}\n`;
          reportText += `  Unit Cost: $${item.price.toFixed(2)}\n`;
        });
      }

      reportText += `\n========================================\n`;
      reportText += `MENU ITEMS AFFECTED\n`;
      reportText += `========================================\n`;

      if (reportData.affectedMenuItems.length === 0) {
        reportText += `No menu items affected.\n`;
      } else {
        reportData.affectedMenuItems.forEach((item: any) => {
          reportText += `\nID: ${item.id}\n`;
          reportText += `  Menu Item: ${item.name}\n`;
          reportText += `  Price: $${item.price.toFixed(2)}\n`;
          reportText += `  Missing Ingredients: ${item.missing_ingredients.join(", ")}\n`;
        });
      }

      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_name: `Inventory Report - Threshold ${reportData.threshold} - ${timestamp}`,
          report_type: "Inventory Report",
          report_text: reportText,
        }),
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to save report");

      alert("Report saved successfully!");
      setReportDialogOpen(false);
    } catch (e: any) {
      setReportError(e?.message || "Error saving report");
    } finally {
      setSaving(false);
    }
  };

  const openUsageDialog = () => {
    // Set default dates (last 7 days)
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    setUsageEnd(today.toISOString().split('T')[0]);
    setUsageStart(weekAgo.toISOString().split('T')[0]);
    setUsageDialogOpen(true);
    setUsageData(null);
    setUsageError(null);
  };

  const fetchUsageData = async () => {
    if (!usageStart || !usageEnd) {
      setUsageError("Please select both start and end dates");
      return;
    }

    // Validate dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(usageStart);
    const endDate = new Date(usageEnd);

    if (startDate > today) {
      setUsageError("Start date cannot be in the future");
      return;
    }

    if (endDate > today) {
      setUsageError("End date cannot be in the future");
      return;
    }

    if (startDate > endDate) {
      setUsageError("Start date must be before or equal to end date");
      return;
    }

    setUsageLoading(true);
    setUsageError(null);
    try {
      const params = new URLSearchParams();
      params.set("start", usageStart);
      params.set("end", usageEnd);

      const res = await fetch(`/api/inventory/usage?${params.toString()}`);
      const data = await res.json();

      if (!data.ok) throw new Error(data.error || "Failed to fetch usage data");
      setUsageData(data.usage);
    } catch (e: any) {
      setUsageError(e?.message || "Error fetching usage data");
    } finally {
      setUsageLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative">
      <Link className="absolute top-8 left-8" href="/manager">
        <Button variant="outline">← Back</Button>
      </Link>
      <div className="max-w-7xl mx-auto px-6 py-6 pt-24 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">Inventory</h1>
          </div>
          <div className="flex items-center gap-2">
            <Input
              className="w-64"
              placeholder="Search ingredient…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
            />
            <Button onClick={load} className="gap-2"><RefreshCw className="h-4 w-4" /> Refresh</Button>
            <Button onClick={openUsageDialog} variant="outline" className="gap-2">
              <BarChart3 className="h-4 w-4" /> Product Usage Chart
            </Button>
            <Button onClick={openReportDialog} variant="outline" className="gap-2">
              <FileText className="h-4 w-4" /> Generate Inventory Report
            </Button>
          </div>
        </div>

        {/* Add item */}
        <Card>
          <CardHeader><CardTitle>Add Ingredient</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <Input placeholder="Ingredient name" value={nName} onChange={(e) => setNName(e.target.value)} />
              <Input
                placeholder="Quantity"
                type="number"
                value={nQty}
                onChange={(e) => setNQty(e.target.value === "" ? "" : Number(e.target.value))}
              />
              <Input
                placeholder="Unit cost"
                type="number"
                step="0.01"
                value={nPrice}
                onChange={(e) => setNPrice(e.target.value === "" ? "" : Number(e.target.value))}
              />
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={nIsTopping}
                  onChange={(e) => setNIsTopping(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">Topping</span>
              </label>
              <div>
                <Button className="gap-2" onClick={addItem}><Plus className="h-4 w-4" /> Add</Button>
              </div>
            </div>
            {error && <div className="mt-3 text-sm text-destructive">{error}</div>}
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Ingredients {loading && <span className="text-sm font-normal opacity-70">Loading…</span>}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left border-b">
                  <tr>
                    <th className="py-2 pr-4">ID</th>
                    <th className="py-2 pr-4">Ingredient</th>
                    <th className="py-2 pr-4">Quantity</th>
                    <th className="py-2 pr-4">Unit Cost</th>
                    <th className="py-2 pr-4">Topping</th>
                    <th className="py-2 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr><td className="py-3" colSpan={6}>No items</td></tr>
                  ) : items.map((it) => {
                    const e = edit[it.id] || {};
                    return (
                      <tr key={it.id} className="border-b last:border-0">
                        <td className="py-2 pr-4">{it.id}</td>
                        <td className="py-2 pr-4">
                          <Input
                            value={e.name ?? it.name}
                            onChange={(ev) => setField(it.id, "name", ev.target.value)}
                          />
                        </td>
                        <td className="py-2 pr-4">
                          <div className="flex gap-2 items-center">
                            <Input
                              type="number"
                              value={e.quantity ?? it.quantity}
                              onChange={(ev) => setField(it.id, "quantity", Number(ev.target.value))}
                              className="w-24"
                            />
                            <Button size="sm" variant="outline" onClick={() => restock(it.id, -1)}>-1</Button>
                            <Button size="sm" variant="outline" onClick={() => restock(it.id, +1)}>+1</Button>
                          </div>
                        </td>
                        <td className="py-2 pr-4">
                          <Input
                            type="number"
                            step="0.01"
                            value={e.price ?? it.price}
                            onChange={(ev) => setField(it.id, "price", Number(ev.target.value))}
                            className="w-28"
                          />
                        </td>
                        <td className="py-2 pr-4">
                          <input
                            type="checkbox"
                            checked={(e.istopping ?? it.istopping) === 1}
                            onChange={(ev) => setField(it.id, "istopping", ev.target.checked ? 1 : 0)}
                            className="w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="py-2 pr-4">
                          <div className="flex items-center gap-2">
                            <Button size="sm" className="gap-1" onClick={() => saveRow(it.id)}>
                              <Save className="h-3 w-3" /> Save
                            </Button>
                            <Button size="sm" variant="destructive" className="gap-1" onClick={() => remove(it.id)}>
                              <Trash2 className="h-3 w-3" /> Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Report Dialog */}
        <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Generate Inventory Report</DialogTitle>
              <DialogDescription>
                Enter a threshold value to identify inventory items below that quantity and menu items affected by low stock.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Threshold Input */}
              {!reportData && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Quantity Threshold</label>
                  <Input
                    type="number"
                    placeholder="Enter threshold (e.g., 10)"
                    value={reportThreshold}
                    onChange={(e) => setReportThreshold(e.target.value === "" ? "" : Number(e.target.value))}
                    onKeyDown={(e) => e.key === "Enter" && generateReport()}
                  />
                </div>
              )}

              {/* Report Results */}
              {reportData && (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="bg-muted p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">Summary</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Threshold: <span className="font-medium">{reportData.threshold}</span></div>
                      <div>Low Stock Items: <span className="font-medium text-destructive">{reportData.summary.totalLowStock}</span></div>
                      <div>Affected Menu Items: <span className="font-medium text-destructive">{reportData.summary.totalAffectedMenuItems}</span></div>
                    </div>
                  </div>

                  {/* Low Stock Items */}
                  <div>
                    <h3 className="font-semibold mb-2">Inventory Items Below Threshold</h3>
                    {reportData.lowStockItems.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No items below threshold</p>
                    ) : (
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-muted">
                            <tr>
                              <th className="text-left p-2">ID</th>
                              <th className="text-left p-2">Ingredient</th>
                              <th className="text-left p-2">Quantity</th>
                              <th className="text-left p-2">Unit Cost</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.lowStockItems.map((item: any) => (
                              <tr key={item.id} className="border-t">
                                <td className="p-2">{item.id}</td>
                                <td className="p-2">{item.name}</td>
                                <td className="p-2 text-destructive font-medium">{item.quantity}</td>
                                <td className="p-2">${item.price.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Affected Menu Items */}
                  <div>
                    <h3 className="font-semibold mb-2">Menu Items Affected</h3>
                    {reportData.affectedMenuItems.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No menu items affected</p>
                    ) : (
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-muted">
                            <tr>
                              <th className="text-left p-2">ID</th>
                              <th className="text-left p-2">Menu Item</th>
                              <th className="text-left p-2">Price</th>
                              <th className="text-left p-2">Missing Ingredients</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.affectedMenuItems.map((item: any) => (
                              <tr key={item.id} className="border-t">
                                <td className="p-2">{item.id}</td>
                                <td className="p-2">{item.name}</td>
                                <td className="p-2">${item.price.toFixed(2)}</td>
                                <td className="p-2 text-destructive">{item.missing_ingredients.join(", ")}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Error Display */}
              {reportError && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">
                  {reportError}
                </div>
              )}
            </div>

            <DialogFooter>
              {!reportData ? (
                <>
                  <Button variant="outline" onClick={() => setReportDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={generateReport} disabled={reportLoading}>
                    {reportLoading ? "Generating..." : "Generate Report"}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setReportData(null)}>
                    New Report
                  </Button>
                  <Button variant="outline" onClick={() => setReportDialogOpen(false)}>
                    Close
                  </Button>
                  <Button onClick={saveReport} disabled={saving}>
                    {saving ? "Saving..." : "Save to Database"}
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Product Usage Chart Dialog */}
        <Dialog open={usageDialogOpen} onOpenChange={setUsageDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Product Usage Chart</DialogTitle>
              <DialogDescription>
                View ingredient and topping usage over a selected time period. Usage is calculated based on drink sizes and toppings ordered.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Time Window Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Date</label>
                  <Input
                    type="date"
                    value={usageStart}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setUsageStart(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date</label>
                  <Input
                    type="date"
                    value={usageEnd}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setUsageEnd(e.target.value)}
                  />
                </div>
              </div>

              <Button onClick={fetchUsageData} disabled={usageLoading} className="w-full">
                {usageLoading ? "Loading..." : "Generate Chart"}
              </Button>

              {/* Error Display */}
              {usageError && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">
                  {usageError}
                </div>
              )}

              {/* Chart Display */}
              {usageData && usageData.length > 0 && (
                <div className="space-y-4">
                  <div className="bg-muted p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">Summary</h3>
                    <div className="text-sm">
                      <div>Period: <span className="font-medium">{usageStart}</span> to <span className="font-medium">{usageEnd}</span></div>
                      <div>Total Items Tracked: <span className="font-medium">{usageData.length}</span></div>
                    </div>
                  </div>

                  {/* Bar Chart */}
                  <div className="border rounded-lg p-4 bg-white">
                    <h3 className="font-semibold mb-4">Usage by Ingredient/Topping</h3>
                    <div className="space-y-2">
                      {usageData.map((item: any, idx: number) => {
                          const totalUsage = usageData.reduce(
                          (sum: number, d: any) => sum + d.total_used,
                          0
                          );
                          
                          const percentage = totalUsage === 0
                          ? 0
                          : (item.total_used / totalUsage) * 100;  

                        return (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium truncate max-w-[200px]" title={item.name}>
                                {item.name}
                              </span>
                              <span className="text-muted-foreground">
                                {item.total_used} units
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-6 relative overflow-hidden">
                              <div
                                className="bg-blue-500 h-6 rounded-full transition-all duration-300 flex items-center justify-end pr-2"
                                style={{ width: `${percentage}%` }}
                              >
                                {percentage > 15 && (
                                  <span className="text-xs text-white font-medium">
                                    {percentage.toFixed(1)}%
                                  </span>
                                )}
                              </div>
                              {percentage <= 15 && (
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-700 font-medium">
                                  {percentage.toFixed(1)}%
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Data Table */}
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-2">Rank</th>
                          <th className="text-left p-2">Ingredient/Topping</th>
                          <th className="text-left p-2">Total Used</th>
                          <th className="text-left p-2">Percentage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usageData.map((item: any, idx: number) => {
                          const totalUsage = usageData.reduce((sum: number, d: any) => sum + d.total_used, 0);
                          const percentage = (item.total_used / totalUsage) * 100;

                          return (
                            <tr key={idx} className="border-t">
                              <td className="p-2 font-medium">#{idx + 1}</td>
                              <td className="p-2">{item.name}</td>
                              <td className="p-2 font-medium">{item.total_used}</td>
                              <td className="p-2 text-muted-foreground">{percentage.toFixed(1)}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {usageData && usageData.length === 0 && !usageLoading && (
                <div className="text-center py-8 text-muted-foreground">
                  No usage data found for the selected period.
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setUsageDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// Usage Bar Chart Component
function UsageBarChart({ data }: { data: Array<{ id: number; name: string; total_used: number }> }) {
  const maxUsage = Math.max(...data.map(d => d.total_used), 1);
  const height = 400;
  const padding = 60;
  const width = Math.max(720, 60 * data.length + padding * 2);

  const yScale = (v: number) => {
    const innerH = height - padding * 2;
    return padding + (innerH - (v / maxUsage) * innerH);
  };

  const xStep = (width - padding * 2) / Math.max(1, data.length);
  const labelEvery = data.length > 20 ? Math.ceil(data.length / 20) : 1;

  return (
    <div className="min-w-[720px] w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[400px]">
        {/* Axes */}
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="currentColor" strokeWidth="1" />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="currentColor" strokeWidth="1" />

        {/* Y-axis labels */}
        {Array.from({ length: 5 }).map((_, i) => {
          const val = (maxUsage * i) / 4;
          const y = yScale(val);
          return (
            <g key={i}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="currentColor" strokeOpacity="0.15" />
              <text x={padding - 8} y={y + 4} textAnchor="end" className="text-[10px] fill-current">
                {Math.round(val)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((item, i) => {
          const x = padding + i * xStep + xStep * 0.1;
          const w = xStep * 0.8;
          const v = item.total_used;
          const y = yScale(v);
          return (
            <g key={item.id}>
              <rect x={x} y={y} width={w} height={(height - padding) - y} fill="currentColor" opacity={0.7} />
            </g>
          );
        })}

        {/* X-axis labels */}
        {data.map((item, i) => {
          if (i % labelEvery !== 0) return null;
          const x = padding + i * xStep + xStep / 2;
          return (
            <text
              key={item.id}
              x={x}
              y={height - padding + 16}
              textAnchor="middle"
              className="text-[9px] fill-current"
              style={{
                maxWidth: `${xStep}px`,
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {item.name.length > 12 ? item.name.substring(0, 12) + '...' : item.name}
            </text>
          );
        })}

        {/* Title */}
        <text x={width / 2} y={20} textAnchor="middle" className="text-[12px] font-semibold fill-current">
          Usage by Ingredient/Topping
        </text>
      </svg>
    </div>
  );
}
