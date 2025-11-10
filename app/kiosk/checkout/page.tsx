"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<any[]>([]);
  const [paymentType, setPaymentType] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw =
        typeof window !== "undefined"
          ? window.localStorage.getItem("cart")
          : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setCart(
            parsed.map((it: any) => ({
              ...it,
              boba: it?.boba ?? 100,
              ice: it?.ice ?? 100,
              sugar: it?.sugar ?? 100,
            }))
          );
        } else {
          setCart(parsed);
        }
      }
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

  async function handleCompleteCheckout() {
    // Check if payment type is selected
    if (!paymentType) {
      alert("Please select a payment method before completing checkout.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to place this order?\n\nTotal: $${grandTotal.toFixed(
        2
      )}`
    );

    if (confirmed) {
      try {
        // Submit order to database
        const response = await fetch("/api/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            items: cart,
            // No employeeId for customer kiosk orders (will be NULL)
          }),
        });

        const result = await response.json();

        if (!result.ok) {
          throw new Error(result.error || "Failed to create order");
        }

        // Prepare order data for confirmation page
        const orderData = {
          items: cart,
          subtotal: subtotal,
          tax: tax,
          total: grandTotal,
          paymentType: paymentType,
          orderId: result.orderId,
        };

        // Clear the cart
        setCart([]);
        try {
          if (typeof window !== "undefined") {
            window.localStorage.removeItem("cart");
          }
        } catch (e) {}

        // Navigate to order confirmation page
        const encodedData = encodeURIComponent(JSON.stringify(orderData));
        router.push(`/kiosk/order-confirmation?data=${encodedData}`);
      } catch (error) {
        console.error("Error creating order:", error);
        alert("Failed to create order. Please try again.");
      }
    }
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
                  <div className="text-sm text-gray-500">
                    {item.boba}% Boba
                    <br />
                    {item.ice}% Ice
                    <br />
                    {item.sugar}% Sugar
                  </div>
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
          <Button
            variant={paymentType === "card" ? "default" : "outline"}
            onClick={() => setPaymentType("card")}
            className={
              paymentType !== null && paymentType !== "card" ? "opacity-50" : ""
            }
          >
            Pay with Card
          </Button>
          <Button
            variant={paymentType === "cash" ? "default" : "outline"}
            onClick={() => setPaymentType("cash")}
            className={
              paymentType !== null && paymentType !== "cash" ? "opacity-50" : ""
            }
          >
            Pay with Cash
          </Button>
          <Button
            variant={paymentType === "mobile" ? "default" : "outline"}
            onClick={() => setPaymentType("mobile")}
            className={
              paymentType !== null && paymentType !== "mobile"
                ? "opacity-50"
                : ""
            }
          >
            Pay with Mobile
          </Button>
        </div>

        <div className="flex justify-end">
          <Button
            className="w-full sm:w-auto"
            onClick={handleCompleteCheckout}
            disabled={cart.length === 0}
          >
            Complete Checkout
          </Button>
        </div>
      </div>
    </div>
  );
}
