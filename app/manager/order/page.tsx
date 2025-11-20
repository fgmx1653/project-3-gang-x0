"use client";

import { Button } from "@/components/ui/button";
import Iridescence from "@/components/Iridescence";
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
            setError('User not logged in');
            return;
        }

        if (user.id === null || user.id === undefined) {
            setError('User ID not found. Please log out and log back in.');
            return;
        }

        setPlacingOrder(true);
        setError(null);
        setOrderSuccess(false);

        try {
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: cart,
                    employeeId: user.id
                }),
            });

            const data = await res.json();

            if (res.ok && data.ok) {
                setOrderSuccess(true);
                setCart([]);
                setTimeout(() => setOrderSuccess(false), 3000);
            } else {
                setError(data?.error || 'Failed to place order');
            }
        } catch (err) {
            console.error('Order placement failed', err);
            setError('Network error');
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
    }, [router]);

    return (
        <div className="flex flex-col items-center justify-center gap-4 p-16 w-screen h-screen">
            <div className="absolute left-4 top-4 flex flex-col gap-2">
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

            <div className="absolute -z-20 w-full h-full">
                <Iridescence
                    color={[1.0, 0.7, 0.7]}
                    mouseReact={true}
                    amplitude={0.1}
                    speed={1.0}
                />
            </div>

            <div className="flex flex-row gap-8">
                <Card className="bg-white/60 backdrop-blur-md min-w-100 max-h-screen">
                    <CardHeader>
                        <CardTitle className="font-header text-3xl text-black bg-yellow-500/50">
                            Order (Manager)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {error && (
                            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                                {error}
                            </div>
                        )}
                        {orderSuccess && (
                            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                                Order placed successfully!
                            </div>
                        )}
                        {(cart.length != 0 &&
                            cart.map((item) => (
                                <div key={item.cartId} className="mb-4 flex flex-col gap-2">
                                    <div className="flex flex-row justify-between items-start gap-10">
                                        <div>
                                            <h2 className="text-lg font-bold font-deco">
                                                {item.name}
                                            </h2>
                                            <div className="text-xs text-gray-600">
                                                Boba: {item.boba ?? 100}% | Ice: {item.ice ?? 100}% | Sugar: {item.sugar ?? 100}%
                                            </div>
                                        </div>
                                        <div className="flex flex-row gap-2 items-center justify-center">
                                            <p className="text-lg font-bold font-deco text-black/25">
                                                ${item.price}
                                            </p>
                                            <Edit
                                                className="transition ease-in-out duration-200 hover:cursor-pointer hover:bg-blue-100 p-1"
                                                size={24}
                                                onClick={() => {
                                                    setEditingItem(item);
                                                    setEditBoba(item.boba ?? 100);
                                                    setEditIce(item.ice ?? 100);
                                                    setEditSugar(item.sugar ?? 100);
                                                }}
                                            />
                                            <X
                                                className="transition ease-in-out duration-200 hover:cursor-pointer hover:bg-white"
                                                onClick={() => {
                                                    setCart((prev) =>
                                                        prev.filter(
                                                            (i) => i !== item
                                                        )
                                                    );
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))) || (
                            <h2 className="text-lg font-bold font-deco text-black/25">
                                Add items to your cart
                            </h2>
                        )}
                    </CardContent>
                    {cart.length != 0 && (
                        <CardFooter>
                            <Button onClick={placeOrder} disabled={placingOrder}>
                                {placingOrder ? 'Placing Order...' : 'Place Order'}
                            </Button>
                        </CardFooter>
                    )}
                </Card>

                <div className="grid grid-cols-4 gap-4 max-h-screen overflow-y-auto">
                    {menuItems.map((item) => (
                        <div key={item.id}>
                            <button
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
                                        sugar: 100
                                    };
                                    setCart((prev) => [...prev, newItem]);
                                }}
                            >
                                <Card className="bg-white/60 backdrop-blur-md transform transition-transform duration-200 ease-in-out hover:-translate-y-1 hover:shadow-lg hover:bg-white hover:cursor-pointer w-60">
                                    <CardContent>
                                        <div className="flex flex-col justify-between items-start">
                                            <h1 className="font-deco font-bold">
                                                {item.name}
                                            </h1>
                                            <h1 className="font-deco">
                                                ${item.price}
                                            </h1>
                                        </div>
                                    </CardContent>
                                </Card>
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Edit Customization Dialog */}
            <Dialog open={editingItem !== null} onOpenChange={(open: boolean) => !open && setEditingItem(null)}>
                <DialogContent className="bg-white">
                    <DialogHeader>
                        <DialogTitle>Customize {editingItem?.name}</DialogTitle>
                        <DialogDescription>
                            Adjust boba, ice, and sugar levels (25%, 50%, 75%, or 100%)
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="boba">Boba Level: {editBoba}%</Label>
                            <div className="flex gap-2">
                                {[25, 50, 75, 100].map((level) => (
                                    <Button
                                        key={level}
                                        variant={editBoba === level ? "default" : "outline"}
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
                                        variant={editIce === level ? "default" : "outline"}
                                        onClick={() => setEditIce(level)}
                                        className="flex-1"
                                    >
                                        {level}%
                                    </Button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="sugar">Sugar Level: {editSugar}%</Label>
                            <div className="flex gap-2">
                                {[25, 50, 75, 100].map((level) => (
                                    <Button
                                        key={level}
                                        variant={editSugar === level ? "default" : "outline"}
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
                        <Button variant="outline" onClick={() => setEditingItem(null)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={() => {
                                setCart(prev => prev.map(i =>
                                    i === editingItem
                                        ? { ...i, boba: editBoba, ice: editIce, sugar: editSugar }
                                        : i
                                ));
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
