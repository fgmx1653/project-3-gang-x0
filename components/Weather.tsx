"use client";

import { useEffect, useState } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

interface WeatherData {
    temp: number;
    feels_like: number;
    description: string;
    icon: string;
    city: string;
}

export default function Weather() {
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchWeather() {
            try {
                // Default to College Station, TX (Texas A&M)
                const lat = 30.628;
                const lon = -96.3344;
                const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;

                if (!apiKey) {
                    setError("Weather API key not configured");
                    setLoading(false);
                    return;
                }

                const response = await fetch(
                    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=imperial&appid=${apiKey}`
                );

                const data = await response.json();

                if (!response.ok) {
                    if (data.cod === 401) {
                        throw new Error(
                            "API key not activated yet. Please wait a few hours after signup."
                        );
                    }
                    throw new Error(data.message || "Failed to fetch weather");
                }

                setWeather({
                    temp: Math.round(data.main.temp),
                    feels_like: Math.round(data.main.feels_like),
                    description: data.weather[0].description,
                    icon: data.weather[0].icon,
                    city: data.name,
                });
                setLoading(false);
            } catch (err) {
                console.error("Weather fetch error:", err);
                const errorMessage =
                    err instanceof Error
                        ? err.message
                        : "Unable to load weather";
                setError(errorMessage);
                setLoading(false);
            }
        }

        fetchWeather();
    }, []);

    if (loading) {
        return (
            <Card className="bg-white/60 backdrop-blur-md border-white/40 shadow-md min-w-[240px]">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-deco">
                        🌤️ Weather
                    </CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                    <p className="text-xs text-black/50">Loading...</p>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="bg-white/60 backdrop-blur-md border-white/40 shadow-md min-w-[240px]">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-deco">
                        🌤️ Weather
                    </CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                    <p className="text-xs text-amber-700 font-medium">
                        {error}
                    </p>
                    {error.includes("API key") && (
                        <p className="text-xs text-black/40 mt-1">
                            Note: New OpenWeather API keys can take 1-2 hours to
                            activate.
                        </p>
                    )}
                </CardContent>
            </Card>
        );
    }

    if (!weather) return null;

    // Drink recommendation based on temperature
    const getDrinkRecommendation = (temp: number) => {
        if (temp >= 85) return "Perfect weather for an iced milk tea! ❄️";
        if (temp >= 70) return "Great day for a refreshing fruit tea! 🍊";
        if (temp >= 55) return "Try our seasonal specialties! 🍂";
        return "Warm up with a hot bubble tea! ☕";
    };

    return (
        <Card className="bg-white/60 backdrop-blur-md border-white/40 shadow-md w-full max-w-2xl h-20">
            <CardContent className="py-3 px-6 h-full flex items-center">
                <div className="flex items-center justify-between gap-6 w-full">
                    <div className="flex items-center gap-3">
                        <img
                            src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
                            alt={weather.description}
                            className="w-12 h-12"
                        />
                        <div className="flex flex-col justify-center">
                            <div className="text-sm font-deco font-bold leading-tight">
                                {weather.city} Weather
                            </div>
                            <p className="text-xs text-black/50 capitalize font-deco">
                                {weather.description}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <span className="text-3xl font-bold font-deco">
                                {weather.temp}°F
                            </span>
                            <span className="text-xs text-black/50 font-deco">
                                Feels like {weather.feels_like}°F
                            </span>
                        </div>

                        <div className="text-xs font-deco text-blue-700 text-right max-w-[200px] flex items-center">
                            {getDrinkRecommendation(weather.temp)}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
