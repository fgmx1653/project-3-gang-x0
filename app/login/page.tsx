"use client";

import Image from 'next/image';
import Iridescence from '@/components/Iridescence';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser } from '@/lib/clientAuth';

import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"


export default function Home() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function checkLogin(username: string, password: string) {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const data = await res.json();
            setLoading(false);

            if (res.ok && data.ok) {
                // Normalize manager value: DB might store it as boolean, integer or string ('1')
                const m = data.user?.ismanager;
                const isManager = m === true || m === '1' || m === 1;
                // Return manager status to caller to avoid reading stale state immediately after setState

                localStorage.setItem('user', JSON.stringify(data.user));
                localStorage.setItem('isLoggedIn', '1');

                return { ok: true, isManager };
            }

            setError(data?.error || 'Login failed');
            return { ok: false };
        } catch (err) {
            console.error('Login request failed', err);
            setError('Network error');
            setLoading(false);
            return { ok: false };
        }
    }

    useEffect(() => {
        const user = getStoredUser();

        if (user) {
            const m = user?.ismanager;
            const isManager = m === true || m === '1' || m === 1;

            if (isManager) {
                router.push('/manager');
            } else {
                router.push('/employee');
            }
        }

    })

    return (
        <div className='flex h-screen items-center justify-center'>

            <Link className='absolute left-4 top-4' href='/'><Button>Home</Button></Link>

            <div className='absolute -z-20 w-full h-full'>
                <Iridescence
                    color={[1.0, 0.7, 0.7]}
                    mouseReact={false}
                    amplitude={0.1}
                    speed={1.0}
                />
            </div>

            <Card className='flex w-80 bg-white/60 backdrop-blur-md'>
                <CardHeader>
                    <CardTitle>Login</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className='flex flex-col gap-2'>
                        <Input className='border-black/25' placeholder="Username" value={username} onChange={(e) => setUsername((e.target as HTMLInputElement).value)} />
                        <Input className='border-black/25' placeholder="Password" type="password" value={password} onChange={(e) => setPassword((e.target as HTMLInputElement).value)} />
                        {error && <p className="text-sm text-black">{error}</p>}
                    </div>
                </CardContent>
                <CardFooter>
                    <Button className='w-full' disabled={loading} onClick={async () => {
                        const result = await checkLogin(username, password);
                        if (result.ok) {
                            // router.push('/menu');
                            router.push(result.isManager ? '/manager' : '/employee');
                        }
                    }}>{loading ? 'Signing in...' : 'Log in'}</Button>
                </CardFooter>
            </Card>
        </div>
    );
}