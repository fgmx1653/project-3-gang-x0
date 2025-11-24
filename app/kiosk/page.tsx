"use client";

import { Button } from "@/components/ui/button";
import Iridescence from "@/components/Iridescence";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Image from "next/image";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Home() {
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const TAX_RATE = 0.085;
  const subtotal = cart.reduce((sum, item) => sum + Number(item.price || 0), 0);
  const tax = subtotal * TAX_RATE;
  const grandTotal = subtotal + tax;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState<string>("all");
  const [search, setSearch] = useState<string>("");

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const raw = window.localStorage.getItem("cart");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed))
            setCart(
              parsed.map((it: any) => ({
                ...it,
                boba: it?.boba ?? 100,
                ice: it?.ice ?? 100,
                sugar: it?.sugar ?? 100,
              }))
            );
        }
      }
    } catch (e) {
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("cart", JSON.stringify(cart));
      }
    } catch (e) {}
  }, [cart, hydrated]);

  const router = useRouter();

  async function getMenuItems() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/menu");
      const data = await res.json();

      if (res.ok && data.ok) {
        // Title-case menu item names and sort alphabetically (case-insensitive)
        const items = (data.items || []).map((it: any) => ({
          ...it,
          name: capitalizeWords(it.name),
        }));
        items.sort((a: any, b: any) =>
          String(a.name || "").localeCompare(String(b.name || ""), undefined, {
            sensitivity: "base",
          })
        );
        setMenuItems(items);
        setLoading(false);
        return { ok: true };
      }

      setError(data?.error || "Failed to load menu");
      setLoading(false);
      return { ok: false };
    } catch (err) {
      console.error("Menu request", err);
      setError("Network error");
      setLoading(false);
      return { ok: false };
    }
  }

  useEffect(() => {
    getMenuItems();
  }, []);

  function addToCart(item: any) {
    const withMods = { ...item, boba: 100, ice: 100, sugar: 100 };
    setCart((prev) => [...prev, withMods]);
  }

  function capitalizeWords(input: any) {
    const s = String(input ?? "").trim();
    if (!s) return "";
    return s
      .split(/\s+/)
      .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : ""))
      .join(" ");
  }

  return (
    <div className="flex flex-col w-full h-screen overflow-hidden relative">
      <div className="fixed inset-0 -z-20 bg-white/50">
        <Iridescence
          color={[1.0, 0.7, 0.7]}
          mouseReact={true}
          amplitude={0.1}
          speed={1.0}
        />
      </div>

      <div className="flex-none p-6 z-10">
        <Link href="/">
          <Button variant="outline" className="shadow-md">
            Home
          </Button>
        </Link>
      </div>

      <Tabs
        defaultValue="all"
        value={tab}
        className="flex-1 flex flex-col min-h-0 px-8 gap-4"
      >
        <div className="flex-none bg-white/60 backdrop-blur-md p-2 rounded-xl flex flex-wrap gap-2 items-center shadow-sm">
          <TabsList className="bg-transparent h-auto flex flex-wrap gap-2 p-0">
            {["all", "milk", "green", "black", "seasonal"].map((cat) => (
              <TabsTrigger
                key={cat}
                onClick={() => setTab(cat)}
                className="px-6 py-3 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md transition-all capitalize"
                value={cat}
              >
                {cat === "all"
                  ? "All Drinks"
                  : cat
                      .replace("milk", " Milk")
                      .replace("green", " Green")
                      .replace("black", " Black") +
                    (cat !== "seasonal" ? " Tea" : "")}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex-1 min-w-[200px] flex justify-end">
            <Input
              value={search}
              type="text"
              onChange={(e) => {
                setSearch(e.target.value);
                if (search !== "") {
                  setTab("all");
                }
              }}
              className="w-full max-w-xs bg-white/50 border-black/10 focus:bg-white transition-colors"
              placeholder="Search items..."
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 rounded-lg border bg-white/10 backdrop-blur-sm overflow-hidden">
          <ScrollArea className="h-full p-4">
            {["all", "milk", "green", "black", "seasonal"].map((catValue) => (
              <TabsContent
                key={catValue}
                value={catValue}
                className="mt-0 h-full"
              >
                <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-6 pb-6">
                  {menuItems
                    .filter((item) => {
                      const matchesSearch = item.name
                        .toLowerCase()
                        .includes(search.toLowerCase());
                      if (!matchesSearch) return false;
                      if (catValue === "all") return true;
                      if (catValue === "seasonal") return item.seasonal === 1;
                      return item.name.toLowerCase().includes(catValue);
                    })
                    .map((item) => (
                      <Card
                        key={item.id}
                        onClick={() => addToCart(item)}
                        className="bg-white/80 backdrop-blur-md hover:scale-105 hover:shadow-xl hover:bg-white transition-all duration-200 cursor-pointer border-2 border-transparent hover:border-primary/20 flex flex-col aspect-[4/5]"
                      >
                        <CardContent className="flex-1 flex flex-col justify-between items-center p-4">
                          <div className="relative w-full flex-1 min-h-[120px] mb-4">
                            <Image
                              src={`/img/${item.name
                                .replace(/\s+/g, "_")
                                .replace(/[^a-zA-Z0-9_]/g, "")}.png`}
                              alt={item.name}
                              fill
                              className="object-contain drop-shadow-md"
                            />
                          </div>
                          <div className="text-center w-full space-y-1">
                            <h1 className="font-deco font-bold text-lg leading-tight line-clamp-2 h-12 flex items-center justify-center">
                              {item.name}
                            </h1>
                            <h1 className="font-deco text-xl text-primary font-semibold">
                              ${item.price}
                            </h1>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </TabsContent>
            ))}
          </ScrollArea>
        </div>
      </Tabs>

      <div className="flex-none bg-white/80 backdrop-blur-xl border-t border-black/5 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-6 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground uppercase tracking-wider font-bold">
              Total
            </span>
            <span className="text-4xl font-bold font-deco">
              ${subtotal.toFixed(2)}
            </span>
          </div>

          <Button
            size="lg"
            className="text-xl px-10 py-8 rounded-full shadow-lg animate-in slide-in-from-right-10"
            onClick={() => setCartOpen(true)}
          >
            View Cart ({cart.length})
          </Button>
        </div>
      </div>

      {cartOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in"
            onClick={() => setCartOpen(false)}
          />

          <div className="relative bg-white w-full max-w-lg h-[85vh] sm:h-[80vh] sm:rounded-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-10">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold font-deco">Your Cart</h2>
              <Button
                onClick={() => setCartOpen(false)}
                variant="ghost"
                size="icon"
                className="rounded-full"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                  <span className="text-6xl mb-4">🧋</span>
                  <p>Your cart is empty</p>
                </div>
              ) : (
                cart.map((item: any, idx) => {
                  const boba = item?.boba ?? 100;
                  const ice = item?.ice ?? 100;
                  const sugar = item?.sugar ?? 100;
                  return (
                    <div
                      key={idx}
                      className="flex flex-col border-b border-gray-100 pb-6 last:border-0"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span className="font-bold text-lg block">
                            {item.name}
                          </span>
                          <span className="text-primary font-medium">
                            ${item.price}
                          </span>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-8 px-3"
                          onClick={() =>
                            setCart(cart.filter((_, i) => i !== idx))
                          }
                        >
                          Remove
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 gap-3 bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-500 uppercase w-12">
                            Boba
                          </span>
                          <div className="flex gap-1 flex-1 justify-end">
                            {[0, 50, 100].map((pct) => (
                              <button
                                key={`boba-${idx}-${pct}`}
                                onClick={() => {
                                  setCart((prev) => {
                                    const copy = [...prev];
                                    copy[idx] = { ...copy[idx], boba: pct };
                                    return copy;
                                  });
                                }}
                                className={`px-2 py-1 text-xs rounded-md transition-all ${
                                  boba === pct
                                    ? "bg-black text-white shadow-sm"
                                    : "bg-white text-gray-600 border hover:bg-gray-200"
                                }`}
                              >
                                {pct}%
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-500 uppercase w-12">
                            Ice
                          </span>
                          <div className="flex gap-1 flex-1 justify-end">
                            {[0, 50, 100].map((pct) => (
                              <button
                                key={`ice-${idx}-${pct}`}
                                onClick={() => {
                                  setCart((prev) => {
                                    const copy = [...prev];
                                    copy[idx] = { ...copy[idx], ice: pct };
                                    return copy;
                                  });
                                }}
                                className={`px-2 py-1 text-xs rounded-md transition-all ${
                                  ice === pct
                                    ? "bg-blue-500 text-white shadow-sm"
                                    : "bg-white text-gray-600 border hover:bg-gray-200"
                                }`}
                              >
                                {pct}%
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-500 uppercase w-12">
                            Sugar
                          </span>
                          <div className="flex gap-1 flex-1 justify-end">
                            {[0, 50, 100].map((pct) => (
                              <button
                                key={`sugar-${idx}-${pct}`}
                                onClick={() => {
                                  setCart((prev) => {
                                    const copy = [...prev];
                                    copy[idx] = { ...copy[idx], sugar: pct };
                                    return copy;
                                  });
                                }}
                                className={`px-2 py-1 text-xs rounded-md transition-all ${
                                  sugar === pct
                                    ? "bg-pink-500 text-white shadow-sm"
                                    : "bg-white text-gray-600 border hover:bg-gray-200"
                                }`}
                              >
                                {pct}%
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-6 bg-gray-50 border-t">
              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Tax (8.5%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-2xl font-bold pt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span>${grandTotal.toFixed(2)}</span>
                </div>
              </div>
              <Button
                onClick={() => {
                  try {
                    if (typeof window !== "undefined") {
                      window.localStorage.setItem("cart", JSON.stringify(cart));
                    }
                  } catch (e) {}
                  router.push("/kiosk/checkout");
                }}
                className="w-full text-lg py-6"
                disabled={cart.length === 0}
              >
                Proceed to Checkout
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
