"use client";

import { Button } from "@/components/ui/button"
import Iridescence from '@/components/Iridescence';
import Link from 'next/link';

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
import { pool } from '@/lib/db';
import { useState, useEffect } from 'react';

export default function Home() {
  const [menuItems, setMenuItems] = useState<any[]>([]);
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
          getMenuItems();
      }, []);



  return (
    // Give the iridescence canvas a visible size. The component itself uses `w-full h-full`,
    // so we provide a full-screen container here. Replace `h-screen` with a smaller height
    // if you want it to be partial.

    <div className='flex flex-col items-center justify-center gap-4 p-16 w-screen h-screen'>

      <Link className='absolute left-4 top-4' href='/'><Button>Home</Button></Link>

      <div className='absolute -z-20 w-full h-full'>
        <Iridescence
          color={[1.0, 0.7, 0.7]}
          mouseReact={false}
          amplitude={0.1}
          speed={1.0}
        />
      </div>

      <div className="flex flex-row gap-8">

        <Card className='bg-white/60 backdrop-blur-md flex flex-row gap-2 ps-6'>
          <div className="flex flex-col items-start justify-center gap-24">
            <img src="/img/milk_tea.png" alt="Image of milk tea" width={70} className='rotate-10 drop-shadow-[4px_16px_10px_rgba(176,157,130,0.75)]' />
            <img src="/img/thai_tea.png" alt="Image of Thai tea" width={70} className='-rotate-10 drop-shadow-[-4px_16px_10px_rgba(184,126,90,0.75)]' />
            <img src="/img/hok_tea.png" alt="Image of Hok tea" width={70} className='rotate-10 drop-shadow-[4px_16px_10px_rgba(153,128,94,0.75)]' />
          </div>
          <div>
            <CardHeader>
              <CardTitle className='font-header text-3xl text-black bg-yellow-500/50'>Milk Tea</CardTitle>
              <CardDescription className='text-black/25 font-deco font-bold'>Our delicious selection of milk teas</CardDescription>
            </CardHeader>
            <CardContent className='pt-7'>
              {menuItems
                .filter(item => item.name.includes('milk') && !item.name.includes('green') && item.id < 24)
                .map((item) => (
                  <div key={item.id} className="mb-4 flex flex-row justify-between items-start gap-10">
                    <h2 className="text-lg font-bold font-deco">{item.name}</h2>
                    <p className="text-lg font-bold font-deco text-black/25">${item.price}</p>
                  </div>
                ))}
            </CardContent>
          </div>
        </Card>

        <Card className='bg-white/60 backdrop-blur-md '>
          <CardHeader>
            <CardTitle className='font-header text-3xl text-black bg-yellow-500/50'>Green & Black Tea</CardTitle>
            <CardDescription className='text-black/25 font-deco font-bold'>Our refreshing green and black teas</CardDescription>
          </CardHeader>
          <CardContent>
            {menuItems
              .filter(item => (item.name.includes('green') || item.name.includes('black')) && !item.name.includes('milk') && item.id < 24)
              .map((item) => (
                <div key={item.id} className="mb-4 flex flex-row justify-between items-start gap-10">
                  <h2 className="text-lg font-bold font-deco">{item.name}</h2>
                  <p className="text-lg font-bold font-deco text-black/25">${item.price}</p>
                </div>
              ))}
              <div className='flex flex-col justify-between place-items-start -rotate-10 drop-shadow-[4px_16px_10px_rgba(176,104,7,0.5)] ps-10 mt-5'>
                <img src="/img/mango_tea.png" alt="Image of mango black tea" width={70} className='' />
              </div>
              <div className='flex flex-col justify-between place-items-end rotate-10 drop-shadow-[4px_16px_10px_rgba(176,104,7,0.5)] pe-10 -mt-10'>
                <img src="/img/passion_tea.png" alt="Image of passion fruit black tea" width={70} className='' />
              </div>
          </CardContent>
        </Card>

        <Card className='bg-white/60 backdrop-blur-lg'>
          <CardHeader>
            <CardTitle className='font-header text-3xl text-white bg-red-500'>Seasonal</CardTitle>
            <CardDescription className='font-deco text-black/25 font-bold'>Just in time for fall</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='flex flex-col justify-between place-items-start -rotate-10 drop-shadow-[4px_16px_10px_rgba(168,25,8,0.6)] ps-4 '>
              <img src="/img/apple_tea.png" alt="Image of apple black tea" width={120} className='border-4 border-double border-red-400/50 rounded-3xl p-4' />
            </div>
            <div className='flex flex-col justify-between place-items-end rotate-10 drop-shadow-[4px_16px_10px_rgba(176,157,130,1.0)] pe-4 pt-8'>
              <img src="/img/black_coffee.png" alt="Image of black coffee" width={120} className='border-4 border-double border-red-400/50 rounded-3xl p-4' />
            </div>
            <div className='pt-16'>
              {menuItems
                .filter(item => item.id > 23)
                .map((item) => (
                  <div key={item.id} className="mb-4 flex flex-row justify-between items-start gap-10">
                    <h2 className="text-lg font-bold font-deco">{item.name}</h2>
                    <p className="text-lg font-bold font-deco text-black/25">${item.price}</p>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>


      </div>


    </div>
  );
}