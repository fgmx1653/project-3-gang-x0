"use client";

import { Button } from "@/components/ui/button";
import Iridescence from "@/components/Iridescence";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Edit } from "lucide-react";
import { getStoredUser } from '@/lib/clientAuth';
import LogoutButton from '@/components/LogoutButton';

import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export default function Home() {
    const router = useRouter();

    // menuItems fetched from /api/menu
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [cart, setCart] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const [placingOrder, setPlacingOrder] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState(false);
    const [editingItem, setEditingItem] = useState<any | null>(null);
    const [editBoba, setEditBoba] = useState(100);
    const [editIce, setEditIce] = useState(100);
    const [editSugar, setEditSugar] = useState(100);

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
                setMenuItems(data.items || []);
                setError(null);
                setRetryCount(0); // Reset retry count on success
                setLoading(false);
                return { ok: true };
            }

            throw new Error(data?.error || "Failed to load menu");
        } catch (err: any) {
            console.error("Menu request error:", err);

            let errorMessage = "Network error. Please check your connection and try again.";
            if (err.name === "AbortError") {
                errorMessage = "Request timeout. Please check your connection and try again.";
            } else if (err.message === "server_error") {
                errorMessage = "Server error. Please try again later.";
            } else if (
                err.message?.includes("Failed to fetch") ||
                err.message?.includes("NetworkError")
            ) {
                errorMessage = "Network error. Please check your connection and try again.";
            }

            setError(errorMessage);
            setLoading(false);
            return { ok: false };
        }
    }

    async function placeOrder() {
        const user = getStoredUser();
        if (!user) {
            setError("User not logged in. Please log in and try again.");
            return;
        }

        if (user.id === null || user.id === undefined) {
            setError("User ID not found. Please log out and log back in.");
            return;
        }

        if (cart.length === 0) {
            setError("Cart is empty. Please add items before placing an order.");
            return;
        }

        setPlacingOrder(true);
        setError(null);
        setOrderSuccess(false);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for order placement

            const res = await fetch("/api/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    items: cart,
                    employeeId: user.id,
                }),
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

            if (res.ok && data.ok) {
                setOrderSuccess(true);
                setCart([]);
                setTimeout(() => setOrderSuccess(false), 3000);
            } else {
                throw new Error(data?.error || "Failed to place order");
            }
        } catch (err: any) {
            console.error("Order placement failed:", err);

            let errorMessage = "Network error. Please check your connection and try again.";
            if (err.name === "AbortError") {
                errorMessage = "Order request timeout. Please check your connection and try again.";
            } else if (err.message === "server_error") {
                errorMessage = "Server error. Unable to process order. Please try again later.";
            } else if (err.message === "client_error") {
                errorMessage = "Invalid order data. Please check your cart and try again.";
            } else if (
                err.message?.includes("Failed to fetch") ||
                err.message?.includes("NetworkError")
            ) {
                errorMessage = "Network error. Please check your connection and try again.";
            } else if (err.message) {
                errorMessage = err.message;
            }

            setError(errorMessage);
        } finally {
            setPlacingOrder(false);
        }
    }

    // Auto-retry logic for menu loading
    useEffect(() => {
        if (error && retryCount < 3) {
            const timer = setTimeout(() => {
                console.log(`Auto-retrying menu fetch (attempt ${retryCount + 1}/3)`);
                setRetryCount((prev) => prev + 1);
                getMenuItems();
            }, 3000); // Retry after 3 seconds
            return () => clearTimeout(timer);
        }
    }, [error, retryCount]);

    useEffect(() => {
        const user = getStoredUser();

        if (!user) router.push("/login");

        const m = user?.ismanager;
        const isManager = m === true || m === "1" || m === 1;

        if (isManager) router.push("/manager");

        getMenuItems();
    }, []);

    return (
        <div className="relative h-screen w-full flex flex-col overflow-hidden">
            <div className="fixed inset-0 -z-20 bg-white/50">
                <Iridescence
                    color={[1.0, 0.7, 0.7]}
                    mouseReact={true}
                    amplitude={0.1}
                    speed={1.0}
                />
            </div>

            <div className="flex-none p-4 flex gap-2 z-10 bg-white/30 backdrop-blur-sm border-b border-white/20">
                <Link href="/">
                    <Button variant="outline">Home</Button>
                </Link>
                <LogoutButton variant="outline" redirect="/login" />
            </div>

            <div className="flex-1 flex flex-row gap-6 p-6 overflow-hidden">
                <Card className="bg-white/60 backdrop-blur-md w-96 flex flex-col shadow-xl border-2 border-white/50 h-full">
                    <CardHeader className="flex-none">
                        <CardTitle className="font-header text-3xl text-black bg-yellow-500/50 p-2 rounded-md">
                            Order (Employee)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto space-y-4 p-4">
                        {error && (
                            <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                                <div className="flex flex-col gap-3">
                                    <div className="text-center">
                                        <h3 className="text-lg font-bold text-red-800 mb-1">
                                            Error
                                        </h3>
                                        <p className="text-red-600 text-sm">{error}</p>
                                        {retryCount > 0 && retryCount < 3 && (
                                            <p className="text-xs text-red-500 mt-2">
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
                                        size="sm"
                                        className="w-full"
                                    >
                                        Retry Now
                                    </Button>
                                </div>
                            </div>
                        )}
                        {orderSuccess && (
                            <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                                Order placed successfully!
                            </div>
                        )}
                        {cart.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground font-deco text-xl opacity-50">
                                Cart is empty
                            </div>
                        ) : (
                            cart.map((item) => (
                                <div
                                    key={item.cartId}
                                    className="flex flex-col gap-2 p-3 bg-white/50 rounded-lg border border-white/40 shadow-sm"
                                >
                                    <div className="flex flex-row justify-between items-start">
                                        <div>
                                            <h2 className="font-deco font-bold text-lg leading-tight">
                                                {item.name}
                                            </h2>
                                            <div className="text-xs text-gray-600 font-deco">
                                                Boba: {item.boba ?? 100}% | Ice:{" "}
                                                {item.ice ?? 100}% | Sugar:{" "}
                                                {item.sugar ?? 100}%
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-deco font-bold text-black/50">
                                                ${item.price}
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 hover:bg-blue-100"
                                                onClick={() => {
                                                    setEditingItem(item);
                                                    setEditBoba(
                                                        item.boba ?? 100
                                                    );
                                                    setEditIce(item.ice ?? 100);
                                                    setEditSugar(
                                                        item.sugar ?? 100
                                                    );
                                                }}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 hover:bg-red-100 hover:text-red-600"
                                                onClick={() =>
                                                    setCart((prev) =>
                                                        prev.filter(
                                                            (i) => i !== item
                                                        )
                                                    )
                                                }
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                    {cart.length > 0 && (
                        <CardFooter className="flex-none border-t border-white/20 p-4 bg-white/20">
                            <Button
                                className="w-full text-lg py-6 shadow-lg"
                                onClick={placeOrder}
                                disabled={placingOrder}
                            >
                                {placingOrder
                                    ? "Placing Order..."
                                    : "Place Order"}
                            </Button>
                        </CardFooter>
                    )}
                </Card>

                <div className="flex-1 overflow-y-auto pr-2">
                    {loading && menuItems.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-yellow-500 mx-auto mb-4"></div>
                                <p className="text-xl font-deco text-gray-700">
                                    Loading menu...
                                </p>
                            </div>
                        </div>
                    ) : (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4 pb-20">
                        {menuItems.map((item) => (
                            <button
                                key={item.id}
                                className="text-left h-full"
                                onClick={() => {
                                    const cartId =
                                        typeof crypto !== "undefined" &&
                                        "randomUUID" in crypto
                                            ? (crypto as any).randomUUID()
                                            : `${
                                                  item.id
                                              }-${Date.now()}-${Math.floor(
                                                  Math.random() * 10000
                                              )}`;

                                    const newItem = {
                                        ...item,
                                        cartId,
                                        boba: 100,
                                        ice: 100,
                                        sugar: 100,
                                    };
                                    setCart((prev) => [...prev, newItem]);
                                }}
                            >
                                <Card className="h-full bg-white/60 backdrop-blur-md hover:bg-white hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-xl border-2 border-transparent hover:border-yellow-400/50 group">
                                    <CardContent className="p-5 flex flex-col justify-between h-full gap-4">
                                        <h1 className="font-deco font-bold text-xl group-hover:text-yellow-600 transition-colors">
                                            {item.name}
                                        </h1>
                                        <div className="font-deco text-2xl font-bold text-black/40 self-end">
                                            ${item.price}
                                        </div>
                                    </CardContent>
                                </Card>
                            </button>
                        ))}
                    </div>
                    )}
                </div>
            </div>

            {/* Edit Customization Dialog */}
            <Dialog
                open={editingItem !== null}
                onOpenChange={(open) => !open && setEditingItem(null)}
            >
                <DialogContent className="bg-white">
                    <DialogHeader>
                        <DialogTitle>Customize {editingItem?.name}</DialogTitle>
                        <DialogDescription>
                            Adjust boba, ice, and sugar levels (25%, 50%, 75%,
                            or 100%)
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="boba">
                                Boba Level: {editBoba}%
                            </Label>
                            <div className="flex gap-2">
                                {[25, 50, 75, 100].map((level) => (
                                    <Button
                                        key={level}
                                        variant={
                                            editBoba === level
                                                ? "default"
                                                : "outline"
                                        }
                                        onClick={() => setEditBoba(level)}
                                        className="flex-1"
                                    >
                                        {level}%
                                    </Button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ice">Ice Level: {editIce}%</Label>
                            <div className="flex gap-2">
                                {[25, 50, 75, 100].map((level) => (
                                    <Button
                                        key={level}
                                        variant={
                                            editIce === level
                                                ? "default"
                                                : "outline"
                                        }
                                        onClick={() => setEditIce(level)}
                                        className="flex-1"
                                    >
                                        {level}%
                                    </Button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="sugar">
                                Sugar Level: {editSugar}%
                            </Label>
                            <div className="flex gap-2">
                                {[25, 50, 75, 100].map((level) => (
                                    <Button
                                        key={level}
                                        variant={
                                            editSugar === level
                                                ? "default"
                                                : "outline"
                                        }
                                        onClick={() => setEditSugar(level)}
                                        className="flex-1"
                                    >
                                        {level}%
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setEditingItem(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => {
                                setCart((prev) =>
                                    prev.map((i) =>
                                        i === editingItem
                                            ? {
                                                  ...i,
                                                  boba: editBoba,
                                                  ice: editIce,
                                                  sugar: editSugar,
                                              }
                                            : i
                                    )
                                );
                                setEditingItem(null);
                            }}
                        >
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
