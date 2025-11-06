"use client";

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