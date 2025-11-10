"use client";

import { Button } from "@/components/ui/button";
import Iridescence from "@/components/Iridescence";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";

import { ScrollArea } from "@/components/ui/scroll-area";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Home() {
  // menuItems fetched from /api/menu
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  // subtotal, tax and grand total
  const TAX_RATE = 0.085; // assumed tax rate (8.5%) — change if needed
  const subtotal = cart.reduce((sum, item) => sum + Number(item.price || 0), 0);
  const tax = subtotal * TAX_RATE;
  const grandTotal = subtotal + tax;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState<string>("all");
  const [search, setSearch] = useState<string>("");

  // persist cart to localStorage so checkout page can read it
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("cart", JSON.stringify(cart));
      }
    } catch (e) {
      // ignore
    }
  }, [cart]);

  // rehydrate cart from localStorage when kiosk mounts so going back preserves progress
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const raw = window.localStorage.getItem("cart");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setCart(parsed);
        }
      }
    } catch (e) {
      // ignore parse errors
    }
  }, []);

  const router = useRouter();

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

  useEffect(() => {
    getMenuItems();
  }, []);

  function addToCart(item: any) {
    setCart((prev) => [...prev, item]);
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8 w-screen h-screen">
      <Link className="absolute left-4 top-4" href="/">
        <Button>Home</Button>
      </Link>

      <div className="absolute -z-20 w-full h-full">
        <Iridescence
          color={[1.0, 0.7, 0.7]}
          mouseReact={true}
          amplitude={0.1}
          speed={1.0}
        />
      </div>

      <Tabs defaultValue="all" value={tab} className="h-screen p-2 gap-4">
        <TabsList className="bg-white/60 backdrop-blur-md py-8 pe-4 rounded-xl">
          <TabsTrigger
            onClick={() => setTab("all")}
            className="p-7 rounded-lg"
            value="all"
          >
            All Drinks
          </TabsTrigger>
          <TabsTrigger
            onClick={() => setTab("milk")}
            className="p-7 rounded-lg"
            value="milk"
          >
            Milk Tea
          </TabsTrigger>
          <TabsTrigger
            onClick={() => setTab("green")}
            className="p-7 rounded-lg"
            value="green"
          >
            Green Tea
          </TabsTrigger>
          <TabsTrigger
            onClick={() => setTab("black")}
            className="p-7 rounded-lg"
            value="black"
          >
            Black Tea
          </TabsTrigger>
          <TabsTrigger
            onClick={() => setTab("seasonal")}
            className="p-7 rounded-lg"
            value="seasonal"
          >
            Seasonal
          </TabsTrigger>
          <Input
            value={search}
            type="text"
            onChange={(e) => {
              setSearch(e.target.value);
              if (search !== "") {
                setTab("all");
              }
            }}
            className="border-solid border-2 border-black/20 ms-2"
            placeholder="Search items..."
          />
        </TabsList>
        <ScrollArea className="relative max-h-[calc(100vh-220px)] overflow-auto w-full">
          <TabsContent value="all" className="pt-2 pe-4 pb-4">
            <div className="grid grid-cols-4 gap-4">
              {menuItems
                .filter((item) => item.name.includes(search))
                .map((item) => (
                  <Card
                    key={item.id}
                    onClick={() => addToCart(item)}
                    className="bg-white/60 backdrop-blur-md transform transition-transform duration-200 ease-in-out hover:-translate-y-1 hover:shadow-lg hover:bg-white cursor-pointer w-60 h-60"
                  >
                    <CardContent>
                      <div className="flex flex-col justify-between items-start">
                        <h1 className="font-deco font-bold">{item.name}</h1>
                        <h1 className="font-deco">${item.price}</h1>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>
          <TabsContent value="milk" className="pt-2 pe-4 pb-4">
            <div className="grid grid-cols-4 gap-4">
              {menuItems
                .filter((item) => item.name.includes("milk"))
                .map((item) => (
                  <Card
                    key={item.id}
                    onClick={() => addToCart(item)}
                    className="bg-white/60 backdrop-blur-md transform transition-transform duration-200 ease-in-out hover:-translate-y-1 hover:shadow-lg hover:bg-white cursor-pointer w-60 h-60"
                  >
                    <CardContent>
                      <div className="flex flex-col justify-between items-start">
                        <h1 className="font-deco font-bold">{item.name}</h1>
                        <h1 className="font-deco">${item.price}</h1>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>
          <TabsContent value="green" className="pt-2 pe-4 pb-4">
            <div className="grid grid-cols-4 gap-4">
              {menuItems
                .filter((item) => item.name.includes("green"))
                .map((item) => (
                  <Card
                    key={item.id}
                    onClick={() => addToCart(item)}
                    className="bg-white/60 backdrop-blur-md transform transition-transform duration-200 ease-in-out hover:-translate-y-1 hover:shadow-lg hover:bg-white cursor-pointer w-60 h-60"
                  >
                    <CardContent>
                      <div className="flex flex-col justify-between items-start">
                        <h1 className="font-deco font-bold">{item.name}</h1>
                        <h1 className="font-deco">${item.price}</h1>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>
          <TabsContent value="black" className="pt-2 pe-4 pb-4">
            <div className="grid grid-cols-4 gap-4">
              {menuItems
                .filter((item) => item.name.includes("black"))
                .map((item) => (
                  <Card
                    key={item.id}
                    onClick={() => addToCart(item)}
                    className="bg-white/60 backdrop-blur-md transform transition-transform duration-200 ease-in-out hover:-translate-y-1 hover:shadow-lg hover:bg-white cursor-pointer w-60 h-60"
                  >
                    <CardContent>
                      <div className="flex flex-col justify-between items-start">
                        <h1 className="font-deco font-bold">{item.name}</h1>
                        <h1 className="font-deco">${item.price}</h1>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>
          <TabsContent value="seasonal" className="pt-2 pe-4 pb-4">
            <div className="grid grid-cols-4 gap-4">
              {menuItems
                .filter((item) => item.seasonal === 1)
                .map((item) => (
                  <Card
                    key={item.id}
                    onClick={() => addToCart(item)}
                    className="bg-white/60 backdrop-blur-md transform transition-transform duration-200 ease-in-out hover:-translate-y-1 hover:shadow-lg hover:bg-white cursor-pointer w-60 h-60"
                  >
                    <CardContent>
                      <div className="flex flex-col justify-between items-start">
                        <h1 className="font-deco font-bold">{item.name}</h1>
                        <h1 className="font-deco">${item.price}</h1>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>

      <div className="absolute bottom-0 w-screen h-30 bg-white/60 backdrop-blur-md flex items-center justify-center shadow-lg gap-8">
        <h1 className="text-2xl font-bold">Subtotal: ${subtotal.toFixed(2)}</h1>
        <Button className="text-lg" onClick={() => setCartOpen(true)}>
          View Cart
        </Button>

        {/* Cart drawer with backdrop overlay */}
        {cartOpen && (
          <>
            {/* Semi-transparent backdrop */}
            <div
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
              onClick={() => setCartOpen(false)}
            />

            {/* Cart drawer panel */}
            <div className="fixed bottom-0 left-0 right-0 w-full bg-white shadow-xl p-6 h-[70vh] overflow-y-auto animate-slide-up z-50 rounded-t-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Your Cart</h2>
                <Button
                  onClick={() => setCartOpen(false)}
                  variant="outline"
                  className="rounded-full w-8 h-8 p-0"
                >
                  ✕
                </Button>
              </div>

              {/* Cart items with more spacing */}
              <div className="space-y-4 mb-8">
                {cart.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center border-b border-gray-100 py-3"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-lg">{item.name}</span>
                      <span className="text-gray-500">${item.price}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCart(cart.filter((_, i) => i !== idx));
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>

              {/* Totals section with better spacing */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-lg">
                  <span className="text-gray-600">Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span className="text-gray-600">
                    Tax ({(TAX_RATE * 100).toFixed()}%)
                  </span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold mt-2 pt-2 border-t">
                  <span>Total</span>
                  <span>${grandTotal.toFixed(2)}</span>
                </div>
                <div className="mt-6 flex justify-end">
                  <Button
                    onClick={() => {
                      try {
                        if (typeof window !== "undefined") {
                          window.localStorage.setItem(
                            "cart",
                            JSON.stringify(cart)
                          );
                        }
                      } catch (e) {}
                      // navigate to checkout screen (SPA)
                      router.push("/kiosk/checkout");
                    }}
                    className="ml-2"
                  >
                    Checkout
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* <Button className="text-lg">View Cart</Button> */}
      </div>
    </div>
  );
}
import { Button } from "@/components/ui/button"
import Iridescence from '@/components/Iridescence';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

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

import { ScrollArea } from "@/components/ui/scroll-area";

import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"

export default function Home() {

    // menuItems fetched from /api/menu
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [cart, setCart] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [tab, setTab] = useState<string>("all")
    const [search, setSearch] = useState<string>("");

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

    useEffect(() => {
        getMenuItems();
    }, []);

    return (


        <div className='flex flex-col items-center justify-center gap-4 p-8 w-screen h-screen'>

            <Link className='absolute left-4 top-4' href='/'><Button>Home</Button></Link>

            <div className='absolute -z-20 w-full h-full'>
                <Iridescence
                    color={[1.0, 0.7, 0.7]}
                    mouseReact={true}
                    amplitude={0.1}
                    speed={1.0}
                />
            </div>

            <Tabs defaultValue="all" value={tab} className='h-screen p-2 gap-4'>
                <TabsList className='bg-white/60 backdrop-blur-md py-8 pe-4 rounded-xl'>
                    <TabsTrigger onClick={()=>setTab("all")} className='p-7 rounded-lg' value="all">All Drinks</TabsTrigger>
                    <TabsTrigger onClick={()=>setTab("milk")} className='p-7 rounded-lg' value="milk">Milk Tea</TabsTrigger>
                    <TabsTrigger onClick={()=>setTab("green")} className='p-7 rounded-lg' value="green">Green Tea</TabsTrigger>
                    <TabsTrigger onClick={()=>setTab("black")} className='p-7 rounded-lg' value="black">Black Tea</TabsTrigger>
                    <TabsTrigger onClick={()=>setTab("seasonal")} className='p-7 rounded-lg' value="seasonal">Seasonal</TabsTrigger>
                    <Input value={search} type='text' onChange={(e) => {
                        setSearch(e.target.value);
                        if (search !== "") {
                            setTab("all");
                        }
                    } } className='border-solid border-2 border-black/20 ms-2' placeholder="Search items..."/>
                </TabsList>
                <ScrollArea className='relative h-158'>

                    <TabsContent value="all" className='pt-2 pe-4 pb-4'>
                        <div className='grid grid-cols-4 gap-4'>
                            {menuItems
                                .filter(item => item.name.includes(search))
                                .map((item) => (
                                    <Card key={item.id} className='bg-white/60 backdrop-blur-md transform transition-transform duration-200 ease-in-out hover:-translate-y-1 hover:shadow-lg hover:bg-white hover:cursor-pointer w-60 h-60'>
                                        <CardContent>
                                            <div className='flex flex-col justify-between items-start'>
                                                <h1 className='font-deco font-bold'>{item.name}</h1>
                                                <h1 className='font-deco'>${item.price}</h1>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                        </div>
                    </TabsContent>
                    <TabsContent value="milk" className='pt-2 pe-4 pb-4'>
                        <div className='grid grid-cols-4 gap-4'>
                            {menuItems
                                .filter(item => item.name.includes("milk"))
                                .map((item) => (
                                    <Card key={item.id} className='bg-white/60 backdrop-blur-md transform transition-transform duration-200 ease-in-out hover:-translate-y-1 hover:shadow-lg hover:bg-white hover:cursor-pointer w-60 h-60'>
                                        <CardContent>
                                            <div className='flex flex-col justify-between items-start'>
                                                <h1 className='font-deco font-bold'>{item.name}</h1>
                                                <h1 className='font-deco'>${item.price}</h1>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                        </div>
                    </TabsContent>
                    <TabsContent value="green" className='pt-2 pe-4 pb-4'>
                        <div className='grid grid-cols-4 gap-4'>
                            {menuItems
                                .filter(item => item.name.includes("green"))
                                .map((item) => (
                                    <Card key={item.id} className='bg-white/60 backdrop-blur-md transform transition-transform duration-200 ease-in-out hover:-translate-y-1 hover:shadow-lg hover:bg-white hover:cursor-pointer w-60 h-60'>
                                        <CardContent>
                                            <div className='flex flex-col justify-between items-start'>
                                                <h1 className='font-deco font-bold'>{item.name}</h1>
                                                <h1 className='font-deco'>${item.price}</h1>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                        </div>
                    </TabsContent>
                    <TabsContent value="black" className='pt-2 pe-4 pb-4'>
                        <div className='grid grid-cols-4 gap-4'>
                            {menuItems
                                .filter(item => item.name.includes("black"))
                                .map((item) => (
                                    <Card key={item.id} className='bg-white/60 backdrop-blur-md transform transition-transform duration-200 ease-in-out hover:-translate-y-1 hover:shadow-lg hover:bg-white hover:cursor-pointer w-60 h-60'>
                                        <CardContent>
                                            <div className='flex flex-col justify-between items-start'>
                                                <h1 className='font-deco font-bold'>{item.name}</h1>
                                                <h1 className='font-deco'>${item.price}</h1>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                        </div>
                    </TabsContent>
                    <TabsContent value="seasonal" className='pt-2 pe-4 pb-4'>
                        <div className='grid grid-cols-4 gap-4'>
                            {menuItems
                                .filter(item => item.seasonal === 1)
                                .map((item) => (
                                    <Card key={item.id} className='bg-white/60 backdrop-blur-md transform transition-transform duration-200 ease-in-out hover:-translate-y-1 hover:shadow-lg hover:bg-white hover:cursor-pointer w-60 h-60'>
                                        <CardContent>
                                            <div className='flex flex-col justify-between items-start'>
                                                <h1 className='font-deco font-bold'>{item.name}</h1>
                                                <h1 className='font-deco'>${item.price}</h1>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                        </div>
                    </TabsContent>
                </ScrollArea>
            </Tabs>

            <div className='absolute bottom-0 w-screen h-30 bg-white/60 backdrop-blur-md flex items-center justify-center shadow-lg gap-8'>
                <h1 className='text-2xl font-deco font-bold'>Total: $0.00</h1>
                <Button className='text-lg'>View Cart</Button>
            </div>
            
        </div>
    );
}
