"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type Props = {
  encodedData?: string | null;
};

export default function OrderConfirmationClient({ encodedData }: Props) {
  const [orderData, setOrderData] = useState<any>(null);

  useEffect(() => {
    try {
      if (encodedData) {
        setOrderData(JSON.parse(decodeURIComponent(encodedData)));
        return;
      }

      // Fallback: read lastOrder from localStorage (used when navigating from checkout without query string)
      if (typeof window !== 'undefined') {
        const raw = window.localStorage.getItem('lastOrder');
        if (raw) {
          try {
            setOrderData(JSON.parse(raw));
            // Optionally clear it after reading so refresh doesn't show it again
            window.localStorage.removeItem('lastOrder');
            return;
          } catch (e) {
            console.error('Failed to parse lastOrder from localStorage', e);
          }
        }
      }
    } catch (e) {
      console.error("Failed to parse order data:", e);
    }
  }, [encodedData]);

  if (!orderData) {
    return (
      <div className="min-h-screen p-8 bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl mb-4">No order data found</p>
          <Link href="/kiosk">
            <Button>Return to Kiosk</Button>
          </Link>
        </div>
      </div>
    );
  }

  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen p-8 bg-background text-foreground">
      <div className="max-w-2xl mx-auto bg-white/70 backdrop-blur-md rounded-lg p-8">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">✓</div>
          <h1 className="text-3xl font-bold text-green-600 mb-2">Order Placed!</h1>
          <p className="text-gray-600">Thank you for your order</p>
        </div>

        <div className="border-t border-b py-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Order Details</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Order Number:</span>
              <span className="font-medium">#{orderData.orderId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Date:</span>
              <span className="font-medium">{currentDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Payment Method:</span>
              <span className="font-medium capitalize">{orderData.paymentType || "Not specified"}</span>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Items</h2>
          <div className="space-y-3">
            {orderData.items?.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center py-2 border-b">
                <div>
                  <div className="font-medium">{item.name}</div>
                </div>
                <div className="font-medium">${Number(item.price).toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t pt-4 space-y-2 mb-8">
          <div className="flex justify-between text-lg">
            <span className="text-gray-600">Subtotal</span>
            <span>${orderData.subtotal?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg">
            <span className="text-gray-600">Tax (8.50%)</span>
            <span>${orderData.tax?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-2xl font-bold mt-2 pt-2 border-t">
            <span>Total</span>
            <span>${orderData.total?.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex justify-center">
          <Link href="/kiosk">
            <Button className="w-full sm:w-auto">Return to Kiosk</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
