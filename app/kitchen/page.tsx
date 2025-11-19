"use client";

import { Button } from "@/components/ui/button";
import Iridescence from "@/components/Iridescence";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock, RefreshCw } from "lucide-react";

interface OrderItem {
    id: number;
    menu_item_id: number;
    menu_item_name: string;
    price: string;
}

interface Order {
    order_id: number;
    order_date: string;
    order_time: string;
    employee: number | null;
    status: string;
    items: OrderItem[];
}

export default function KitchenPage() {
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    async function fetchOrders() {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/kitchen");
            const data = await res.json();

            if (res.ok && data.ok) {
                setOrders(data.orders || []);
            } else {
                setError(data?.error || "Failed to load orders");
            }
        } catch (err) {
            console.error("Kitchen orders request", err);
            setError("Network error");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchOrders();
        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchOrders, 30000);
        return () => clearInterval(interval);
    }, []);

    async function markAsCompleted(orderId: number) {
        try {
            const res = await fetch("/api/kitchen", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId, status: "completed" }),
            });
            if (res.ok) {
                // Refresh orders to get updated status
                fetchOrders();
            }
        } catch (err) {
            console.error("Failed to mark order as completed", err);
        }
    }

    async function markAsInProgress(orderId: number) {
        try {
            const res = await fetch("/api/kitchen", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId, status: "pending" }),
            });
            if (res.ok) {
                // Refresh orders to get updated status
                fetchOrders();
            }
        } catch (err) {
            console.error("Failed to mark order as pending", err);
        }
    }

    const pendingOrders = orders.filter((o) => o.status === "pending");
    const completedOrdersList = orders
        .filter((o) => o.status === "completed")
        .slice(0, 10); // Only show the last 10 completed orders

    return (
        <div className="relative flex flex-col w-full min-h-screen overflow-x-hidden bg-gradient-to-br from-slate-100 via-gray-100 to-slate-200">
            {/* Background Pattern */}
            <div className="fixed inset-0 -z-10 opacity-30">
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(0,0,0,.03) 35px, rgba(0,0,0,.03) 70px)`,
                        backgroundSize: "100px 100px",
                    }}
                ></div>
            </div>

            {/* Header */}
            <div className="fixed left-4 top-4 flex flex-row gap-2 z-50">
                <Link href="/">
                    <Button className="shadow-lg">Home</Button>
                </Link>
                <Button
                    onClick={fetchOrders}
                    variant="outline"
                    className="shadow-lg bg-white"
                >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                </Button>
            </div>

            {/* Main Content */}
            <div className="flex-1 pt-24 pb-12 px-4 md:px-8 overflow-y-auto max-w-full">
                <h1 className="text-5xl font-bold font-header text-center mb-12 text-gray-900 drop-shadow-lg">
                    Kitchen Display System
                </h1>

                {error && (
                    <div className="mb-6 p-4 bg-red-100 border-2 border-red-400 text-red-700 rounded-lg shadow-md">
                        {error}
                    </div>
                )}

                {loading && (
                    <div className="text-center text-2xl font-deco text-gray-700">
                        Loading orders...
                    </div>
                )}

                {/* Pending Orders */}
                <div className="mb-16">
                    <h2 className="text-3xl font-bold font-deco mb-6 flex items-center gap-3 text-gray-900">
                        <Clock className="text-orange-500" size={32} />
                        Pending Orders ({pendingOrders.length})
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {pendingOrders.map((order) => (
                            <Card
                                key={order.order_id}
                                className="bg-white/90 backdrop-blur-md shadow-xl border-4 border-orange-400 hover:border-orange-500 transition-all hover:scale-105"
                            >
                                <CardHeader className="bg-gradient-to-r from-orange-100 to-orange-200 pb-4">
                                    <CardTitle className="flex justify-between items-center">
                                        <span className="text-4xl font-bold text-gray-900">
                                            #{order.order_id}
                                        </span>
                                        <span className="text-lg font-semibold text-gray-700">
                                            {order.order_time.substring(0, 5)}
                                        </span>
                                    </CardTitle>
                                    {order.employee !== null && (
                                        <div className="text-sm font-medium text-gray-700 mt-1">
                                            Employee: {order.employee}
                                        </div>
                                    )}
                                    {order.employee === null && (
                                        <div className="text-sm font-medium text-blue-700 mt-1">
                                            Customer (Kiosk)
                                        </div>
                                    )}
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <div className="space-y-3 mb-6">
                                        {order.items.map((item, idx) => (
                                            <div
                                                key={idx}
                                                className="flex justify-between items-start border-b pb-2 border-gray-200 last:border-0"
                                            >
                                                <span className="font-semibold text-xl text-gray-800">
                                                    {item.menu_item_name}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    <Button
                                        onClick={() =>
                                            markAsCompleted(order.order_id)
                                        }
                                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-6 text-lg shadow-lg"
                                    >
                                        <CheckCircle2 className="mr-2 h-5 w-5" />
                                        Mark Complete
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                    {pendingOrders.length === 0 && !loading && (
                        <div className="text-center text-2xl font-semibold text-gray-600 py-12 bg-white/60 rounded-lg">
                            No pending orders
                        </div>
                    )}
                </div>

                {/* Completed Orders */}
                {completedOrdersList.length > 0 && (
                    <div>
                        <h2 className="text-3xl font-bold font-deco mb-6 flex items-center gap-3 text-gray-900">
                            <CheckCircle2
                                className="text-green-500"
                                size={32}
                            />
                            Completed Orders ({completedOrdersList.length})
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {completedOrdersList.map((order) => (
                                <Card
                                    key={order.order_id}
                                    className="bg-white/70 backdrop-blur-md opacity-80 shadow-md"
                                >
                                    <CardHeader className="bg-gradient-to-r from-green-100 to-green-200">
                                        <CardTitle className="flex justify-between items-center">
                                            <span className="text-3xl font-bold text-gray-700">
                                                #{order.order_id}
                                            </span>
                                            <CheckCircle2
                                                className="text-green-600"
                                                size={28}
                                            />
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-4">
                                        <div className="space-y-2 mb-4">
                                            {order.items.map((item, idx) => (
                                                <div
                                                    key={idx}
                                                    className="text-base line-through text-gray-500"
                                                >
                                                    {item.menu_item_name}
                                                </div>
                                            ))}
                                        </div>
                                        <Button
                                            onClick={() =>
                                                markAsInProgress(order.order_id)
                                            }
                                            variant="outline"
                                            className="w-full border-2 hover:bg-orange-50"
                                            size="sm"
                                        >
                                            Move to Pending
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
