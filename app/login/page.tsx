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

import { signIn } from "next-auth/react";
import { translateText } from '@/lib/translate';


export default function Home() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [checkingSession, setCheckingSession] = useState(true);
    const [lang, setLang] = useState('en');
    const [loginLabel, setLoginLabel] = useState('Login');
    const [continueWithGoogleLabel, setContinueWithGoogleLabel] = useState('Continue with Google');

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
        // First, check if we already have an Auth.js session; if so, bootstrap localStorage
        (async () => {
            try {
                const res = await fetch('/api/auth/session', { cache: 'no-store' });
                if (res.ok) {
                    const session = await res.json();
                    if (session?.user) {
                        const m = (session.user as any).ismanager;
                        const isManager = m === true || m === '1' || m === 1;
                        const userPayload = {
                            id: (session.user as any).id,
                            name: session.user.name,
                            username: session.user.name,
                            ismanager: isManager,
                        };
                        localStorage.setItem('user', JSON.stringify(userPayload));
                        localStorage.setItem('isLoggedIn', '1');
                        router.push(isManager ? '/manager' : '/employee');
                        return;
                    }
                }
            } catch (_) {
                // Ignore network errors; fall back to localStorage check
            }

            // Fallback: respect any existing localStorage session
            const user = getStoredUser();
            if (user) {
                const m = user?.ismanager;
                const isManager = m === true || m === '1' || m === 1;
                router.push(isManager ? '/manager' : '/employee');
            }
            setCheckingSession(false);
        })();
    }, [router]);
    
    useEffect(() => {
        async function translateLabels() {
            setLoginLabel(await translateText('Login', lang));
            setContinueWithGoogleLabel(await translateText('Continue with Google', lang));
        }
        translateLabels();
    }, [lang]);
    
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
                    <CardTitle>{loginLabel}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className='flex flex-col gap-2'>
                        <Input className='border-black/25' placeholder="Username" value={username} onChange={(e) => setUsername((e.target as HTMLInputElement).value)} />
                        <Input className='border-black/25' placeholder="Password" type="password" value={password} onChange={(e) => setPassword((e.target as HTMLInputElement).value)} />
                        <Button
                            variant="outline"
                            type="button"
                            onClick={() => {
                                signIn("google", { callbackUrl: "/login" });
                            }}
                        >
                            {continueWithGoogleLabel}
                        </Button>
                        {error && <p className="text-sm text-black">{error}</p>}
                    </div>
                </CardContent>
                <CardFooter>
                    <Button className='w-full' disabled={loading || checkingSession} onClick={async () => {
                        const result = await checkLogin(username, password);
                        if (result.ok) {
                            // router.push('/menu');
                            router.push(result.isManager ? '/manager' : '/employee');
                        }
                        {/* Example language selector for demo */ }
                    }}>{loading ? 'Signing in...' : 'Log in'}</Button>
                    <div className='absolute right-4 top-4'>
                        <select value={lang} onChange={e => setLang(e.target.value)}>
                            <option value='en'>English</option>
                            <option value='es'>Español</option>
                            <option value='fr'>Français</option>
                            <option value='zh'>中文</option>
                            <option value='de'>Deutsch</option>
                        </select>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}