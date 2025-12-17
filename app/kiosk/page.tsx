"use client";

import { Button } from "@/components/ui/button";
import Iridescence from "@/components/Iridescence";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useRouter } from "next/navigation";
import { X, History } from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Image from "next/image";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { translateText } from "@/lib/translate";

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

export default function Home() {
    const { data: session, status } = useSession();
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [cart, setCart] = useState<any[]>([]);
    const [cartOpen, setCartOpen] = useState(false);
    const [hydrated, setHydrated] = useState(false);
    const [availableToppings, setAvailableToppings] = useState<any[]>([]);
    const [orderHistoryOpen, setOrderHistoryOpen] = useState(false);
    const [orderHistory, setOrderHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [animatedBg, setAnimatedBg] = useState(false); // OFF by default

    // Load animated background setting from localStorage and listen for changes
    useEffect(() => {
        // Initial load
        const saved = localStorage.getItem('accessibility-animated-bg');
        setAnimatedBg(saved === 'true');

        // Listen for changes from accessibility menu
        const handleChange = (e: CustomEvent) => {
            setAnimatedBg(e.detail);
        };
        window.addEventListener('animated-bg-change', handleChange as EventListener);
        return () => window.removeEventListener('animated-bg-change', handleChange as EventListener);
    }, []);

    const TAX_RATE = 0.085;
    const subtotal = cart.reduce((sum, item) => {
        // If item is redeemed with points, it's free (no cost)
        if (item.redeemed) return sum;
        
        const base = Number(item.price || 0);
        const size = Number(item.size || 1);
        const extra = Math.max(0, size - 1); // medium +1, large +2
        // Add topping prices
        const toppingTotal = (item.toppings || []).reduce(
            (t: number, top: any) => t + Number(top.price || 0),
            0
        );
        return sum + base + extra + toppingTotal;
    }, 0);
    const tax = subtotal * TAX_RATE;
    const grandTotal = subtotal + tax;
    
    // Calculate total points being redeemed in cart
    const totalPointsToRedeem = cart.reduce((sum, item) => {
        if (item.redeemed && item.pointsValue) {
            return sum + Number(item.pointsValue);
        }
        return sum;
    }, 0);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);

    const [tab, setTab] = useState<string>("all");
    const [search, setSearch] = useState<string>("");
    const [popular, setPopular] = useState<Record<string, number | null>>({});

    // Error message labels
    const [errorLoadingMenuLabel, setErrorLoadingMenuLabel] =
        useState("Error loading menu");
    const [retryButtonLabel, setRetryButtonLabel] = useState("Retry");
    const [networkErrorLabel, setNetworkErrorLabel] = useState(
        "Network error. Please check your connection and try again."
    );
    const [serverErrorLabel, setServerErrorLabel] = useState(
        "Server error. Please try again later."
    );

    // translating UI elements
    const [translatedMenuItems, setTranslatedMenuItems] = useState<any[]>([]);
    const { lang, setLang } = useLanguage();
    const [homeLabel, setHomeLabel] = useState("Home");
    const [allDrinksLabel, setAllDrinksLabel] = useState("All Drinks");
    const [milkTeaLabel, setMilkTeaLabel] = useState("Milk Tea");
    const [greenTeaLabel, setGreenTeaLabel] = useState("Green Tea");
    const [blackTeaLabel, setBlackTeaLabel] = useState("Black Tea");
    const [seasonalLabel, setSeasonalLabel] = useState("Seasonal");
    const [exclusiveLabel, setExclusiveLabel] = useState("Exclusive");
    const [searchPlaceholderLabel, setSearchPlaceholderLabel] =
        useState("Search items...");
    const [subtotalLabel, setSubtotalLabel] = useState("Subtotal");
    const [totalLabel, setTotalLabel] = useState("Total");
    const [viewCartLabel, setViewCartLabel] = useState("View Cart");
    const [yourCartLabel, setYourCartLabel] = useState("Your Cart");
    const [removeLabel, setRemoveLabel] = useState("Remove");
    const [taxLabel, setTaxLabel] = useState("Tax");
    const [proceedToCheckoutLabel, setProceedToCheckoutLabel] = useState(
        "Proceed to Checkout"
    );
    const [bobaLabel, setBobaLabel] = useState("Boba");
    const [iceLabel, setIceLabel] = useState("Ice");
    const [sugarLabel, setSugarLabel] = useState("Sugar");
    const [emptyCartLabel, setEmptyCartLabel] = useState("Your cart is empty");
    const [clearCartLabel, setClearCartLabel] = useState("Clear Cart");
    const [toppingsLabel, setToppingsLabel] = useState("Toppings");

    const [signInForRewardsLabel, setSignInForRewardsLabel] = useState(
        "Sign in with Google for rewards"
    );
    const [signedInAsLabel, setSignedInAsLabel] = useState("Signed in as");
    const [rewardPointsLabel, setRewardPointsLabel] = useState("Reward Points");
    const [signOutLabel, setSignOutLabel] = useState("Sign Out");
    const [orderHistoryLabel, setOrderHistoryLabel] = useState("Order History");
    const [noOrdersLabel, setNoOrdersLabel] = useState(
        "No previous orders found"
    );
    const [orderLabel, setOrderLabel] = useState("Order");
    const [redeemLabel, setRedeemLabel] = useState("Redeem");
    const [pointsRequiredLabel, setPointsRequiredLabel] = useState("pts required");
    const [redeemedLabel, setRedeemedLabel] = useState("Redeemed");
    const [notEnoughPointsLabel, setNotEnoughPointsLabel] = useState("Not enough points");
    const [freeLabel, setFreeLabel] = useState("FREE");

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
        if (!popular || Object.keys(popular).length === 0) return;
        console.log("popular state updated:", popular);
        try {
            const resolved = Object.fromEntries(
                Object.entries(popular).map(([cat, id]) => [
                    cat,
                    menuItems.find((m) => m.id === id)?.name ?? id,
                ])
            );
            console.log("popular resolved to names:", resolved);
        } catch (e) {
            console.warn("Could not resolve popular ids to names yet", e);
        }

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
                                toppings: it?.toppings ?? [],
                            }))
                        );
                }
            }
        } catch (e) {
        } finally {
            setHydrated(true);
        }
    }, []);

    // Fetch available toppings
    useEffect(() => {
        async function fetchToppings() {
            try {
                const res = await fetch("/api/ingredients/toppings");
                const data = await res.json();
                if (data.ok && data.toppings) {
                    setAvailableToppings(data.toppings);
                }
            } catch (e) {
                console.error("Failed to fetch toppings:", e);
            }
        }
        fetchToppings();
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
                // fetch popular/top sellers per category
                try {
                    fetch("/api/popular")
                        .then((r) => r.json())
                        .then((p) => {
                            console.log("/api/popular response:", p);
                            if (p?.ok && p.popular) setPopular(p.popular);
                            else
                                console.warn(
                                    "/api/popular did not return popular mapping",
                                    p
                                );
                        })
                        .catch((err) => {
                            console.error("Failed to fetch /api/popular", err);
                        });
                } catch (e) {
                    console.error("Error initiating /api/popular fetch", e);
                }

                setError(null);
                setRetryCount(0); // Reset retry count on success
                setLoading(false);
                return { ok: true };
            }

            throw new Error(data?.error || "Failed to load menu");
        } catch (err: any) {
            console.error("Menu request error:", err);

            let errorMessage = networkErrorLabel;
            if (err.name === "AbortError") {
                errorMessage = networkErrorLabel;
            } else if (err.message === "server_error") {
                errorMessage = serverErrorLabel;
            } else if (
                err.message?.includes("Failed to fetch") ||
                err.message?.includes("NetworkError")
            ) {
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
                console.log(
                    `Auto-retrying menu fetch (attempt ${retryCount + 1}/3)`
                );
                setRetryCount((prev) => prev + 1);
                getMenuItems();
            }, 3000); // Retry after 3 seconds
            return () => clearTimeout(timer);
        }
    }, [error, retryCount]);

    useEffect(() => {
        getMenuItems();
    }, []);

    function addToCart(item: any, redeem: boolean = false) {
        const isExclusive = item.isexclusive === 1 || item.isexclusive === true;
        const pointsValue = Number(item.points || 0);
        const userPoints = (session?.user as any)?.points ?? 0;
        
        // Calculate points already being redeemed in cart
        const pointsInCart = cart.reduce((sum, cartItem) => {
            if (cartItem.redeemed && cartItem.pointsValue) {
                return sum + Number(cartItem.pointsValue);
            }
            return sum;
        }, 0);
        
        // Check if redeeming and user has enough points
        if (redeem && isExclusive && pointsValue > 0) {
            if (userPoints - pointsInCart < pointsValue) {
                alert(notEnoughPointsLabel);
                return;
            }
        }
        
        const withMods = {
            ...item,
            boba: 100,
            ice: 100,
            sugar: 100,
            size: 1,
            toppings: [],
            redeemed: redeem && isExclusive && pointsValue > 0,
            pointsValue: isExclusive ? pointsValue : 0,
        };
        setCart((prev) => [...prev, withMods]);
    }

    function toggleTopping(cartIndex: number, topping: any) {
        setCart((prev) => {
            const copy = [...prev];
            const item = copy[cartIndex];
            const currentToppings = item.toppings || [];
            const exists = currentToppings.some(
                (t: any) => t.id === topping.id
            );
            if (exists) {
                // Remove topping
                copy[cartIndex] = {
                    ...item,
                    toppings: currentToppings.filter(
                        (t: any) => t.id !== topping.id
                    ),
                };
            } else {
                // Add topping
                copy[cartIndex] = {
                    ...item,
                    toppings: [...currentToppings, topping],
                };
            }
            return copy;
        });
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
                setHomeLabel(
                    await translateText("Home", lang).catch(() => "Home")
                );
                setAllDrinksLabel(
                    await translateText("All Drinks", lang).catch(
                        () => "All Drinks"
                    )
                );
                setMilkTeaLabel(
                    await translateText("Milk Tea", lang).catch(
                        () => "Milk Tea"
                    )
                );
                setGreenTeaLabel(
                    await translateText("Green Tea", lang).catch(
                        () => "Green Tea"
                    )
                );
                setBlackTeaLabel(
                    await translateText("Black Tea", lang).catch(
                        () => "Black Tea"
                    )
                );
                setSeasonalLabel(
                    await translateText("Seasonal", lang).catch(
                        () => "Seasonal"
                    )
                );
                setExclusiveLabel(
                    await translateText("Exclusive", lang).catch(
                        () => "Exclusive"
                    )
                );
                setSearchPlaceholderLabel(
                    await translateText("Search items...", lang).catch(
                        () => "Search items..."
                    )
                );
                setSubtotalLabel(
                    await translateText("Subtotal", lang).catch(
                        () => "Subtotal"
                    )
                );
                setTotalLabel(
                    await translateText("Total", lang).catch(() => "Total")
                );
                setViewCartLabel(
                    await translateText("View Cart", lang).catch(
                        () => "View Cart"
                    )
                );
                setYourCartLabel(
                    await translateText("Your Cart", lang).catch(
                        () => "Your Cart"
                    )
                );
                setRemoveLabel(
                    await translateText("Remove", lang).catch(() => "Remove")
                );
                setTaxLabel(
                    await translateText("Tax", lang).catch(() => "Tax")
                );
                setProceedToCheckoutLabel(
                    await translateText("Proceed to Checkout", lang).catch(
                        () => "Proceed to Checkout"
                    )
                );
                setBobaLabel(
                    await translateText("Boba", lang).catch(() => "Boba")
                );
                setIceLabel(
                    await translateText("Ice", lang).catch(() => "Ice")
                );
                setSugarLabel(
                    await translateText("Sugar", lang).catch(() => "Sugar")
                );
                setEmptyCartLabel(
                    await translateText("Your cart is empty", lang).catch(
                        () => "Your cart is empty"
                    )
                );
                setClearCartLabel(
                    await translateText("Clear Cart", lang).catch(
                        () => "Clear Cart"
                    )
                );
                setToppingsLabel(
                    await translateText("Toppings", lang).catch(
                        () => "Toppings"
                    )
                );

                setSignInForRewardsLabel(
                    await translateText(
                        "Sign in with Google for rewards",
                        lang
                    ).catch(() => "Sign in with Google for rewards")
                );
                setSignedInAsLabel(
                    await translateText("Signed in as", lang).catch(
                        () => "Signed in as"
                    )
                );
                setRewardPointsLabel(
                    await translateText("Reward Points", lang).catch(
                        () => "Reward Points"
                    )
                );
                setSignOutLabel(
                    await translateText("Sign Out", lang).catch(
                        () => "Sign Out"
                    )
                );
                setOrderHistoryLabel(
                    await translateText("Order History", lang).catch(
                        () => "Order History"
                    )
                );
                setNoOrdersLabel(
                    await translateText("No previous orders found", lang).catch(
                        () => "No previous orders found"
                    )
                );
                setOrderLabel(
                    await translateText("Order", lang).catch(() => "Order")
                );
                setRedeemLabel(
                    await translateText("Redeem", lang).catch(() => "Redeem")
                );
                setPointsRequiredLabel(
                    await translateText("pts required", lang).catch(() => "pts required")
                );
                setRedeemedLabel(
                    await translateText("Redeemed", lang).catch(() => "Redeemed")
                );
                setNotEnoughPointsLabel(
                    await translateText("Not enough points", lang).catch(() => "Not enough points")
                );
                setFreeLabel(
                    await translateText("FREE", lang).catch(() => "FREE")
                );

                setErrorLoadingMenuLabel(
                    await translateText("Error loading menu", lang).catch(
                        () => "Error loading menu"
                    )
                );
                setRetryButtonLabel(
                    await translateText("Retry", lang).catch(() => "Retry")
                );
                setNetworkErrorLabel(
                    await translateText(
                        "Network error. Please check your connection and try again.",
                        lang
                    ).catch(
                        () =>
                            "Network error. Please check your connection and try again."
                    )
                );
                setServerErrorLabel(
                    await translateText(
                        "Server error. Please try again later.",
                        lang
                    ).catch(() => "Server error. Please try again later.")
                );
            } catch (error) {
                console.error("Translation error:", error);
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
                    menuItems.map(async (item) => {
                        try {
                            const translatedName = await translateText(
                                item.name,
                                lang
                            );
                            return {
                                ...item,
                                name: translatedName,
                            };
                        } catch (error) {
                            console.warn(
                                `Failed to translate "${item.name}", using original`,
                                error
                            );
                            return item; // Fallback to original item if translation fails
                        }
                    })
                );
                setTranslatedMenuItems(translated);
            } catch (error) {
                console.error("Menu translation error:", error);
                setTranslatedMenuItems(menuItems); // Fallback to untranslated menu
            }
        }
        translateMenuNames();
    }, [menuItems, lang]);

    useEffect(() => {
        if (!popular || Object.keys(popular).length === 0) return;
        console.log("popular state updated:", popular);
        try {
            const resolved = Object.fromEntries(
                Object.entries(popular).map(([cat, id]) => [
                    cat,
                    menuItems.find((m) => m.id === id)?.name ?? id,
                ])
            );
            console.log("popular resolved to names:", resolved);
        } catch (e) {
            console.warn("Could not resolve popular ids to names yet", e);
        }
    }, [popular, menuItems]);

    // Fetch order history for logged-in customer
    async function fetchOrderHistory() {
        if (!session?.user || !(session.user as any).id) return;

        setLoadingHistory(true);
        try {
            const res = await fetch(
                `/api/orders/history?customerId=${(session.user as any).id}`
            );
            const data = await res.json();
            if (data.ok) {
                setOrderHistory(data.orders || []);
            }
        } catch (err) {
            console.error("Failed to fetch order history:", err);
        } finally {
            setLoadingHistory(false);
        }
    }

    return (
        <div className="kiosk-text flex flex-col w-full h-screen overflow-hidden relative">
            <div className="fixed inset-0 -z-20 bg-(--background)">
                {animatedBg && (
                    <Iridescence
                        color={[1.0, 0.7, 0.7]}
                        mouseReact={true}
                        amplitude={0.1}
                        speed={1.0}
                    />
                )}
            </div>

            <div className="flex-none p-6 z-10 flex items-center justify-end flex-wrap gap-4">
                <Link className='absolute top-8 left-8' href="/">
                    <Button variant="outline" className="shadow-md">
                        ← {homeLabel}
                    </Button>
                </Link>
                <Link className='absolute top-8 left-40' href="/kiosk/game">
                    <Button variant="default" className="shadow-md bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                        🎮 Play X0 Game
                    </Button>
                </Link>
                <Link className='absolute top-8 left-80' href="/kiosk/flappy">
                    <Button variant="default" className="shadow-md bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700">
                        🐦 Flappy Srihari
                    </Button>
                </Link>

                {/* Customer Google Sign-in Section */}
                <div className="bg-white/70 backdrop-blur-md p-3 rounded-lg shadow-md">
                    {status === "loading" ? (
                        <div className="text-sm text-gray-500">Loading...</div>
                    ) : session?.user ? (
                        <div className="flex items-center gap-3 flex-wrap">
                            <div>
                                <p className="font-medium text-sm">
                                    {signedInAsLabel}: {session.user.name}
                                </p>
                                <p className="text-xs text-gray-600">
                                    {rewardPointsLabel}:{" "}
                                    {(session.user as any).points ?? 0}
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    fetchOrderHistory();
                                    setOrderHistoryOpen(true);
                                }}
                            >
                                <History className="h-4 w-4 mr-1" />
                                {orderHistoryLabel}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => signOut({ redirect: false })}
                            >
                                {signOutLabel}
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 flex-wrap">
                            <p className="text-sm text-foreground-muted">
                                {signInForRewardsLabel}
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    signIn("google", {
                                        callbackUrl: "/kiosk",
                                        prompt: "select_account",
                                    })
                                }
                            >
                                Sign in with Google
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            <Tabs
                defaultValue="all"
                value={tab}
                className="flex-1 flex flex-col min-h-0 px-8 gap-4"
            >
                <div className="flex-none bg-white/60 backdrop-blur-md p-2 rounded-xl flex flex-wrap gap-2 items-center shadow-sm">
                    <TabsList className="bg-transparent h-auto flex flex-wrap gap-2 p-0">
                        {[
                            "all",
                            "milk",
                            "green",
                            "black",
                            "seasonal",
                            "exclusive",
                        ].map((cat) => (
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
                                          .replace("exclusive", exclusiveLabel)}
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
                                <p className="text-xl font-deco text-gray-700">
                                    Loading menu...
                                </p>
                            </div>
                        </div>
                    )}

                    <ScrollArea className="h-full p-4">
                        {[
                            "all",
                            "milk",
                            "green",
                            "black",
                            "seasonal",
                            "exclusive",
                        ].map((catValue) => (
                            <TabsContent
                                key={catValue}
                                value={catValue}
                                className="mt-0 h-full"
                            >
                                {/* Show sign-in prompt for exclusive tab when not logged in */}
                                {catValue === "exclusive" && !session?.user ? (
                                    <div className="flex items-center justify-center h-full min-h-[400px]">
                                        <Card className="bg-white/80 backdrop-blur-md shadow-xl border-2 border-transparent flex flex-col items-center text-center max-w-md">
                                            <CardContent className="p-8 flex flex-col items-center">
                                                <span className="text-6xl mb-4">
                                                    🔒
                                                </span>
                                                <h2 className="text-2xl font-bold font-deco mb-2">
                                                    Exclusive Items
                                                </h2>
                                                <p className="text-gray-600 mb-4">
                                                    Sign in to access exclusive
                                                    menu items and earn rewards!
                                                </p>
                                                <Button
                                                    variant="default"
                                                    onClick={() =>
                                                        signIn("google", {
                                                            callbackUrl:
                                                                "/kiosk",
                                                            prompt: "select_account",
                                                        })
                                                    }
                                                >
                                                    Sign in with Google
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-6 pb-6">
                                        {menuItems
                                            .filter((item) => {
                                                const matchesSearch = item.name
                                                    .toLowerCase()
                                                    .includes(
                                                        search.toLowerCase()
                                                    );
                                                if (!matchesSearch)
                                                    return false;

                                                // Filter out exclusive items if user is not logged in (except on exclusive tab which shows placeholder)
                                                const isExclusive =
                                                    item.isexclusive === 1 ||
                                                    item.isexclusive === true;
                                                if (
                                                    isExclusive &&
                                                    !session?.user
                                                )
                                                    return false;

                                                // Exclusive tab - show only exclusive items
                                                if (catValue === "exclusive")
                                                    return isExclusive;

                                                if (catValue === "all")
                                                    return true;
                                                if (catValue === "seasonal")
                                                    return item.seasonal === 1;
                                                // For tea categories, check if name contains both the category and "tea"
                                                const lowerName =
                                                    item.name.toLowerCase();
                                                return (
                                                    lowerName.includes(
                                                        catValue
                                                    ) &&
                                                    lowerName.includes("tea")
                                                );
                                            })
                                            .map((item) => {
                                                // Find translated name for display
                                                const translatedItem =
                                                    translatedMenuItems.find(
                                                        (t) => t.id === item.id
                                                    );
                                                const displayName =
                                                    translatedItem
                                                        ? translatedItem.name
                                                        : item.name;
                                                
                                                // Check if this is an exclusive item with point requirements
                                                const isExclusive = item.isexclusive === 1 || item.isexclusive === true;
                                                const pointsRequired = Number(item.points || 0);
                                                const userPoints = (session?.user as any)?.points ?? 0;
                                                
                                                // Calculate points already being redeemed in cart
                                                const pointsInCart = cart.reduce((sum, cartItem) => {
                                                    if (cartItem.redeemed && cartItem.pointsValue) {
                                                        return sum + Number(cartItem.pointsValue);
                                                    }
                                                    return sum;
                                                }, 0);
                                                
                                                const availablePoints = userPoints - pointsInCart;
                                                const canRedeem = isExclusive && pointsRequired > 0 && availablePoints >= pointsRequired;

                                                return (
                                                    <Card
                                                        key={item.id}
                                                        onClick={() => {
                                                            // For exclusive items with points, don't add on card click - use buttons
                                                            if (isExclusive && pointsRequired > 0) return;
                                                            addToCart(item);
                                                        }}
                                                        className={`relative bg-white/80 backdrop-blur-md hover:scale-105 hover:shadow-xl hover:bg-white transition-all duration-200 cursor-pointer border-2 border-transparent hover:border-primary/20 flex flex-col aspect-[4/5] w-full ${isExclusive && pointsRequired > 0 ? 'cursor-default' : ''}`}
                                                    >
                                                        {/* top-left badge for category top-seller (show in tabs and in All view for any category top-seller) */}
                                                        {(() => {
                                                            const isPopularAnywhere =
                                                                Object.values(
                                                                    popular ||
                                                                        {}
                                                                ).some(
                                                                    (v) =>
                                                                        Number(
                                                                            v
                                                                        ) ===
                                                                        Number(
                                                                            item.id
                                                                        )
                                                                );
                                                            const isPopularInCategory =
                                                                Number(
                                                                    popular?.[
                                                                        catValue
                                                                    ]
                                                                ) ===
                                                                Number(item.id);
                                                            return (
                                                                (catValue !==
                                                                    "all" &&
                                                                    (isPopularInCategory ||
                                                                        isPopularAnywhere)) ||
                                                                (catValue ===
                                                                    "all" &&
                                                                    isPopularAnywhere)
                                                            );
                                                        })() && (
                                                            <img
                                                                src="/img/fire_icon.png"
                                                                alt="Top seller"
                                                                aria-hidden={
                                                                    true
                                                                }
                                                                className="absolute top-3 left-3 w-8 h-8 drop-shadow-lg z-50 pointer-events-none"
                                                            />
                                                        )}
                                                        <CardContent className="flex-1 flex flex-col justify-between items-center p-4">
                                                            <div className="relative w-full flex-none h-28 md:h-32 lg:h-36 mb-4 flex items-center justify-center">
                                                                <img
                                                                    src={`/img/${item.name
                                                                        .toLowerCase()
                                                                        .replace(
                                                                            /\s+/g,
                                                                            "_"
                                                                        )
                                                                        .replace(
                                                                            /[^a-z0-9_]/g,
                                                                            ""
                                                                        )}.png`}
                                                                    alt={
                                                                        item.name
                                                                    }
                                                                    className="object-contain drop-shadow-md max-w-full max-h-full"
                                                                    loading="lazy"
                                                                    decoding="async"
                                                                    onError={(
                                                                        e: React.SyntheticEvent<HTMLImageElement>
                                                                    ) => {
                                                                        const target =
                                                                            e.currentTarget as HTMLImageElement;
                                                                        if (
                                                                            !target
                                                                                .dataset
                                                                                .fallback
                                                                        ) {
                                                                            target.dataset.fallback =
                                                                                "1";
                                                                            target.src =
                                                                                "/img/default_new_item.png";
                                                                        }
                                                                    }}
                                                                />
                                                            </div>
                                                            <div className="text-center w-full space-y-1">
                                                                <h1 className="font-deco font-bold text-lg leading-tight line-clamp-2 h-12 flex items-center justify-center">
                                                                    {
                                                                        displayName
                                                                    }
                                                                </h1>
                                                                {isExclusive && pointsRequired > 0 ? (
                                                                    <div className="space-y-2">
                                                                        <div className="text-sm text-purple-600 font-medium">
                                                                            {pointsRequired} {pointsRequiredLabel}
                                                                        </div>
                                                                        <div className="flex gap-2 justify-center">
                                                                            <Button
                                                                                size="sm"
                                                                                variant="outline"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    addToCart(item, false);
                                                                                }}
                                                                                className="text-xs"
                                                                            >
                                                                                ${item.price}
                                                                            </Button>
                                                                            <Button
                                                                                size="sm"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    addToCart(item, true);
                                                                                }}
                                                                                disabled={!canRedeem}
                                                                                className={`text-xs ${canRedeem ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-400'}`}
                                                                            >
                                                                                {redeemLabel}
                                                                            </Button>
                                                                        </div>
                                                                        {!canRedeem && (
                                                                            <p className="text-xs text-gray-500">
                                                                                {availablePoints}/{pointsRequired} pts
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <h1 className="font-deco text-xl text-primary font-semibold">
                                                                        $
                                                                        {item.price}
                                                                    </h1>
                                                                )}
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                );
                                            })}
                                    </div>
                                )}
                            </TabsContent>
                        ))}
                    </ScrollArea>
                </div>
            </Tabs>

            <div className="flex-none bg-white/80 backdrop-blur-xl border-t border-black/5 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-6 z-20">
                <div className="max-w-7xl mx-auto flex items-center gap-8">
                    <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground uppercase tracking-wider font-bold">
                            {subtotalLabel}
                        </span>
                        <span className="text-4xl font-bold font-deco">
                            ${subtotal.toFixed(2)}
                        </span>
                    </div>

                    {/* Center: aggregated, truncated cart preview */}
                    <div className="flex-1 min-w-0 px-4">
                        <div className="text-sm text-gray-700 w-full">
                            {cart.length === 0 ? (
                                <span className="text-muted-foreground">
                                    {emptyCartLabel}
                                </span>
                            ) : (
                                <span
                                    className="block truncate text-muted-foreground"
                                    title={(() => {
                                        // Aggregate identical items and preserve first-seen order
                                        const seen = new Map<
                                            string,
                                            { item: any; count: number }
                                        >();
                                        const order: string[] = [];
                                        for (const it of cart) {
                                            const key = String(
                                                it?.id ?? JSON.stringify(it)
                                            );
                                            if (!seen.has(key)) {
                                                seen.set(key, {
                                                    item: it,
                                                    count: 0,
                                                });
                                                order.push(key);
                                            }
                                            seen.get(key)!.count += 1;
                                        }
                                        const parts: string[] = order.map(
                                            (k) => {
                                                const info = seen.get(k)!;
                                                const translated =
                                                    translatedMenuItems.find(
                                                        (m) =>
                                                            m.id ===
                                                            info.item.id
                                                    );
                                                const name = translated
                                                    ? translated.name
                                                    : info.item.name;
                                                return info.count > 1
                                                    ? `${name} x${info.count}`
                                                    : name;
                                            }
                                        );
                                        return parts.join(" · ");
                                    })()}
                                >
                                    {(() => {
                                        const seen = new Map<
                                            string,
                                            { item: any; count: number }
                                        >();
                                        const order: string[] = [];
                                        for (const it of cart) {
                                            const key = String(
                                                it?.id ?? JSON.stringify(it)
                                            );
                                            if (!seen.has(key)) {
                                                seen.set(key, {
                                                    item: it,
                                                    count: 0,
                                                });
                                                order.push(key);
                                            }
                                            seen.get(key)!.count += 1;
                                        }
                                        const parts: string[] = order.map(
                                            (k) => {
                                                const info = seen.get(k)!;
                                                const translated =
                                                    translatedMenuItems.find(
                                                        (m) =>
                                                            m.id ===
                                                            info.item.id
                                                    );
                                                const name = translated
                                                    ? translated.name
                                                    : info.item.name;
                                                return info.count > 1
                                                    ? `${name} x${info.count}`
                                                    : name;
                                            }
                                        );
                                        return parts.join(" · ");
                                    })()}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Right: view cart button */}
                    <div className="flex-none">
                        <Button
                            size="lg"
                            className="text-xl px-10 py-8 rounded-full shadow-lg animate-in slide-in-from-right-10"
                            onClick={() => setCartOpen(true)}
                        >
                            {viewCartLabel} ({cart.length})
                        </Button>
                    </div>
                </div>
            </div>

            {cartOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in"
                        onClick={() => setCartOpen(false)}
                    />

                    <div className="relative bg-(--background) w-full max-w-lg h-[85vh] sm:h-[80vh] sm:rounded-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-10">
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

                        {/* NOTE: per-item size controls rendered inside each cart item now */}

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
                                    const itemToppings = item?.toppings || [];
                                    const toppingTotal = itemToppings.reduce(
                                        (sum: number, t: any) =>
                                            sum + Number(t.price || 0),
                                        0
                                    );
                                    const currItemID = item?.id;
                                    const translatedItemWithID =
                                        translatedMenuItems.find(
                                            (it) => it.id === currItemID
                                        );
                                    const itemName = translatedItemWithID
                                        ? translatedItemWithID.name
                                        : item.name;
                                    const isRedeemed = item?.redeemed === true;
                                    return (
                                        <div
                                            key={idx}
                                            className={`flex flex-col border-b border-gray-100 pb-6 last:border-0 ${isRedeemed ? 'bg-purple-50 -mx-6 px-6 py-4 rounded-lg' : ''}`}
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <span className="font-bold text-lg block">
                                                        {itemName}
                                                        {isRedeemed && (
                                                            <span className="ml-2 text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full">
                                                                {redeemedLabel}
                                                            </span>
                                                        )}
                                                    </span>
                                                    {isRedeemed ? (
                                                        <span className="text-purple-600 font-bold">
                                                            {freeLabel} <span className="text-sm font-normal">(-{item.pointsValue} pts)</span>
                                                        </span>
                                                    ) : (
                                                        <span className="text-primary font-medium">
                                                            $
                                                            {(
                                                                Number(
                                                                    item.price || 0
                                                                ) +
                                                                Math.max(
                                                                    0,
                                                                    Number(
                                                                        item.size ||
                                                                            1
                                                                    ) - 1
                                                                ) +
                                                                toppingTotal
                                                            ).toFixed(2)}
                                                        </span>
                                                    )}
                                                    {itemToppings.length >
                                                        0 && (
                                                        <span className="text-xs text-foreground-muted block">
                                                            +{" "}
                                                            {itemToppings
                                                                .map(
                                                                    (t: any) =>
                                                                        t.name
                                                                )
                                                                .join(", ")}
                                                        </span>
                                                    )}
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

                                            <div className="grid grid-cols-1 gap-3 bg-(--background) p-3 rounded-lg">
                                                {/* Size row — same container as Boba/Ice/Sugar */}
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-gray-500 uppercase w-12">
                                                        Size
                                                    </span>
                                                    <div className="flex gap-1 flex-1 justify-end">
                                                        {[
                                                            [1, "Small", ""],
                                                            [
                                                                2,
                                                                "Medium",
                                                                "+$1",
                                                            ],
                                                            [3, "Large", "+$2"],
                                                        ].map(
                                                            ([
                                                                val,
                                                                label,
                                                                suffix,
                                                            ]) => (
                                                                <button
                                                                    key={`size-${idx}-${String(
                                                                        val
                                                                    )}`}
                                                                    onClick={() => {
                                                                        const sizeNum =
                                                                            Number(
                                                                                val
                                                                            );
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
                                                                                        size: sizeNum,
                                                                                    };
                                                                                return copy;
                                                                            }
                                                                        );
                                                                    }}
                                                                    className={`px-4 py-2 text-sm rounded-md transition-all w-[84px] ${
                                                                        Number(
                                                                            item.size ||
                                                                                1
                                                                        ) ===
                                                                        Number(
                                                                            val
                                                                        )
                                                                            ? "bg-black text-white shadow-sm"
                                                                            : "bg-white text-gray-600 border hover:bg-gray-200"
                                                                    }`}
                                                                    aria-pressed={
                                                                        Number(
                                                                            item.size ||
                                                                                1
                                                                        ) ===
                                                                        Number(
                                                                            val
                                                                        )
                                                                    }
                                                                >
                                                                    <div className="flex flex-col items-center justify-center">
                                                                        <span className="font-medium leading-snug">
                                                                            {
                                                                                label
                                                                            }
                                                                        </span>
                                                                        {String(
                                                                            suffix ||
                                                                                ""
                                                                        ).trim() !==
                                                                            "" && (
                                                                            <span className="text-xs text-muted-foreground mt-0.5">
                                                                                {
                                                                                    suffix
                                                                                }
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </button>
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-xs font-bold text-gray-500 uppercase min-w-[50px]">
                                                        {bobaLabel}
                                                    </span>
                                                    <div className="flex gap-1 flex-1 justify-end">
                                                        {[
                                                            0, 50, 100, 125,
                                                            150,
                                                        ].map((pct) => (
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
                                                                className={`px-1.5 py-1.5 text-xs rounded-md transition-all min-w-[54px] ${
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

                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-xs font-bold text-gray-500 uppercase min-w-[50px]">
                                                        {iceLabel}
                                                    </span>
                                                    <div className="flex gap-1 flex-1 justify-end">
                                                        {[
                                                            0, 50, 100, 125,
                                                            150,
                                                        ].map((pct) => (
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
                                                                className={`px-1.5 py-1.5 text-xs rounded-md transition-all min-w-[54px] ${
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

                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-xs font-bold text-gray-500 uppercase min-w-[55px] shrink-0">
                                                        {sugarLabel}
                                                    </span>
                                                    <div className="flex gap-1 flex-1 justify-end">
                                                        {[
                                                            0, 50, 100, 125,
                                                            150,
                                                        ].map((pct) => (
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
                                                                className={`px-1.5 py-1.5 text-xs rounded-md transition-all min-w-[54px] ${
                                                                    sugar ===
                                                                    pct
                                                                        ? "bg-pink-500 text-white shadow-sm"
                                                                        : "bg-white text-gray-600 border hover:bg-gray-200"
                                                                }`}
                                                            >
                                                                {pct}%
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Toppings row */}
                                                {availableToppings.length >
                                                    0 && (
                                                    <div className="flex flex-col gap-2">
                                                        <Accordion
                                                            type="single"
                                                            collapsible
                                                            defaultValue=""
                                                        >
                                                            <AccordionItem value="x">
                                                                <AccordionTrigger className="text-xs font-bold text-gray-500 uppercase">
                                                                    {
                                                                        toppingsLabel
                                                                    }
                                                                </AccordionTrigger>
                                                                <AccordionContent>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {availableToppings.map(
                                                                            (
                                                                                topping
                                                                            ) => {
                                                                                const isSelected =
                                                                                    itemToppings.some(
                                                                                        (
                                                                                            t: any
                                                                                        ) =>
                                                                                            t.id ===
                                                                                            topping.id
                                                                                    );
                                                                                return (
                                                                                    <button
                                                                                        key={`topping-${idx}-${topping.id}`}
                                                                                        onClick={() =>
                                                                                            toggleTopping(
                                                                                                idx,
                                                                                                topping
                                                                                            )
                                                                                        }
                                                                                        className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                                                                                            isSelected
                                                                                                ? "bg-green-500 text-white shadow-sm"
                                                                                                : "bg-white text-gray-600 border hover:bg-gray-200"
                                                                                        }`}
                                                                                    >
                                                                                        {
                                                                                            topping.name
                                                                                        }{" "}
                                                                                        (+$
                                                                                        {Number(
                                                                                            topping.price
                                                                                        ).toFixed(
                                                                                            2
                                                                                        )}

                                                                                        )
                                                                                    </button>
                                                                                );
                                                                            }
                                                                        )}
                                                                    </div>
                                                                </AccordionContent>
                                                            </AccordionItem>
                                                        </Accordion>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className="p-6 bg-(--background) border-t">
                            <div className="space-y-2 mb-6">
                                <div className="flex justify-between text-foreground-muted">
                                    <span>{subtotalLabel}</span>
                                    <span>${subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-foreground-muted">
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

            {/* Order History Modal */}
            {orderHistoryOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in"
                        onClick={() => setOrderHistoryOpen(false)}
                    />

                    <div className="relative bg-white w-full max-w-lg h-[85vh] sm:h-[80vh] sm:rounded-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-10">
                        <div className="flex items-center justify-between p-6 border-b">
                            <h2 className="text-2xl font-bold font-deco">
                                {orderHistoryLabel}
                            </h2>
                            <Button
                                onClick={() => setOrderHistoryOpen(false)}
                                variant="ghost"
                                size="icon"
                                className="rounded-full"
                            >
                                <X className="h-6 w-6" />
                            </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {loadingHistory ? (
                                <div className="h-full flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary"></div>
                                </div>
                            ) : orderHistory.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                                    <span className="text-6xl mb-4">📋</span>
                                    <p>{noOrdersLabel}</p>
                                </div>
                            ) : (
                                orderHistory.map((order: any) => {
                                    const orderTotal = order.items.reduce(
                                        (sum: number, item: any) => {
                                            const base = Number(
                                                item.price || 0
                                            );
                                            const toppingCost = (
                                                item.toppings || []
                                            ).reduce(
                                                (t: number, top: any) =>
                                                    t + Number(top.price || 0),
                                                0
                                            );
                                            return sum + base + toppingCost;
                                        },
                                        0
                                    );
                                    const statusColors: Record<string, string> =
                                        {
                                            pending:
                                                "bg-yellow-100 text-yellow-800",
                                            completed:
                                                "bg-green-100 text-green-800",
                                            cancelled:
                                                "bg-red-100 text-red-800",
                                        };
                                    return (
                                        <div
                                            key={order.order_id}
                                            className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <span className="font-bold text-lg">
                                                        {orderLabel} #
                                                        {order.order_id}
                                                    </span>
                                                    <p className="text-sm text-gray-500">
                                                        {order.order_date} •{" "}
                                                        {order.order_time?.substring(
                                                            0,
                                                            5
                                                        )}
                                                    </p>
                                                </div>
                                                <span
                                                    className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                                                        statusColors[
                                                            order.status
                                                        ] ||
                                                        "bg-gray-100 text-gray-800"
                                                    }`}
                                                >
                                                    {order.status}
                                                </span>
                                            </div>
                                            <div className="space-y-2">
                                                {order.items.map(
                                                    (
                                                        item: any,
                                                        idx: number
                                                    ) => {
                                                        const sizeLabel =
                                                            Number(
                                                                item.size || 1
                                                            ) === 1
                                                                ? "S"
                                                                : Number(
                                                                      item.size ||
                                                                          1
                                                                  ) === 2
                                                                ? "M"
                                                                : "L";
                                                        return (
                                                            <div
                                                                key={idx}
                                                                className="flex justify-between text-sm"
                                                            >
                                                                <div>
                                                                    <span>
                                                                        {
                                                                            item.menu_item_name
                                                                        }
                                                                    </span>
                                                                    <span className="text-gray-400 ml-1">
                                                                        (
                                                                        {
                                                                            sizeLabel
                                                                        }
                                                                        )
                                                                    </span>
                                                                    {item.toppings &&
                                                                        item
                                                                            .toppings
                                                                            .length >
                                                                            0 && (
                                                                            <span className="text-xs text-gray-500 block ml-2">
                                                                                +{" "}
                                                                                {item.toppings
                                                                                    .map(
                                                                                        (
                                                                                            t: any
                                                                                        ) =>
                                                                                            t.name
                                                                                    )
                                                                                    .join(
                                                                                        ", "
                                                                                    )}
                                                                            </span>
                                                                        )}
                                                                </div>
                                                                <span className="text-gray-600">
                                                                    $
                                                                    {(
                                                                        Number(
                                                                            item.price ||
                                                                                0
                                                                        ) +
                                                                        (
                                                                            item.toppings ||
                                                                            []
                                                                        ).reduce(
                                                                            (
                                                                                t: number,
                                                                                top: any
                                                                            ) =>
                                                                                t +
                                                                                Number(
                                                                                    top.price ||
                                                                                        0
                                                                                ),
                                                                            0
                                                                        )
                                                                    ).toFixed(
                                                                        2
                                                                    )}
                                                                </span>
                                                            </div>
                                                        );
                                                    }
                                                )}
                                            </div>
                                            <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between font-medium">
                                                <span>{totalLabel}</span>
                                                <span>
                                                    $
                                                    {(
                                                        orderTotal * 1.085
                                                    ).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
