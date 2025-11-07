"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function CheckoutPage() {
  const [cart, setCart] = useState<any[]>([]);

  useEffect(() => {
    try {
      const raw =
        typeof window !== "undefined"
          ? window.localStorage.getItem("cart")
          : null;
      if (raw) setCart(JSON.parse(raw));
    } catch (e) {
      setCart([]);
    }
  }, []);

  const TAX_RATE = 0.085;
  const subtotal = cart.reduce((s, it) => s + Number(it.price || 0), 0);
  const tax = subtotal * TAX_RATE;
  const grandTotal = subtotal + tax;

  function removeAt(idx: number) {
    const next = cart.filter((_, i) => i !== idx);
    setCart(next);
    try {
      if (typeof window !== "undefined")
        window.localStorage.setItem("cart", JSON.stringify(next));
    } catch (e) {}
  }

  return (
    <div className="min-h-screen p-8 bg-background text-foreground">
      <div className="max-w-4xl mx-auto bg-white/70 backdrop-blur-md rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Checkout</h1>
          <Link href="/kiosk">
            <Button variant="outline">Back to Kiosk</Button>
          </Link>
        </div>

        <div className="space-y-4 mb-6">
          {cart.length === 0 ? (
            <div className="text-center text-muted-foreground">
              Your cart is empty
            </div>
          ) : (
            cart.map((item, idx) => (
              <div
                key={idx}
                className="flex justify-between items-center border-b py-3"
              >
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-sm text-gray-500">${item.price}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeAt(idx)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t pt-4 space-y-2 mb-6">
          <div className="flex justify-between text-lg">
            <span className="text-gray-600">Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg">
            <span className="text-gray-600">
              Tax ({(TAX_RATE * 100).toFixed(2)}%)
            </span>
            <span>${tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xl font-bold mt-2 pt-2 border-t">
            <span>Total</span>
            <span>${grandTotal.toFixed(2)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Button>Pay with Card</Button>
          <Button>Pay with Cash</Button>
          <Button>Pay with Mobile</Button>
        </div>

        <div className="flex justify-end">
          <Button className="w-full sm:w-auto">Complete Checkout</Button>
        </div>
      </div>
    </div>
  );
}
