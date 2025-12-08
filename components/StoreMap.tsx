"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Icon } from "leaflet";
import type { StoreLocation } from "@/app/locations/page";

// Fix for default marker icons in Next.js
const customIcon = new Icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

interface StoreMapProps {
    locations: StoreLocation[];
}

function StoreMap({ locations }: StoreMapProps) {
    // Center map on College Station area
    const centerLat = 30.6187;
    const centerLng = -96.3142;

    return (
        <MapContainer
            center={[centerLat, centerLng]}
            zoom={10}
            style={{ height: "600px", width: "100%" }}
            className="z-0"
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {locations.map((location) => (
                <Marker
                    key={location.id}
                    position={[location.lat, location.lng]}
                    icon={customIcon}
                >
                    <Popup>
                        <div className="p-2">
                            <h3 className="font-bold text-lg mb-2">
                                {location.name}
                            </h3>
                            <p className="text-sm mb-1">{location.address}</p>
                            <p className="text-sm mb-2">
                                {location.city}, {location.state} {location.zip}
                            </p>
                            <p className="text-sm mb-1">
                                <strong>Phone:</strong>{" "}
                                <a
                                    href={`tel:${location.phone}`}
                                    className="text-blue-600 hover:underline"
                                >
                                    {location.phone}
                                </a>
                            </p>
                            <p className="text-sm">
                                <strong>Hours:</strong> {location.hours}
                            </p>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}

export default StoreMap;
