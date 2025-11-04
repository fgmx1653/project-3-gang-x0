"use client";

import { Button } from "@/components/ui/button"
import Iridescence from '@/components/Iridescence';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
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

export default function Home() {

    const router = useRouter();

    // menuItems fetched from /api/menu
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [cart, setCart] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

        const user = getStoredUser();

        if (!user) router.push('/login');

        const m = user?.ismanager;
        const isManager = m === true || m === '1' || m === 1;

        if (isManager) router.push('/manager');

        getMenuItems();
    }, []);

    return (


        <div className='flex flex-col items-center justify-center gap-4 p-16 w-screen h-screen'>

            <div className='absolute left-4 top-4 flex flex-col gap-2'>
                <Link href='/'><Button>Home</Button></Link>
                <Button onClick={() => {
                    logoutClient();
                    router.push('/login');
                }}>Log out</Button>
            </div>

            <div className='absolute -z-20 w-full h-full'>
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
                        <CardTitle className='font-header text-3xl text-black bg-yellow-500/50'>Order (Employee)</CardTitle>
                    </CardHeader>
                    <CardContent>
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
                                <Button>Place Order</Button>
                            </CardFooter>
                        )
                    }
                </Card>

                <div className='grid grid-cols-4 gap-4'>
                    {menuItems.map((item) => (
                        <div key={item.id}>
                            <button onClick={() => {
                                // Create a unique cartId and do NOT mutate the original menu item
                                const cartId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
                                    ? (crypto as any).randomUUID()
                                    : `${item.id}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

                                const newItem = { ...item, cartId };
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
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}