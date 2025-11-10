"use client";

import { Button } from "@/components/ui/button";
import Iridescence from "@/components/Iridescence";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStoredUser, logoutClient } from "@/lib/clientAuth";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

export default function ManagerHome() {
    const router = useRouter();

    // menuItems fetched from /api/menu
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [cart, setCart] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [placingOrder, setPlacingOrder] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState(false);

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

        setUserName(user?.name || "Manager");
    }, [router]);

    const managerFeatures = [
        {
            title: "Menu Editor",
            description:
                "Add, edit, or remove menu items and manage ingredients",
            icon: "🍽️",
            href: "/manager/menu-editor",
            color: "bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20",
        },
        {
            title: "Inventory Management",
            description: "Track and manage ingredient inventory levels",
            icon: "📦",
            href: "/manager/inventory",
            color: "bg-green-500/10 border-green-500/30 hover:bg-green-500/20",
        },
        {
            title: "Sales Reports",
            description: "View sales analytics and generate reports",
            icon: "📊",
            href: "/manager/reports",
            color: "bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20",
        },
        {
            title: "Employee Management",
            description: "Manage employee accounts and permissions",
            icon: "👥",
            href: "/manager/employees",
            color: "bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20",
        },
        {
            title: "Order History",
            description: "Review past orders and transactions",
            icon: "📋",
            href: "/manager/orders",
            color: "bg-pink-500/10 border-pink-500/30 hover:bg-pink-500/20",
        },
        {
            title: "Place Order",
            description: "Create orders on behalf of customers",
            icon: "🛒",
            href: "/manager/order",
            color: "bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20",
        },
    ];

    return (
        <div className="relative flex flex-col items-center justify-center min-h-screen p-8">
            {/* Background */}
            <div className="absolute -z-20 w-full h-full">
                <Iridescence
                    color={[1.0, 0.7, 0.7]}
                    mouseReact={true}
                    amplitude={0.1}
                    speed={1.0}
                />
            </div>

            <div className="flex flex-row gap-8">

                <Card className='bg-white/60 backdrop-blur-md min-w-100 max-h-screen'>
                    <CardHeader>
                        <CardTitle className='font-header text-3xl text-black bg-yellow-500/50'>Order (Manager)</CardTitle>
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
                        {cart.length != 0 && cart.map((item) => (
                            // use the unique cartId for keys (fallback to item.id or index)
                            <div key={item.cartId} className="mb-4 flex flex-row justify-between items-start gap-10">
                                <h2 className="text-lg font-bold font-deco">{item.name}</h2>
                                <div className='flex flex-row gap-2 items-center justify-center'>
                                    <p className="text-lg font-bold font-deco text-black/25">${item.price}</p>
                                    <X className='transition ease-in-out duration-200 hover:cursor-pointer hover:bg-white' onClick={() => {
                                        setCart(prev => prev.filter(i => i !== item))
                                    }} />
                                </div>
                            </div>
                        )) || (
                                <h2 className="text-lg font-bold font-deco text-black/25">Add items to your cart</h2>
                            )}
                    </CardContent>
                    {
                        cart.length != 0 && (
                            <CardFooter>
                                <Button onClick={placeOrder} disabled={placingOrder}>
                                    {placingOrder ? 'Placing Order...' : 'Place Order'}
                                </Button>
                            </CardFooter>
                        )
                    }
                </Card>

            {/* Main Content */}
            <div className="w-full max-w-6xl">
                <div className="mb-8 text-center">
                    <h1 className="text-4xl font-bold font-header mb-2">
                        Manager Dashboard
                    </h1>
                    <p className="text-lg text-muted-foreground">
                        Welcome back, {userName}
                    </p>
                </div>

                {/* Feature Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {managerFeatures.map((feature) => (
                        <Link key={feature.href} href={feature.href}>
                            <Card
                                className={`h-full transition-all duration-200 hover:shadow-lg hover:-translate-y-1 cursor-pointer bg-white/80 backdrop-blur-md border-2 ${feature.color}`}
                            >
                                <CardHeader>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-4xl">
                                            {feature.icon}
                                        </span>
                                        <CardTitle className="text-xl">
                                            {feature.title}
                                        </CardTitle>
                                    </div>
                                    <CardDescription className="text-base">
                                        {feature.description}
                                    </CardDescription>
                                </CardHeader>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
