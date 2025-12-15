"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import dynamic from "next/dynamic";
import { MapPin, Phone, Clock } from "lucide-react";
import type { ComponentType } from "react";

export interface StoreLocation {
    id: number;
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
    hours: string;
    lat: number;
    lng: number;
}

// Dynamically import the map component to avoid SSR issues
const MapComponent: ComponentType<{ locations: StoreLocation[] }> = dynamic(
    () => import("@/components/StoreMap").then((mod) => mod.default),
    {
        ssr: false,
        loading: () => (
            <div className="w-full h-[600px] bg-gray-200 flex items-center justify-center rounded-lg">
                <p className="text-gray-600">Loading map...</p>
            </div>
        ),
    }
);

// Made-up store locations around Texas (College Station area)
const storeLocations: StoreLocation[] = [
    {
        id: 1,
        name: "x0 Tea - College Station",
        address: "1500 Harvey Rd",
        city: "College Station",
        state: "TX",
        zip: "77840",
        phone: "(979) 555-0100",
        hours: "Mon-Sun: 10:00 AM - 10:00 PM",
        lat: 30.6187,
        lng: -96.3142,
    },
    {
        id: 2,
        name: "x0 Tea - Bryan",
        address: "2400 Texas Ave S",
        city: "Bryan",
        state: "TX",
        zip: "77802",
        phone: "(979) 555-0101",
        hours: "Mon-Sun: 10:00 AM - 10:00 PM",
        lat: 30.6509,
        lng: -96.3697,
    },
    {
        id: 3,
        name: "x0 Tea - Northgate",
        address: "301 Church Ave",
        city: "College Station",
        state: "TX",
        zip: "77840",
        phone: "(979) 555-0102",
        hours: "Mon-Thu: 11:00 AM - 11:00 PM, Fri-Sat: 11:00 AM - 12:00 AM, Sun: 12:00 PM - 10:00 PM",
        lat: 30.6228,
        lng: -96.3404,
    },
    {
        id: 4,
        name: "x0 Tea - Century Square",
        address: "1010 University Dr E",
        city: "College Station",
        state: "TX",
        zip: "77840",
        phone: "(979) 555-0103",
        hours: "Mon-Sun: 9:00 AM - 11:00 PM",
        lat: 30.6127,
        lng: -96.3084,
    },
    {
        id: 5,
        name: "x0 Tea - Houston",
        address: "5895 San Felipe St",
        city: "Houston",
        state: "TX",
        zip: "77057",
        phone: "(713) 555-0104",
        hours: "Mon-Sun: 10:00 AM - 10:00 PM",
        lat: 29.7498,
        lng: -95.4949,
    },
];

export default function LocationsPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-100 to-slate-200 relative">
            <Link className="absolute top-8 left-8" href="/">
                <Button variant="outline">← Home</Button>
            </Link>
            <div className="max-w-7xl mx-auto px-4 py-8 pt-24">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-5xl font-bold font-header text-gray-900 mb-2">
                        Our Locations
                    </h1>
                    <p className="text-lg text-gray-600">
                        Find an x0 Tea store near you
                    </p>
                </div>

                {/* Map */}
                <div className="mb-8 rounded-lg overflow-hidden shadow-xl border-4 border-white">
                    <MapComponent locations={storeLocations} />
                </div>

                {/* Store List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {storeLocations.map((store) => (
                        <Card
                            key={store.id}
                            className="bg-white/80 backdrop-blur-md shadow-lg hover:shadow-xl transition-shadow"
                        >
                            <CardHeader className="bg-gradient-to-r from-orange-100 to-red-100">
                                <CardTitle className="text-xl font-bold text-gray-900">
                                    {store.name}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-3">
                                <div className="flex items-start gap-3">
                                    <MapPin className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                                    <div className="text-sm text-gray-700">
                                        <p>{store.address}</p>
                                        <p>
                                            {store.city}, {store.state}{" "}
                                            {store.zip}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Phone className="h-5 w-5 text-blue-500 flex-shrink-0" />
                                    <a
                                        href={`tel:${store.phone}`}
                                        className="text-sm text-blue-600 hover:underline"
                                    >
                                        {store.phone}
                                    </a>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Clock className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-gray-700">
                                        {store.hours}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
