"use client";

import React, { useEffect, useState } from "react";
import ClearCartOnMount from "@/components/ClearCartOnMount";
import Link from "next/link";
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
  isexclusive?: boolean;
  ingredientIds?: number[];
  [key: string]: any;
};

type Ingredient = {
  id: number;
  ingredients: string;
  price: number;
  quantity: number;
};

export default function Page() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingIngredientsFor, setEditingIngredientsFor] = useState<
    number | null
  >(null);
  const [imageUploadingFor, setImageUploadingFor] = useState<number | null>(
    null
  );
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetchItems();
    fetchIngredients();
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

  const toggleAllExclusive = (value: boolean) => {
    setItems((prev) => prev.map((item) => ({ ...item, isexclusive: value })));
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

      // convert integer 0/1 to boolean for isavail, seasonal and isexclusive
      const normalizedItems = await Promise.all(
        (data.items || []).map(async (item: any) => {
          // Fetch ingredients for each item
          const ingredientsRes = await fetch(
            `/api/menu-item-ingredients?menu_item_id=${item.id}`
          );
          const ingredientsData = await ingredientsRes.json();

          return {
            ...item,
            isavail: item.isavail === 1 || item.isavail === true,
            seasonal: item.seasonal === 1 || item.seasonal === true,
            isexclusive:
              item.isexclusive === 1 || item.isexclusive === true,
            ingredientIds: ingredientsData.ok
              ? ingredientsData.ingredientIds
              : [],
          };
        })
      );
      setItems(normalizedItems);
    } catch (err: any) {
      setError(err?.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  const fetchIngredients = async () => {
    try {
      const res = await fetch("/api/ingredients");
      const data = await res.json();
      if (data.ok) {
        setIngredients(data.ingredients || []);
      }
    } catch (err: any) {
      console.error("Error fetching ingredients:", err);
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
      isexclusive: false,
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
        seasonal: data.item.seasonal === 1 || data.item.seasonal === true,
        isexclusive:
          data.item.isexclusive === 1 || data.item.isexclusive === true,
        ingredientIds: [], // Start with no ingredients
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
      // Remove ingredientIds from the payload as it's saved separately
      delete payload.ingredientIds;

      const res = await fetch("/api/menu", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Save failed");

      // Save ingredient associations
      if (item.id !== undefined && item.id !== null && item.ingredientIds) {
        await saveItemIngredients(item.id, item.ingredientIds);
      }

      // normalize returned item
      const normalizedItem = {
        ...data.item,
        isavail: data.item.isavail === 1 || data.item.isavail === true,
        seasonal: data.item.seasonal === 1 || data.item.seasonal === true,
        isexclusive:
          data.item.isexclusive === 1 || data.item.isexclusive === true,
        ingredientIds: item.ingredientIds || [],
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

  const saveItemIngredients = async (
    menuItemId: number,
    ingredientIds: number[]
  ) => {
    try {
      const res = await fetch("/api/menu-item-ingredients", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menu_item_id: menuItemId,
          ingredient_ids: ingredientIds,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to save ingredients");
    } catch (err: any) {
      console.error("Error saving ingredients:", err);
      throw err;
    }
  };

  const toggleIngredient = (itemIdx: number, ingredientId: number) => {
    console.log("Toggle ingredient called:", { itemIdx, ingredientId });
    setItems((prev) => {
      if (itemIdx < 0 || itemIdx >= prev.length) {
        console.error("Invalid item index:", itemIdx);
        return prev;
      }

      const item = prev[itemIdx];
      const currentIds = item.ingredientIds || [];

      let newIngredientIds: number[];
      if (currentIds.includes(ingredientId)) {
        newIngredientIds = currentIds.filter((id) => id !== ingredientId);
      } else {
        newIngredientIds = [...currentIds, ingredientId];
      }

      console.log("Updated ingredient IDs:", newIngredientIds);

      // Create a new array with the updated item (immutable update)
      return prev.map((it, idx) =>
        idx === itemIdx ? { ...it, ingredientIds: newIngredientIds } : it
      );
    });
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
      {/* Ensure any kiosk cart is cleared when opening manager menu editor */}
      <ClearCartOnMount />
      {/* Hidden file input used for image uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          const currentId = imageUploadingFor;
          if (!file || !currentId) return;
          setUploading(true);
          try {
            // read file as array buffer then base64
            const buf = await file.arrayBuffer();
            const b64 = Buffer.from(buf).toString("base64");

            // find item name for currentId
            const item = items.find((x) => x.id === currentId);
            const name = item?.name || String(currentId);

            // construct filename: up to first 3 words, joined with underscores, sanitized
            const words = name
              .trim()
              .split(/\s+/)
              .slice(0, 3)
              .map((w) => w.toLowerCase().replace(/[^a-z0-9]/g, ""))
              .filter(Boolean);
            let filename = words.join("_") || String(currentId);
            if (!filename.toLowerCase().endsWith(".png")) filename += ".png";

            const res = await fetch("/api/upload-image", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ filename, data: b64 }),
            });
            const data = await res.json();
            if (!data.ok) throw new Error(data.error || "Upload failed");
            // optionally: show success toast or update item metadata
            alert(`Saved image as ${data.filename}`);
          } catch (err: any) {
            console.error("Image upload error:", err);
            alert(err?.message || "Failed to upload image");
          } finally {
            setUploading(false);
            setImageUploadingFor(null);
            // reset file input
            if (fileInputRef.current) fileInputRef.current.value = "";
          }
        }}
      />
      <Card className="flex flex-col h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Menu Editor</CardTitle>
            <Link href="/manager">
              <Button variant="outline">Back</Button>
            </Link>
          </div>
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
                <div className="text-sm text-muted-foreground">Loading...</div>
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

            {error && <div className="text-destructive">{error}</div>}
          </div>

          {/* Scrollable items container */}
          <div className="flex-1 overflow-y-auto border rounded-md p-4">
            <div className="grid gap-4">
              {filteredItems.length === 0 && searchTerm && (
                <div className="text-center text-muted-foreground py-8">
                  No items match "{searchTerm}"
                </div>
              )}
              {filteredItems.length === 0 && !searchTerm && !loading && (
                <div className="text-center text-muted-foreground py-8">
                  No menu items. Click "Add item" to create one.
                </div>
              )}
              {filteredItems.map((it, idx) => {
                // Get the original index in the full items array
                const originalIdx = items.findIndex(
                  (item) => item.id === it.id
                );
                const isEditingIngredients = editingIngredientsFor === it.id;
                const ingredientCount = it.ingredientIds?.length || 0;

                return (
                  <div key={it.id ?? idx} className="border rounded-lg p-3">
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-4">
                        <Input
                          value={it.name ?? ""}
                          onChange={(e) =>
                            handleChange(originalIdx, "name", e.target.value)
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
                          <span className="text-sm">Available</span>
                        </label>
                      </div>
                              <div className="col-span-1 flex items-center gap-2">
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
                                  <span className="text-sm">Seasonal</span>
                                </label>
                              </div>

                              <div className="col-span-1 flex items-center gap-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={!!it.isexclusive}
                                    onChange={(e) =>
                                      handleChange(
                                        originalIdx,
                                        "isexclusive",
                                        e.target.checked
                                      )
                                    }
                                    className="cursor-pointer"
                                  />
                                  <span className="text-sm">Exclusive</span>
                                </label>
                              </div>
                      <div className="col-span-2 flex gap-1 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setEditingIngredientsFor(
                              isEditingIngredients ? null : it.id ?? null
                            )
                          }
                          title="Edit ingredients"
                        >
                          🥤 ({ingredientCount})
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => saveItem(it, originalIdx)}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setImageUploadingFor(it.id ?? null);
                            // trigger hidden file input
                            setTimeout(() => {
                              fileInputRef.current?.click();
                            }, 0);
                          }}
                        >
                          {uploading && imageUploadingFor === it.id
                            ? "Uploading..."
                            : "Upload Image"}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteItem(it.id, originalIdx)}
                        >
                          Del
                        </Button>
                      </div>
                    </div>

                    {/* Ingredients editor - expandable */}
                    {isEditingIngredients && (
                      <div className="mt-3 pt-3 border-t">
                        <h4 className="text-sm font-medium mb-2">
                          Select Ingredients for {it.name}
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                          {ingredients.map((ing) => {
                            const isSelected = (
                              it.ingredientIds || []
                            ).includes(ing.id);
                            return (
                              <label
                                key={ing.id}
                                className={`flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-accent ${
                                  isSelected
                                    ? "bg-primary/10 border-primary"
                                    : ""
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() =>
                                    toggleIngredient(originalIdx, ing.id)
                                  }
                                  className="cursor-pointer"
                                />
                                <span className="text-sm">
                                  {ing.ingredients}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
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
