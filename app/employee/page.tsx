"use client";

import { Button } from "@/components/ui/button"
import Iridescence from '@/components/Iridescence';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Edit } from 'lucide-react';
import { getStoredUser, logoutClient } from '@/lib/clientAuth';

import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Image from 'next/image';
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
            const res = await fetch('/api/menu');
            const data = await res.json();

            if (res.ok && data.ok) {
                setMenuItems(data.items || []);
                setLoading(false);
                return { ok: true };
            }

            setError(data?.error || 'Failed to load menu');
            setLoading(false);
            return { ok: false };
        } catch (err) {
            console.error('Menu request', err);
            setError('Network error');
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

        if (!user) router.push('/login');

        const m = user?.ismanager;
        const isManager = m === true || m === '1' || m === 1;

        if (isManager) router.push('/manager');

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
                <Link href='/'>
                    <Button variant="outline">Home</Button>
                </Link>
                <Button
                    variant="outline"
                    onClick={() => {
                        logoutClient();
                        router.push('/login');
                    }}
                >
                    Log out
                </Button>
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
                            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                                {error}
                            </div>
                        )}
                        {orderSuccess && (
                            <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                                Order placed successfully!
                            </div>
                        )}
                        {cart.length != 0 && cart.map((item) => (
                            // use the unique cartId for keys (fallback to item.id or index)
                            <div key={item.cartId} className="mb-4 flex flex-col gap-2">
                                <div className="flex flex-row justify-between items-start gap-10">
                                    <div>
                                        <h2 className="text-lg font-bold font-deco">{item.name}</h2>
                                        <div className="text-xs text-gray-600">
                                            Boba: {item.boba ?? 100}% | Ice: {item.ice ?? 100}% | Sugar: {item.sugar ?? 100}%
                                        </div>
                                    </div>
                                    <div className='flex flex-row gap-2 items-center justify-center'>
                                        <p className="text-lg font-bold font-deco text-black/25">${item.price}</p>
                                        <Edit
                                            className='transition ease-in-out duration-200 hover:cursor-pointer hover:bg-blue-100 p-1'
                                            size={24}
                                            onClick={() => {
                                                setEditingItem(item);
                                                setEditBoba(item.boba ?? 100);
                                                setEditIce(item.ice ?? 100);
                                                setEditSugar(item.sugar ?? 100);
                                            }}
                                        />
                                        <X className='transition ease-in-out duration-200 hover:cursor-pointer hover:bg-white' onClick={() => {
                                            setCart(prev => prev.filter(i => i !== item))
                                        }} />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            cart.map((item) => (
                                <div
                                    key={item.cartId}
                                    className="flex flex-row justify-between items-center p-3 bg-white/50 rounded-lg border border-white/40 shadow-sm"
                                >
                                    <h2 className="font-deco font-bold text-lg leading-tight">
                                        {item.name}
                                    </h2>
                                    <div className="flex items-center gap-3">
                                        <span className="font-deco font-bold text-black/50">
                                            ${item.price}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 hover:bg-red-100 hover:text-red-600"
                                            onClick={() => setCart((prev) => prev.filter((i) => i !== item))}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                    {cart.length > 0 && (
                        <CardFooter className="flex-none border-t border-white/20 p-4 bg-white/20">
                            <Button className="w-full text-lg py-6 shadow-lg" onClick={placeOrder} disabled={placingOrder}>
                                {placingOrder ? 'Placing Order...' : 'Place Order'}
                            </Button>
                        </CardFooter>
                    )}
                </Card>

                <div className='grid grid-cols-4 gap-4'>
                    {menuItems.map((item) => (
                        <div key={item.id}>
                            <button onClick={() => {
                                // Create a unique cartId and do NOT mutate the original menu item
                                const cartId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
                                    ? (crypto as any).randomUUID()
                                    : `${item.id}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

                                const newItem = {
                                    ...item,
                                    cartId,
                                    boba: 100,
                                    ice: 100,
                                    sugar: 100
                                };
                                setCart(prev => [...prev, newItem]);
                            }}>
                                <Card className='bg-white/60 backdrop-blur-md transform transition-transform duration-200 ease-in-out hover:-translate-y-1 hover:shadow-lg hover:bg-white hover:cursor-pointer w-60'>
                                    <CardContent>
                                        <div className='flex flex-col justify-between items-start'>
                                            <h1 className='font-deco font-bold'>{item.name}</h1>
                                            <h1 className='font-deco'>${item.price}</h1>
                                        </div>
                                    </CardContent>
                                </Card>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Edit Customization Dialog */}
            <Dialog open={editingItem !== null} onOpenChange={(open) => !open && setEditingItem(null)}>
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