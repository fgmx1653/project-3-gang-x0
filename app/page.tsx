"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import ClearCartOnMount from "@/components/ClearCartOnMount";
import { Button } from "@/components/ui/button";
import Link from "next/link";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function Home() {
  const contentRef = useRef<HTMLDivElement>(null);

  // Ensure content is visible when page loads, especially when magnified
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollIntoView({ behavior: 'instant', block: 'center' });
    }
  }, []);

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 p-8">
      <div ref={contentRef} className="flex flex-col items-center gap-4">
        {/* Clear any existing kiosk cart when landing on the home page */}
        <ClearCartOnMount />
        <div className="flex flex-row gap-4 items-center">
          <img src="/logo.png" alt="Boba Shop Logo" width={50} />
          <h1 className="font-bold text-xl font-mono">gang_x0 dev portal</h1>
        </div>
        <div className="flex flex-row gap-4 flex-wrap justify-center">
          <Link href="/menu">
            <Button className="hover:cursor-pointer">Menu Display</Button>
          </Link>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/kiosk">
                <Button className="hover:cursor-pointer">Customer Kiosk</Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>
              <p>Yet to implement cart functionality</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/login">
                <Button className="hover:cursor-pointer">
                  Employees/Managers
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                Includes authentication and redirects for appropriate user; yet to
                implement manager dashboard and proper order submission
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
