"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Edit } from "lucide-react";
import { getStoredUser, logoutClient } from "@/lib/clientAuth";

import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function ManagerOrderPage() {
    const router = useRouter();

    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [cart, setCart] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [placingOrder, setPlacingOrder] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState(false);
    const [editingItem, setEditingItem] = useState<any | null>(null);
    const [editBoba, setEditBoba] = useState(100);
    const [editIce, setEditIce] = useState(100);
    const [editSugar, setEditSugar] = useState(100);
    const [editSize, setEditSize] = useState<number>(1);
    const [showInstructionsDialog, setShowInstructionsDialog] = useState(false);
    const [specialInstructions, setSpecialInstructions] = useState("");
    const [availableToppings, setAvailableToppings] = useState<any[]>([]);
    const [editToppings, setEditToppings] = useState<any[]>([]);

    async function getMenuItems() {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/menu");
            const data = await res.json();

            if (res.ok && data.ok) {
                setMenuItems(data.items || []);
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

    async function placeOrder() {
        const user = getStoredUser();

        if (!user) {
            setError("User not logged in");
            return;
        }

        if (user.id === null || user.id === undefined) {
            setError("User ID not found. Please log out and log back in.");
            return;
        }

        setPlacingOrder(true);
        setError(null);
        setOrderSuccess(false);

        try {
            const res = await fetch("/api/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    items: cart,
                    employeeId: user.id,
                    specialInstructions: specialInstructions.trim() || null,
                }),
            });

            const data = await res.json();

            if (res.ok && data.ok) {
                setOrderSuccess(true);
                setCart([]);
                setSpecialInstructions("");
                setTimeout(() => setOrderSuccess(false), 3000);
            } else {
                setError(data?.error || "Failed to place order");
            }
        } catch (err) {
            console.error("Order placement failed", err);
            setError("Network error");
        } finally {
            setPlacingOrder(false);
        }
    }

    useEffect(() => {
        const user = getStoredUser();

        if (!user) {
            router.push("/login");
            return;
        }

        const m = user?.ismanager;
        const isManager = m === true || m === "1" || m === 1;

        if (!isManager) {
            router.push("/employee");
            return;
        }

        getMenuItems();

        // Fetch available toppings
        fetch("/api/ingredients/toppings")
            .then((res) => res.json())
            .then((data) => {
                if (data.ok) {
                    setAvailableToppings(data.toppings || []);
                }
            })
            .catch((err) => console.error("Failed to fetch toppings:", err));
    }, [router]);

    return (
        <div className="relative h-screen w-full flex flex-col overflow-hidden">
            <div className="fixed inset-0 -z-20 bg-gradient-to-br from-slate-100 via-gray-100 to-slate-200"></div>

            <div className="flex-none p-4 flex gap-2 z-10 bg-white/30 backdrop-blur-sm border-b border-white/20">
                <Link href="/manager">
                    <Button variant="outline">Dashboard</Button>
                </Link>
                <Link href="/">
                    <Button variant="outline">Home</Button>
                </Link>
                <Button
                    variant="outline"
                    onClick={() => {
                        logoutClient();
                        router.push("/login");
                    }}
                >
                    Log out
                </Button>
            </div>

            <div className="flex-1 flex flex-row gap-6 p-6 overflow-hidden">
                <Card className="bg-white/60 backdrop-blur-md w-96 flex flex-col shadow-xl border-2 border-white/50 h-full">
                    <CardHeader className="flex-none">
                        <CardTitle className="font-header text-3xl text-black bg-yellow-500/50 p-2 rounded-md">
                            Order (Manager)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto space-y-4 p-4">
                        {error && (
                            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                                {error}
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
                                                Size:{" "}
                                                {Number(item.size || 1) === 1
                                                    ? "Small"
                                                    : Number(item.size || 1) ===
                                                      2
                                                    ? "Medium"
                                                    : "Large"}
                                                <br />
                                                Boba: {item.boba ?? 100}% | Ice:{" "}
                                                {item.ice ?? 100}% | Sugar:{" "}
                                                {item.sugar ?? 100}%
                                                {item.toppings &&
                                                    item.toppings.length >
                                                        0 && (
                                                        <>
                                                            <br />
                                                            Toppings:{" "}
                                                            {item.toppings
                                                                .map(
                                                                    (t: any) =>
                                                                        t.name
                                                                )
                                                                .join(", ")}
                                                        </>
                                                    )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-deco font-bold text-black/50">
                                                $
                                                {(
                                                    Number(item.price || 0) +
                                                    Math.max(
                                                        0,
                                                        Number(item.size || 1) -
                                                            1
                                                    ) +
                                                    (
                                                        item.toppings || []
                                                    ).reduce(
                                                        (sum: number, t: any) =>
                                                            sum +
                                                            Number(
                                                                t.price || 0
                                                            ),
                                                        0
                                                    )
                                                ).toFixed(2)}
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
                                                    setEditSize(
                                                        Number(item.size || 1)
                                                    );
                                                    setEditToppings(
                                                        item.toppings || []
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
                        <CardFooter className="flex-none border-t border-white/20 p-4 bg-white/20 flex-col gap-3">
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => setShowInstructionsDialog(true)}
                            >
                                {specialInstructions
                                    ? "Edit Special Instructions"
                                    : "Add Special Instructions"}
                            </Button>
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
                                        size: 1,
                                        toppings: [],
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
                </div>
            </div>

            {/* Edit Customization Dialog */}
            <Dialog
                open={editingItem !== null}
                onOpenChange={(open: boolean) => !open && setEditingItem(null)}
            >
                <DialogContent className="bg-white">
                    <DialogHeader>
                        <DialogTitle>Customize {editingItem?.name}</DialogTitle>
                        <DialogDescription>
                            Adjust boba, ice, and sugar levels
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="boba">
                                Boba Level: {editBoba}%
                            </Label>
                            <div className="flex gap-2 flex-wrap">
                                {[25, 50, 75, 100, 125, 150].map((level) => (
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
                            <div className="flex gap-2 flex-wrap">
                                {[25, 50, 75, 100, 125, 150].map((level) => (
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
                            <div className="flex gap-2 flex-wrap">
                                {[25, 50, 75, 100, 125, 150].map((level) => (
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
                        <div className="space-y-2">
                            <Label htmlFor="size">
                                Size:{" "}
                                {editSize === 1
                                    ? "Small"
                                    : editSize === 2
                                    ? "Medium"
                                    : "Large"}
                            </Label>
                            <div className="flex gap-2">
                                {[1, 2, 3].map((s) => (
                                    <Button
                                        key={s}
                                        variant={
                                            editSize === s
                                                ? "default"
                                                : "outline"
                                        }
                                        onClick={() => setEditSize(s)}
                                        className="flex-1"
                                    >
                                        {s === 1
                                            ? "Small"
                                            : s === 2
                                            ? "Medium"
                                            : "Large"}
                                        {s === 2
                                            ? " (+$1)"
                                            : s === 3
                                            ? " (+$2)"
                                            : ""}
                                    </Button>
                                ))}
                            </div>
                        </div>
                        {availableToppings.length > 0 && (
                            <div className="space-y-2">
                                <Label>Toppings</Label>
                                <div className="flex flex-wrap gap-2">
                                    {availableToppings.map((topping) => {
                                        const isSelected = editToppings.some(
                                            (t: any) => t.id === topping.id
                                        );
                                        return (
                                            <Button
                                                key={topping.id}
                                                variant={
                                                    isSelected
                                                        ? "default"
                                                        : "outline"
                                                }
                                                size="sm"
                                                className={
                                                    isSelected
                                                        ? "bg-green-600 hover:bg-green-700"
                                                        : ""
                                                }
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setEditToppings(
                                                            editToppings.filter(
                                                                (t: any) =>
                                                                    t.id !==
                                                                    topping.id
                                                            )
                                                        );
                                                    } else {
                                                        setEditToppings([
                                                            ...editToppings,
                                                            topping,
                                                        ]);
                                                    }
                                                }}
                                            >
                                                {topping.name} +$
                                                {Number(topping.price).toFixed(
                                                    2
                                                )}
                                            </Button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
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
                                                  size: editSize,
                                                  toppings: editToppings,
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

            {/* Special Instructions Dialog */}
            <Dialog
                open={showInstructionsDialog}
                onOpenChange={setShowInstructionsDialog}
            >
                <DialogContent className="bg-white">
                    <DialogHeader>
                        <DialogTitle>Special Instructions</DialogTitle>
                        <DialogDescription>
                            Add any special requests or dietary notes for this
                            order (optional)
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <textarea
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                            rows={5}
                            placeholder="Add any special requests or dietary notes..."
                            value={specialInstructions}
                            onChange={(e) =>
                                setSpecialInstructions(e.target.value)
                            }
                            maxLength={500}
                        />
                        <div className="text-xs text-gray-500 mt-1 text-right">
                            {specialInstructions.length}/500
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowInstructionsDialog(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => setShowInstructionsDialog(false)}
                        >
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
