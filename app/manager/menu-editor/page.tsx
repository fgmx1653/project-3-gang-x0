"use client";

import React, { useEffect, useState } from "react";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type MenuItem = {
    id?: number;
    name?: string;
    price?: number | null;
    isavail?: boolean;
    seasonal?: boolean;
    [key: string]: any;
};

export default function Page() {
    const [items, setItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchItems();
    }, []);

    // Filter items based on search term - supports multiple words
    const filteredItems = items.filter((item) => {
        if (!searchTerm.trim()) return true;

        const itemName = item.name?.toLowerCase() || "";
        const searchWords = searchTerm.toLowerCase().trim().split(/\s+/);

        // Item matches if it contains ALL search words (in any order)
        return searchWords.every((word) => itemName.includes(word));
    });

    // Bulk actions
    const toggleAllAvailable = (value: boolean) => {
        setItems((prev) => prev.map((item) => ({ ...item, isavail: value })));
    };

    const toggleAllSeasonal = (value: boolean) => {
        setItems((prev) => prev.map((item) => ({ ...item, seasonal: value })));
    };

    const saveAllChanges = async () => {
        try {
            setError(null);
            const promises = items.map((item) =>
                fetch("/api/menu", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(item),
                })
            );
            await Promise.all(promises);
            await fetchItems(); // Refresh to get normalized data
        } catch (err: any) {
            setError(err?.message || "Error saving all changes");
        }
    };

    const fetchItems = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/menu");
            const data = await res.json();
            if (!data.ok) throw new Error(data.error || "Failed to load");
            // convert integer 0/1 to boolean for isavail and seasonal
            const normalizedItems = (data.items || []).map((item: any) => ({
                ...item,
                isavail: item.isavail === 1 || item.isavail === true,
                seasonal: item.seasonal === 1 || item.seasonal === true,
            }));
            setItems(normalizedItems);
        } catch (err: any) {
            setError(err?.message || "Error");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (idx: number, key: string, value: any) => {
        setItems((prev) => {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], [key]: value };
            return copy;
        });
    };

    const addItem = async () => {
        // defaults aligned with DB schema: name, price, isavail, seasonal
        const newItem: MenuItem = {
            name: "New item",
            price: 5.99,
            isavail: true,
            seasonal: false,
        };
        try {
            const res = await fetch("/api/menu", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newItem),
            });
            const data = await res.json();
            console.log("POST response:", data);
            if (!data.ok) throw new Error(data.error || "Create failed");
            // normalize returned item
            const normalizedItem = {
                ...data.item,
                isavail: data.item.isavail === 1 || data.item.isavail === true,
                seasonal:
                    data.item.seasonal === 1 || data.item.seasonal === true,
            };
            console.log("Normalized item:", normalizedItem);
            setItems((prev) => [...prev, normalizedItem]);
        } catch (err: any) {
            console.error("Error adding item:", err);
            setError(err?.message || "Error creating item");
        }
    };

    const saveItem = async (item: MenuItem, idx: number) => {
        try {
            const payload = { ...item };
            const res = await fetch("/api/menu", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!data.ok) throw new Error(data.error || "Save failed");
            // normalize returned item
            const normalizedItem = {
                ...data.item,
                isavail: data.item.isavail === 1 || data.item.isavail === true,
                seasonal:
                    data.item.seasonal === 1 || data.item.seasonal === true,
            };
            setItems((prev) => {
                const copy = [...prev];
                copy[idx] = normalizedItem;
                return copy;
            });
        } catch (err: any) {
            setError(err?.message || "Error saving item");
        }
    };

    const deleteItem = async (id?: number, idx?: number) => {
        // Check for null/undefined, but allow id of 0
        if (id === undefined || id === null) return;
        try {
            const res = await fetch(`/api/menu?id=${id}`, { method: "DELETE" });
            const data = await res.json();
            if (!data.ok) throw new Error(data.error || "Delete failed");
            if (typeof idx === "number") {
                setItems((prev) => prev.filter((_, i) => i !== idx));
            } else {
                fetchItems();
            }
        } catch (err: any) {
            setError(err?.message || "Error deleting item");
        }
    };

    return (
        <div className="p-6 h-screen flex flex-col">
            <Card className="flex flex-col h-full">
                <CardHeader>
                    <CardTitle>Menu Editor</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col flex-1 min-h-0">
                    {/* Fixed control section */}
                    <div className="space-y-4 mb-4">
                        {/* Action buttons */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <Button onClick={addItem}>Add item</Button>
                            <Button variant="outline" onClick={fetchItems}>
                                Refresh
                            </Button>
                            <Button variant="outline" onClick={saveAllChanges}>
                                Save All
                            </Button>
                            {loading && (
                                <div className="text-sm text-muted-foreground">
                                    Loading...
                                </div>
                            )}
                        </div>

                        {/* Search */}
                        <div className="flex items-center gap-2">
                            <Input
                                placeholder="Search menu items..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="max-w-sm"
                            />
                            {searchTerm && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSearchTerm("")}
                                >
                                    Clear
                                </Button>
                            )}
                        </div>

                        {/* Bulk actions */}
                        <div className="flex items-center gap-4 flex-wrap text-sm">
                            <span className="font-medium">Bulk Actions:</span>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => toggleAllAvailable(true)}
                                >
                                    Set All Available
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => toggleAllAvailable(false)}
                                >
                                    Set All Unavailable
                                </Button>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => toggleAllSeasonal(true)}
                                >
                                    Set All Seasonal
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => toggleAllSeasonal(false)}
                                >
                                    Set All Non-Seasonal
                                </Button>
                            </div>
                        </div>

                        {error && (
                            <div className="text-destructive">{error}</div>
                        )}
                    </div>

                    {/* Scrollable items container */}
                    <div className="flex-1 overflow-y-auto border rounded-md p-4">
                        <div className="grid gap-4">
                            {filteredItems.length === 0 && searchTerm && (
                                <div className="text-center text-muted-foreground py-8">
                                    No items match "{searchTerm}"
                                </div>
                            )}
                            {filteredItems.length === 0 &&
                                !searchTerm &&
                                !loading && (
                                    <div className="text-center text-muted-foreground py-8">
                                        No menu items. Click "Add item" to
                                        create one.
                                    </div>
                                )}
                            {filteredItems.map((it, idx) => {
                                // Get the original index in the full items array
                                const originalIdx = items.findIndex(
                                    (item) => item.id === it.id
                                );
                                return (
                                    <div
                                        key={it.id ?? idx}
                                        className="grid grid-cols-12 gap-2 items-center"
                                    >
                                        <div className="col-span-5">
                                            <Input
                                                value={it.name ?? ""}
                                                onChange={(e) =>
                                                    handleChange(
                                                        originalIdx,
                                                        "name",
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="Name"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={it.price ?? 0}
                                                onChange={(e) =>
                                                    handleChange(
                                                        originalIdx,
                                                        "price",
                                                        Number(e.target.value)
                                                    )
                                                }
                                                placeholder="Price"
                                            />
                                        </div>
                                        <div className="col-span-2 flex items-center gap-2">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={!!it.isavail}
                                                    onChange={(e) =>
                                                        handleChange(
                                                            originalIdx,
                                                            "isavail",
                                                            e.target.checked
                                                        )
                                                    }
                                                    className="cursor-pointer"
                                                />
                                                <span className="text-sm">
                                                    Available
                                                </span>
                                            </label>
                                        </div>
                                        <div className="col-span-2 flex items-center gap-2">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={!!it.seasonal}
                                                    onChange={(e) =>
                                                        handleChange(
                                                            originalIdx,
                                                            "seasonal",
                                                            e.target.checked
                                                        )
                                                    }
                                                    className="cursor-pointer"
                                                />
                                                <span className="text-sm">
                                                    Seasonal
                                                </span>
                                            </label>
                                        </div>
                                        <div className="col-span-1 flex gap-1">
                                            <Button
                                                size="sm"
                                                onClick={() =>
                                                    saveItem(it, originalIdx)
                                                }
                                            >
                                                Save
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() =>
                                                    deleteItem(
                                                        it.id,
                                                        originalIdx
                                                    )
                                                }
                                            >
                                                Del
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </CardContent>
                <CardFooter />
            </Card>
        </div>
    );
}
