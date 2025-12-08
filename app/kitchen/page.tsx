"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock, RefreshCw, Archive, Timer } from "lucide-react";

interface OrderItem {
    id: number;
    menu_item_id: number;
    menu_item_name: string;
    price: string;
    boba: number;
    ice: number;
    sugar: number;
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
    const [archivedOrderIds, setArchivedOrderIds] = useState<Set<number>>(
        new Set()
    );
    const [currentTime, setCurrentTime] = useState(new Date());

    // Update current time every minute for elapsed time calculations
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000); // Update every minute
        return () => clearInterval(timer);
    }, []);

    // Load archived orders from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem("archivedOrders");
            if (stored) {
                const parsed = JSON.parse(stored);
                setArchivedOrderIds(new Set(parsed));
            }
        } catch (e) {
            console.error("Failed to load archived orders", e);
        }
    }, []);

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

    async function cancelOrder(orderId: number) {
        if (
            !confirm(
                `Are you sure you want to cancel Order #${orderId}? This will restore inventory and cannot be undone.`
            )
        ) {
            return;
        }

        try {
            const res = await fetch("/api/orders/cancel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId }),
            });

            const data = await res.json();

            if (res.ok && data.ok) {
                // Refresh orders to show updated list
                fetchOrders();
            } else {
                alert(data.error || "Failed to cancel order");
            }
        } catch (err) {
            console.error("Failed to cancel order", err);
            alert("Network error: Failed to cancel order");
        }
    }

    function archiveOrder(orderId: number) {
        setArchivedOrderIds((prev) => {
            const newSet = new Set(prev).add(orderId);
            // Save to localStorage
            try {
                localStorage.setItem(
                    "archivedOrders",
                    JSON.stringify(Array.from(newSet))
                );
            } catch (e) {
                console.error("Failed to save archived orders", e);
            }
            return newSet;
        });
    }

    // Calculate estimated preparation time based on number of items
    // Base time: 3 minutes, + 2 minutes per item
    function calculatePrepTime(itemCount: number): number {
        return 3 + itemCount * 2;
    }

    // Calculate elapsed time since order was placed
    function getElapsedMinutes(orderTime: string): number {
        if (!orderTime) return 0;

        // Get current time in CST
        const now = new Date();
        const cstFormatter = new Intl.DateTimeFormat("en-US", {
            timeZone: "America/Chicago",
            hour: "numeric",
            minute: "numeric",
            hour12: false,
        });

        // Parse "HH:MM" from the current CST time
        const parts = cstFormatter.formatToParts(now);
        const nowH = parseInt(
            parts.find((p) => p.type === "hour")?.value || "0",
            10
        );
        const nowM = parseInt(
            parts.find((p) => p.type === "minute")?.value || "0",
            10
        );

        // Parse order time (which we know is stored as CST HH:MM:SS)
        const [orderH, orderM] = orderTime.split(":").map(Number);

        // Convert both to minutes from midnight
        const currentMinutes = nowH * 60 + nowM;
        const orderMinutes = orderH * 60 + orderM;

        // Handle day rollover (e.g. if order was 23:50 and now is 00:10)
        // Note: This simple logic assumes orders don't stay pending for > 24 hours
        let diff = currentMinutes - orderMinutes;
        if (diff < -720) {
            // likely day rollover (e.g. -1400 minutes)
            diff += 1440; // add 24 hours
        }

        return Math.max(0, diff);
    }

    // Format time for display
    function formatPrepTime(minutes: number): string {
        if (minutes < 60) {
            return `${minutes} min`;
        }
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }

    const pendingOrders = orders.filter((o) => o.status === "pending");
    const completedOrdersList = orders
        .filter(
            (o) => o.status === "completed" && !archivedOrderIds.has(o.order_id)
        )
        .slice(0, 10); // Only show the last 10 completed orders
    const cancelledOrdersList = orders
        .filter(
            (o) => o.status === "cancelled" && !archivedOrderIds.has(o.order_id)
        )
        .slice(0, 5); // Show last 5 cancelled orders

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
                        {pendingOrders.map((order) => {
                            const prepTime = calculatePrepTime(
                                order.items.length
                            );
                            const elapsed = getElapsedMinutes(order.order_time);
                            const isOverdue = elapsed > prepTime;

                            return (
                                <Card
                                    key={order.order_id}
                                    className={`bg-white/90 backdrop-blur-md shadow-xl border-4 transition-all hover:scale-105 ${
                                        isOverdue
                                            ? "border-red-500 hover:border-red-600"
                                            : "border-orange-400 hover:border-orange-500"
                                    }`}
                                >
                                    <CardHeader
                                        className={`pb-4 ${
                                            isOverdue
                                                ? "bg-gradient-to-r from-red-100 to-red-200"
                                                : "bg-gradient-to-r from-orange-100 to-orange-200"
                                        }`}
                                    >
                                        <CardTitle className="flex justify-between items-center">
                                            <span className="text-4xl font-bold text-gray-900">
                                                #{order.order_id}
                                            </span>
                                            <span className="text-lg font-semibold text-gray-700">
                                                {order.order_time.substring(
                                                    0,
                                                    5
                                                )}
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

                                        {/* Preparation Time Estimate */}
                                        <div className="mt-3 space-y-2">
                                            <div className="flex items-center justify-between bg-white/60 rounded-lg px-3 py-2">
                                                <div className="flex items-center gap-2">
                                                    <Timer
                                                        className={`h-4 w-4 ${
                                                            isOverdue
                                                                ? "text-red-600"
                                                                : "text-blue-600"
                                                        }`}
                                                    />
                                                    <span className="text-xs font-semibold text-gray-700">
                                                        Est. Prep Time
                                                    </span>
                                                </div>
                                                <span className="text-sm font-bold text-gray-900">
                                                    {formatPrepTime(prepTime)}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between bg-white/60 rounded-lg px-3 py-2">
                                                <div className="flex items-center gap-2">
                                                    <Clock
                                                        className={`h-4 w-4 ${
                                                            isOverdue
                                                                ? "text-red-600"
                                                                : "text-orange-600"
                                                        }`}
                                                    />
                                                    <span className="text-xs font-semibold text-gray-700">
                                                        Waiting
                                                    </span>
                                                </div>
                                                <span
                                                    className={`text-sm font-bold ${
                                                        isOverdue
                                                            ? "text-red-600"
                                                            : "text-gray-900"
                                                    }`}
                                                >
                                                    {formatPrepTime(elapsed)}
                                                </span>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-6">
                                        <div className="space-y-3 mb-6">
                                            {order.items.map((item, idx) => (
                                                <div
                                                    key={idx}
                                                    className="border-b pb-3 border-gray-200 last:border-0"
                                                >
                                                    <span className="font-semibold text-xl text-gray-800">
                                                        {item.menu_item_name}
                                                    </span>
                                                    <div className="text-sm text-gray-600 mt-1">
                                                        Boba: {item.boba}% |
                                                        Ice: {item.ice}% |
                                                        Sugar: {item.sugar}%
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="space-y-2">
                                            <Button
                                                onClick={() =>
                                                    markAsCompleted(
                                                        order.order_id
                                                    )
                                                }
                                                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 text-lg shadow-lg"
                                            >
                                                <CheckCircle2 className="mr-2 h-5 w-5" />
                                                Mark Complete
                                            </Button>
                                            <Button
                                                onClick={() =>
                                                    cancelOrder(order.order_id)
                                                }
                                                variant="outline"
                                                className="w-full border-2 border-red-500 text-red-600 hover:bg-red-50 font-bold py-4 text-lg shadow-lg"
                                            >
                                                Cancel Order
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
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
                                            <div className="flex flex-col items-end gap-1">
                                                <span className="text-base font-semibold text-gray-600">
                                                    {order.order_time.substring(
                                                        0,
                                                        5
                                                    )}
                                                </span>
                                                <CheckCircle2
                                                    className="text-green-600"
                                                    size={24}
                                                />
                                            </div>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-4">
                                        <div className="space-y-2 mb-4">
                                            {order.items.map((item, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex flex-col"
                                                >
                                                    <span className="text-base line-through text-gray-500">
                                                        {item.menu_item_name}
                                                    </span>
                                                    <span className="text-xs text-gray-400">
                                                        Boba: {item.boba}% |
                                                        Ice: {item.ice}% |
                                                        Sugar: {item.sugar}%
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={() =>
                                                    markAsInProgress(
                                                        order.order_id
                                                    )
                                                }
                                                variant="outline"
                                                className="flex-1 border-2 hover:bg-orange-50"
                                                size="sm"
                                            >
                                                Move to Pending
                                            </Button>
                                            <Button
                                                onClick={() =>
                                                    archiveOrder(order.order_id)
                                                }
                                                variant="outline"
                                                className="flex-1 border-2 hover:bg-gray-100"
                                                size="sm"
                                            >
                                                <Archive className="mr-2 h-4 w-4" />
                                                Archive
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* Cancelled Orders */}
                {cancelledOrdersList.length > 0 && (
                    <div className="mt-16">
                        <h2 className="text-3xl font-bold font-deco mb-6 flex items-center gap-3 text-gray-900">
                            <span className="text-red-500 text-4xl">✕</span>
                            Cancelled Orders ({cancelledOrdersList.length})
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {cancelledOrdersList.map((order) => (
                                <Card
                                    key={order.order_id}
                                    className="bg-red-50/90 backdrop-blur-md shadow-xl border-4 border-red-300 opacity-75"
                                >
                                    <CardHeader className="pb-4 bg-gradient-to-r from-red-100 to-red-200">
                                        <CardTitle className="flex justify-between items-center">
                                            <span className="text-4xl font-bold text-gray-900 line-through">
                                                #{order.order_id}
                                            </span>
                                            <span className="text-lg font-semibold text-gray-700">
                                                {order.order_time.substring(
                                                    0,
                                                    5
                                                )}
                                            </span>
                                        </CardTitle>
                                        <div className="text-sm font-bold text-red-700 mt-2 uppercase">
                                            Cancelled
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-6">
                                        <div className="space-y-2 mb-4">
                                            {order.items.map((item, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex flex-col"
                                                >
                                                    <span className="text-base line-through text-gray-500">
                                                        {item.menu_item_name}
                                                    </span>
                                                    <span className="text-xs text-gray-400">
                                                        Boba: {item.boba}% |
                                                        Ice: {item.ice}% |
                                                        Sugar: {item.sugar}%
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                        <Button
                                            onClick={() =>
                                                archiveOrder(order.order_id)
                                            }
                                            variant="outline"
                                            className="w-full border-2 border-gray-400 hover:bg-gray-100 text-gray-700 font-bold"
                                            size="sm"
                                        >
                                            <Archive className="mr-2 h-4 w-4" />
                                            Archive
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
