// app/manager/inventory/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Item = {
  id: number;
  name: string;       // mapped from ingredients
  quantity: number;
  price: number;      // unit cost
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

  // inline edits
  const [edit, setEdit] = useState<Record<number, Partial<Item>>>({});

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
    try {
      const patch = edit[id];
      if (!patch) return;
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
    try {
      const payload = {
        name: nName.trim(),
        quantity: nQty === "" ? 0 : Number(nQty),
        price: nPrice === "" ? 0 : Number(nPrice),
      };
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Add failed");
      setNName(""); setNQty(""); setNPrice("");
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

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => router.back()} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
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
          </div>
        </div>

        {/* Add item */}
        <Card>
          <CardHeader><CardTitle>Add Ingredient</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <Input placeholder="Ingredient name" value={nName} onChange={(e) => setNName(e.target.value)} />
              <Input placeholder="Quantity" type="number" value={nQty} onChange={(e) => setNQty(e.target.value === "" ? "" : Number(e.target.value))} />
              <Input placeholder="Unit cost" type="number" step="0.01" value={nPrice} onChange={(e) => setNPrice(e.target.value === "" ? "" : Number(e.target.value))} />
              <div className="md:col-span-2">
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
                    <th className="py-2 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr><td className="py-3" colSpan={5}>No items</td></tr>
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
      </div>
    </div>
  );
}
