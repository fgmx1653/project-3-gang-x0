"use client";

import { Button } from "@/components/ui/button";
import ClearCartOnMount from "@/components/ClearCartOnMount";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStoredUser } from "@/lib/clientAuth";
import LogoutButton from "@/components/LogoutButton";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

export default function ManagerHome() {
    const router = useRouter();
    const [userName, setUserName] = useState<string>("");

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
            {/* Clear any kiosk cart when entering manager area */}
            <ClearCartOnMount />
            {/* Background */}
            <div className="absolute -z-20 w-full h-full bg-gradient-to-br from-slate-100 via-gray-100 to-slate-200"></div>{" "}
            {/* Header */}
            <div className="absolute left-4 top-4 flex flex-col gap-2">
                <Link href="/">
                    <Button variant="outline">Home</Button>
                </Link>
                <LogoutButton variant="outline" redirect="login" />
            </div>
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
