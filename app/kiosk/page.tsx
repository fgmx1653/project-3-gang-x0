"use client";

import { Button } from "@/components/ui/button";
import Iridescence from "@/components/Iridescence";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Image from "next/image";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { translateText } from '@/lib/translate';

export default function Home() {
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [cart, setCart] = useState<any[]>([]);
    const [cartOpen, setCartOpen] = useState(false);
    const [hydrated, setHydrated] = useState(false);

    const TAX_RATE = 0.085;
    const subtotal = cart.reduce(
        (sum, item) => sum + Number(item.price || 0),
        0
    );
    const tax = subtotal * TAX_RATE;
    const grandTotal = subtotal + tax;

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);

    const [tab, setTab] = useState<string>("all");
    const [search, setSearch] = useState<string>("");

    // Error message labels
    const [errorLoadingMenuLabel, setErrorLoadingMenuLabel] = useState('Error loading menu');
    const [retryButtonLabel, setRetryButtonLabel] = useState('Retry');
    const [networkErrorLabel, setNetworkErrorLabel] = useState('Network error. Please check your connection and try again.');
    const [serverErrorLabel, setServerErrorLabel] = useState('Server error. Please try again later.');


    // translating UI elements
    const [translatedMenuItems, setTranslatedMenuItems] = useState<any[]>([]);
    const { lang, setLang } = useLanguage();
    const [homeLabel, setHomeLabel] = useState('Home');
    const [allDrinksLabel, setAllDrinksLabel] = useState('All Drinks');
    const [milkTeaLabel, setMilkTeaLabel] = useState('Milk Tea');
    const [greenTeaLabel, setGreenTeaLabel] = useState('Green Tea');
    const [blackTeaLabel, setBlackTeaLabel] = useState('Black Tea');
    const [seasonalLabel, setSeasonalLabel] = useState('Seasonal');
    const [searchPlaceholderLabel, setSearchPlaceholderLabel] = useState('Search items...');
    const [subtotalLabel, setSubtotalLabel] = useState('Subtotal');
    const [totalLabel, setTotalLabel] = useState('Total');
    const [viewCartLabel, setViewCartLabel] = useState('View Cart');
    const [yourCartLabel, setYourCartLabel] = useState('Your Cart');
    const [removeLabel, setRemoveLabel] = useState('Remove');
    const [taxLabel, setTaxLabel] = useState('Tax');
    const [proceedToCheckoutLabel, setProceedToCheckoutLabel] = useState('Proceed to Checkout');
    const [bobaLabel, setBobaLabel] = useState('Boba');
    const [iceLabel, setIceLabel] = useState('Ice');
    const [sugarLabel, setSugarLabel] = useState('Sugar');
    const [emptyCartLabel, setEmptyCartLabel] = useState('Your cart is empty');
    const [clearCartLabel, setClearCartLabel] = useState('Clear Cart');


    // Accessibility: text size (root font-size in px). Persist in localStorage under 'textSize'
    const [textSize, setTextSize] = useState<number | null>(null);

    // When user changes language, update context
    const handleLangChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setLang(e.target.value);
    };

    const applyTextSize = (px: number) => {
        try {
            // set a CSS variable so we can target only kiosk text via .kiosk-text
            document.documentElement.style.setProperty(
                "--kiosk-text-size",
                `${px}px`
            );
            window.localStorage.setItem("textSize", String(px));
            setTextSize(px);
        } catch (e) {
            // ignore
        }
    };

    const increaseText = () =>
        applyTextSize(Math.min((textSize ?? 16) + 2, 24));
    const decreaseText = () =>
        applyTextSize(Math.max((textSize ?? 16) - 2, 16));
    const resetText = () => applyTextSize(16);

    useEffect(() => {
        // initialize from localStorage or computed root size
        try {
            const stored = window.localStorage.getItem("textSize");
            if (stored) {
                const n = Number(stored);
                if (!isNaN(n)) {
                    document.documentElement.style.setProperty(
                        "--kiosk-text-size",
                        `${n}px`
                    );
                    setTextSize(n);
                    return;
                }
            }
            // If nothing stored, default to 16px for the kiosk text variable
            document.documentElement.style.setProperty(
                "--kiosk-text-size",
                `16px`
            );
            setTextSize(16);
        } catch (e) {
            // ignore
        }

        // Initialization complete; text size variable has been set from storage (if any).
        return;
    }, []);

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
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            const res = await fetch("/api/menu", {
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (!res.ok) {
                if (res.status >= 500) {
                    throw new Error("server_error");
                } else if (res.status >= 400) {
                    throw new Error("client_error");
                }
            }

            const data = await res.json();

            if (data.ok && data.items) {
                // Title-case menu item names and sort alphabetically (case-insensitive)
                const items = (data.items || []).map((it: any) => ({
                    ...it,
                    name: capitalizeWords(it.name),
                }));
                items.sort((a: any, b: any) =>
                    String(a.name || "").localeCompare(
                        String(b.name || ""),
                        undefined,
                        {
                            sensitivity: "base",
                        }
                    )
                );
                setMenuItems(items);
                setError(null);
                setRetryCount(0); // Reset retry count on success
                setLoading(false);
                return { ok: true };
            }

            throw new Error(data?.error || "Failed to load menu");
        } catch (err: any) {
            console.error("Menu request error:", err);

            let errorMessage = networkErrorLabel;
            if (err.name === 'AbortError') {
                errorMessage = networkErrorLabel;
            } else if (err.message === 'server_error') {
                errorMessage = serverErrorLabel;
            } else if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
                errorMessage = networkErrorLabel;
            }

            setError(errorMessage);
            setLoading(false);
            return { ok: false };
        }
    }

    // Auto-retry logic for menu loading
    useEffect(() => {
        if (error && retryCount < 3) {
            const timer = setTimeout(() => {
                console.log(`Auto-retrying menu fetch (attempt ${retryCount + 1}/3)`);
                setRetryCount(prev => prev + 1);
                getMenuItems();
            }, 3000); // Retry after 3 seconds
            return () => clearTimeout(timer);
        }
    }, [error, retryCount]);

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

    // translation for UI labels with error handling
    useEffect(() => {
      async function translateLabels() {
          try {
              setHomeLabel(await translateText('Home', lang).catch(() => 'Home'));
              setAllDrinksLabel(await translateText('All Drinks', lang).catch(() => 'All Drinks'));
              setMilkTeaLabel(await translateText('Milk Tea', lang).catch(() => 'Milk Tea'));
              setGreenTeaLabel(await translateText('Green Tea', lang).catch(() => 'Green Tea'));
              setBlackTeaLabel(await translateText('Black Tea', lang).catch(() => 'Black Tea'));
              setSeasonalLabel(await translateText('Seasonal', lang).catch(() => 'Seasonal'));
              setSearchPlaceholderLabel(await translateText('Search items...', lang).catch(() => 'Search items...'));
              setSubtotalLabel(await translateText('Subtotal', lang).catch(() => 'Subtotal'));
              setTotalLabel(await translateText('Total', lang).catch(() => 'Total'));
              setViewCartLabel(await translateText('View Cart', lang).catch(() => 'View Cart'));
              setYourCartLabel(await translateText('Your Cart', lang).catch(() => 'Your Cart'));
              setRemoveLabel(await translateText('Remove', lang).catch(() => 'Remove'));
              setTaxLabel(await translateText('Tax', lang).catch(() => 'Tax'));
              setProceedToCheckoutLabel(await translateText('Proceed to Checkout', lang).catch(() => 'Proceed to Checkout'));
              setBobaLabel(await translateText('Boba', lang).catch(() => 'Boba'));
              setIceLabel(await translateText('Ice', lang).catch(() => 'Ice'));
              setSugarLabel(await translateText('Sugar', lang).catch(() => 'Sugar'));
              setEmptyCartLabel(await translateText('Your cart is empty', lang).catch(() => 'Your cart is empty'));
              setClearCartLabel(await translateText('Clear Cart', lang).catch(() => 'Clear Cart'));
              setErrorLoadingMenuLabel(await translateText('Error loading menu', lang).catch(() => 'Error loading menu'));
              setRetryButtonLabel(await translateText('Retry', lang).catch(() => 'Retry'));
              setNetworkErrorLabel(await translateText('Network error. Please check your connection and try again.', lang).catch(() => 'Network error. Please check your connection and try again.'));
              setServerErrorLabel(await translateText('Server error. Please try again later.', lang).catch(() => 'Server error. Please try again later.'));
          } catch (error) {
              console.error('Translation error:', error);
              // Labels will remain in their default English state
          }
      }
      translateLabels();
    }, [lang]);


    // translation for menu item names with error handling
    useEffect(() => {
        async function translateMenuNames() {
            if (!menuItems.length) {
                setTranslatedMenuItems([]);
                return;
            }
            try {
                const translated = await Promise.all(
                    menuItems.map(async item => {
                        try {
                            const translatedName = await translateText(item.name, lang);
                            return {
                                ...item,
                                name: translatedName
                            };
                        } catch (error) {
                            console.warn(`Failed to translate "${item.name}", using original`, error);
                            return item; // Fallback to original item if translation fails
                        }
                    })
                );
                setTranslatedMenuItems(translated);
            } catch (error) {
                console.error('Menu translation error:', error);
                setTranslatedMenuItems(menuItems); // Fallback to untranslated menu
            }
        }
        translateMenuNames();
    }, [menuItems, lang]);




    return (
        <div className="kiosk-text flex flex-col w-full h-screen overflow-hidden relative">
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
                            {homeLabel}
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
                        {["all", "milk", "green", "black", "seasonal"].map(
                            (cat) => (
                                <TabsTrigger
                                    key={cat}
                                    onClick={() => setTab(cat)}
                                    className="px-6 py-3 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md transition-all capitalize"
                                    value={cat}
                                >
                                    {cat === "all"
                                        ? allDrinksLabel
                                        : cat
                                              .replace("milk", milkTeaLabel)
                                              .replace("green", greenTeaLabel)
                                              .replace("black", blackTeaLabel)
                                              .replace("seasonal", seasonalLabel)
                                    }
                                </TabsTrigger>
                            )
                        )}
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
                            placeholder={searchPlaceholderLabel}
                        />
                    </div>
                </div>

                <div className="flex-1 min-h-0 rounded-lg border bg-white/10 backdrop-blur-sm overflow-hidden">
                    {/* Error Display */}
                    {error && (
                        <div className="p-6 m-4 bg-red-50 border-2 border-red-300 rounded-lg">
                            <div className="flex flex-col items-center gap-4">
                                <div className="text-center">
                                    <h3 className="text-xl font-bold text-red-800 mb-2">
                                        {errorLoadingMenuLabel}
                                    </h3>
                                    <p className="text-red-600">{error}</p>
                                    {retryCount > 0 && retryCount < 3 && (
                                        <p className="text-sm text-red-500 mt-2">
                                            Retrying... (Attempt {retryCount}/3)
                                        </p>
                                    )}
                                </div>
                                <Button
                                    onClick={() => {
                                        setRetryCount(0);
                                        getMenuItems();
                                    }}
                                    variant="destructive"
                                    className="shadow-lg"
                                >
                                    {retryButtonLabel}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Loading Display */}
                    {loading && !error && (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
                                <p className="text-xl font-deco text-gray-700">Loading menu...</p>
                            </div>
                        </div>
                    )}

                    <ScrollArea className="h-full p-4">
                        {["all", "milk", "green", "black", "seasonal"].map(
                            (catValue) => (
                                <TabsContent
                                    key={catValue}
                                    value={catValue}
                                    className="mt-0 h-full"
                                >
                                    <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-6 pb-6">
                                        {translatedMenuItems
                                            .filter((item) => {
                                                const matchesSearch = item.name
                                                    .toLowerCase()
                                                    .includes(
                                                        search.toLowerCase()
                                                    );
                                                if (!matchesSearch)
                                                    return false;
                                                if (catValue === "all")
                                                    return true;
                                                if (catValue === "seasonal")
                                                    return item.seasonal === 1;
                                                return item.name
                                                    .toLowerCase()
                                                    .includes(catValue);
                                            })
                                            .map((item, idx) => (
                                                <Card
                                                    key={item.id}
                                                    onClick={() =>
                                                        addToCart(menuItems[idx])
                                                    }
                                                    className="bg-white/80 backdrop-blur-md hover:scale-105 hover:shadow-xl hover:bg-white transition-all duration-200 cursor-pointer border-2 border-transparent hover:border-primary/20 flex flex-col aspect-[4/5]"
                                                >
                                                    <CardContent className="flex-1 flex flex-col justify-between items-center p-4">
                                                        <div className="relative w-full flex-1 min-h-[120px] mb-4">
                                                            <Image
                                                                src={`/img/${menuItems[idx].name
                                                                    .toLowerCase()
                                                                    .replace(
                                                                        /\s+/g,
                                                                        "_"
                                                                    )
                                                                    .replace(
                                                                        /[^a-z0-9_]/g,
                                                                        ""
                                                                    )}.png`}
                                                                alt={item.name}
                                                                fill
                                                                className="object-contain drop-shadow-md"
                                                            />
                                                        </div>
                                                        <div className="text-center w-full space-y-1">
                                                            <h1 className="font-deco font-bold text-lg leading-tight line-clamp-2 h-12 flex items-center justify-center">
                                                                {translatedMenuItems[idx].name}
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
                            )
                        )}
                    </ScrollArea>
                </div>
            </Tabs>

            <div className="flex-none bg-white/80 backdrop-blur-xl border-t border-black/5 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-6 z-20">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
                    <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground uppercase tracking-wider font-bold">
                            {subtotalLabel}
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
                        {viewCartLabel} ({cart.length})
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
                            <h2 className="text-2xl font-bold font-deco">
                                {yourCartLabel}
                            </h2>
                            <div className="flex items-center gap-2">
                                <Button
                                    onClick={() => {
                                        setCart([]);
                                    }}
                                    variant="outline"
                                    size="sm"
                                    className="text-sm"
                                    disabled={cart.length === 0}
                                >
                                    {clearCartLabel}
                                </Button>
                                <Button
                                    onClick={() => setCartOpen(false)}
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-full"
                                >
                                    <X className="h-6 w-6" />
                                </Button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {cart.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                                    <span className="text-6xl mb-4">🧋</span>
                                    <p>{emptyCartLabel}</p>
                                </div>
                            ) : (
                                cart.map((item: any, idx) => {
                                    const boba = item?.boba ?? 100;
                                    const ice = item?.ice ?? 100;
                                    const sugar = item?.sugar ?? 100;
                                    const currItemID = item?.id;
                                    const translatedItemWithID = translatedMenuItems.find(it => it.id === currItemID);
                                    const itemName = translatedItemWithID ? translatedItemWithID.name : item.name;
                                    return (
                                        <div
                                            key={idx}
                                            className="flex flex-col border-b border-gray-100 pb-6 last:border-0"
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <span className="font-bold text-lg block">
                                                        {itemName}
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
                                                        setCart(
                                                            cart.filter(
                                                                (_, i) =>
                                                                    i !== idx
                                                            )
                                                        )
                                                    }
                                                >
                                                    {removeLabel}
                                                </Button>
                                            </div>

                                            <div className="grid grid-cols-1 gap-3 bg-gray-50 p-3 rounded-lg">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-gray-500 uppercase w-12">
                                                        {bobaLabel}
                                                    </span>
                                                    <div className="flex gap-1 flex-1 justify-end">
                                                        {[0, 50, 100].map(
                                                            (pct) => (
                                                                <button
                                                                    key={`boba-${idx}-${pct}`}
                                                                    onClick={() => {
                                                                        setCart(
                                                                            (
                                                                                prev
                                                                            ) => {
                                                                                const copy =
                                                                                    [
                                                                                        ...prev,
                                                                                    ];
                                                                                copy[
                                                                                    idx
                                                                                ] =
                                                                                    {
                                                                                        ...copy[
                                                                                            idx
                                                                                        ],
                                                                                        boba: pct,
                                                                                    };
                                                                                return copy;
                                                                            }
                                                                        );
                                                                    }}
                                                                    className={`px-2 py-1 text-xs rounded-md transition-all ${
                                                                        boba ===
                                                                        pct
                                                                            ? "bg-black text-white shadow-sm"
                                                                            : "bg-white text-gray-600 border hover:bg-gray-200"
                                                                    }`}
                                                                >
                                                                    {pct}%
                                                                </button>
                                                            )
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-gray-500 uppercase w-12">
                                                        {iceLabel}
                                                    </span>
                                                    <div className="flex gap-1 flex-1 justify-end">
                                                        {[0, 50, 100].map(
                                                            (pct) => (
                                                                <button
                                                                    key={`ice-${idx}-${pct}`}
                                                                    onClick={() => {
                                                                        setCart(
                                                                            (
                                                                                prev
                                                                            ) => {
                                                                                const copy =
                                                                                    [
                                                                                        ...prev,
                                                                                    ];
                                                                                copy[
                                                                                    idx
                                                                                ] =
                                                                                    {
                                                                                        ...copy[
                                                                                            idx
                                                                                        ],
                                                                                        ice: pct,
                                                                                    };
                                                                                return copy;
                                                                            }
                                                                        );
                                                                    }}
                                                                    className={`px-2 py-1 text-xs rounded-md transition-all ${
                                                                        ice ===
                                                                        pct
                                                                            ? "bg-blue-500 text-white shadow-sm"
                                                                            : "bg-white text-gray-600 border hover:bg-gray-200"
                                                                    }`}
                                                                >
                                                                    {pct}%
                                                                </button>
                                                            )
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-gray-500 uppercase w-12">
                                                        {sugarLabel}
                                                    </span>
                                                    <div className="flex gap-1 flex-1 justify-end">
                                                        {[0, 50, 100].map(
                                                            (pct) => (
                                                                <button
                                                                    key={`sugar-${idx}-${pct}`}
                                                                    onClick={() => {
                                                                        setCart(
                                                                            (
                                                                                prev
                                                                            ) => {
                                                                                const copy =
                                                                                    [
                                                                                        ...prev,
                                                                                    ];
                                                                                copy[
                                                                                    idx
                                                                                ] =
                                                                                    {
                                                                                        ...copy[
                                                                                            idx
                                                                                        ],
                                                                                        sugar: pct,
                                                                                    };
                                                                                return copy;
                                                                            }
                                                                        );
                                                                    }}
                                                                    className={`px-2 py-1 text-xs rounded-md transition-all ${
                                                                        sugar ===
                                                                        pct
                                                                            ? "bg-pink-500 text-white shadow-sm"
                                                                            : "bg-white text-gray-600 border hover:bg-gray-200"
                                                                    }`}
                                                                >
                                                                    {pct}%
                                                                </button>
                                                            )
                                                        )}
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
                                    <span>{subtotalLabel}</span>
                                    <span>${subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>{taxLabel} (8.5%)</span>
                                    <span>${tax.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-2xl font-bold pt-2 border-t border-gray-200">
                                    <span>{totalLabel}</span>
                                    <span>${grandTotal.toFixed(2)}</span>
                                </div>
                            </div>
                            <Button
                                onClick={() => {
                                    try {
                                        if (typeof window !== "undefined") {
                                            window.localStorage.setItem(
                                                "cart",
                                                JSON.stringify(cart)
                                            );
                                        }
                                    } catch (e) {}
                                    router.push("/kiosk/checkout");
                                }}
                                className="w-full text-lg py-6"
                                disabled={cart.length === 0}
                            >
                                {proceedToCheckoutLabel}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
