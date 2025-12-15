"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

import { translateText } from '@/lib/translate';
import { useLanguage } from "@/lib/LanguageContext";

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [cart, setCart] = useState<any[]>([]);
  const [translatedCart, setTranslatedCart] = useState<any[]>([]);
  const [paymentType, setPaymentType] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [specialInstructions, setSpecialInstructions] = useState<string>("");

  const { lang, setLang } = useLanguage();

  const [bobaLabel, setBobaLabel] = useState('Boba');
    const [iceLabel, setIceLabel] = useState('Ice');
    const [sugarLabel, setSugarLabel] = useState('Sugar');
    const [emptyCartLabel, setEmptyCartLabel] = useState('Your cart is empty');
    const [checkoutLabel, setCheckoutLabel] = useState('Checkout');
    const [backToKioskLabel, setBackToKioskLabel] = useState('Back to Kiosk');
    const [subtotalLabel, setSubtotalLabel] = useState('Subtotal');
    const [totalLabel, setTotalLabel] = useState('Total');
    const [removeLabel, setRemoveLabel] = useState('Remove');
    const [taxLabel, setTaxLabel] = useState('Tax');
    const [paymentMethodAlertLabel, setPaymentMethodAlertLabel] = useState('Please select a payment method before completing checkout.');
    const [confirmationAlertLabel, setConfirmationAlertLabel] = useState('Are you sure you want to place this order?\n\nTotal:');
    const [failedOrderAlertLabel, setFailedOrderAlertLabel] = useState("Failed to create order. Please try again.");
    const [payWithCardLabel, setPayWithCardLabel] = useState('Pay with Card');
    const [payWithCashLabel, setPayWithCashLabel] = useState('Pay with Cash');
    const [payWithMobileLabel, setPayWithMobileLabel] = useState('Pay with Mobile');
    const [completeCheckoutLabel, setCompleteCheckoutLabel] = useState('Complete Checkout');
    const [specialInstructionsLabel, setSpecialInstructionsLabel] = useState('Special Instructions (Optional)');
    const [instructionsPlaceholderLabel, setInstructionsPlaceholderLabel] = useState('Add any special requests or dietary notes...');
    const [signedInAsLabel, setSignedInAsLabel] = useState('Signed in as');
    const [rewardPointsLabel, setRewardPointsLabel] = useState('Reward Points');
    const [signOutLabel, setSignOutLabel] = useState('Sign Out');

    const handleLangChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      setLang(e.target.value);
    };

    useEffect(() => {
      async function translateLabels() {
          setBobaLabel(await translateText('Boba', lang));
          setIceLabel(await translateText('Ice', lang));
          setSugarLabel(await translateText('Sugar', lang));
          setEmptyCartLabel(await translateText('Your cart is empty', lang));
          setCheckoutLabel(await translateText('Checkout', lang));
          setBackToKioskLabel(await translateText('Back to Kiosk', lang));
          setSubtotalLabel(await translateText('Subtotal', lang));
          setTotalLabel(await translateText('Total', lang));
          setRemoveLabel(await translateText('Remove', lang));
          setTaxLabel(await translateText('Tax', lang));
          setPaymentMethodAlertLabel(await translateText('Please select a payment method before completing checkout.', lang));
          setConfirmationAlertLabel(await translateText('Are you sure you want to place this order?\n\nTotal:', lang));
          setFailedOrderAlertLabel(await translateText("Failed to create order. Please try again.", lang));
          setPayWithCardLabel(await translateText('Pay with Card', lang));
          setPayWithCashLabel(await translateText('Pay with Cash', lang));
          setPayWithMobileLabel(await translateText('Pay with Mobile', lang));
          setCompleteCheckoutLabel(await translateText('Complete Checkout', lang));
          setSpecialInstructionsLabel(await translateText('Special Instructions (Optional)', lang));
          setInstructionsPlaceholderLabel(await translateText('Add any special requests or dietary notes...', lang));
          setSignedInAsLabel(await translateText('Signed in as', lang));
          setRewardPointsLabel(await translateText('Reward Points', lang));
          setSignOutLabel(await translateText('Sign Out', lang));

      }
      translateLabels();
    }, [lang]);

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
              toppings: it?.toppings ?? [],
              redeemed: it?.redeemed ?? false,
              pointsValue: it?.pointsValue ?? 0,
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
  const subtotal = cart.reduce((s, it) => {
    // Redeemed items are free
    if (it.redeemed) return s;
    const base = Number(it.price || 0);
    const size = Number(it.size || 1);
    const extra = Math.max(0, size - 1);
    const toppingTotal = (it.toppings || []).reduce((t: number, top: any) => t + Number(top.price || 0), 0);
    return s + base + extra + toppingTotal;
  }, 0);
  const tax = subtotal * TAX_RATE;
  const grandTotal = subtotal + tax;
  
  // Calculate total points being redeemed
  const totalPointsToRedeem = cart.reduce((sum, it) => {
    if (it.redeemed && it.pointsValue) {
      return sum + Number(it.pointsValue);
    }
    return sum;
  }, 0);

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
      alert(paymentMethodAlertLabel);
      return;
    }

    const confirmed = window.confirm(
      `${confirmationAlertLabel} $${grandTotal.toFixed(
        2
      )}`
    );

    if (confirmed) {
      setIsSubmitting(true);
      setSubmitError(null);

      try {
        // Submit order to database with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

        const response = await fetch("/api/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            items: cart,
            specialInstructions: specialInstructions.trim() || null,
            // No employeeId for customer kiosk orders (will be NULL)
            customerId: session?.user ? (session.user as any).id : -1,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status >= 500) {
            throw new Error("Server error. Please try again or contact staff for assistance.");
          } else if (response.status >= 400) {
            const result = await response.json();
            throw new Error(result.error || "Invalid order data. Please check your cart and try again.");
          }
        }

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
          specialInstructions: specialInstructions.trim() || null,
        };

        // Clear the cart
        setCart([]);
        try {
          if (typeof window !== "undefined") {
            window.localStorage.removeItem("cart");
          }
        } catch (e) {
          console.warn('Failed to clear cart from localStorage', e);
        }

        // Save order to localStorage and navigate to confirmation page without putting large JSON in the URL.
        try {
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('lastOrder', JSON.stringify(orderData));
          }
        } catch (e) {
          console.warn('Failed to store order in localStorage', e);
        }

        router.push('/kiosk/order-confirmation');
      } catch (error: any) {
        console.error("Error creating order:", error);

        let errorMessage = failedOrderAlertLabel;
        if (error.name === 'AbortError') {
          errorMessage = "Request timeout. Please check your connection and try again.";
        } else if (error.message) {
          errorMessage = error.message;
        }

        setSubmitError(errorMessage);
        alert(errorMessage);
      } finally {
        setIsSubmitting(false);
      }
    }
  }

      useEffect(() => {
        async function translateCartNames() {
            if (!cart.length) {
                setTranslatedCart([]);
                return;
            }
            try {
                const translated = await Promise.all(
                    cart.map(async item => {
                        try {
                            const translatedName = await translateText(item.name, lang);
                            return {
                                ...item,
                                name: translatedName
                            };
                        } catch (error) {
                            console.warn(`Failed to translate "${item.name}", using original`, error);
                            return item; // Fallback to original if translation fails
                        }
                    })
                );
                setTranslatedCart(translated);
            } catch (error) {
                console.error('Cart translation error:', error);
                setTranslatedCart(cart); // Fallback to untranslated cart
            }
        }
        translateCartNames();
    }, [cart, lang]);


  return (
    <div className="min-h-screen p-8 bg-background text-foreground">
      <Link className='absolute top-8 left-8' href="/kiosk">
        <Button variant="outline">← {backToKioskLabel}</Button>
      </Link>
      <div className="max-w-4xl mx-auto bg-white/70 backdrop-blur-md rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{checkoutLabel}</h1>
        </div>

        {/* Show signed-in status if user is logged in (sign-in moved to main kiosk page) */}
        {session?.user && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="font-medium">
                  {signedInAsLabel}: {session.user.name}
                </p>
                <p className="text-sm text-gray-600">
                  {rewardPointsLabel}: {(session.user as any).points ?? 0}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => signOut({ redirect: false })}
              >
                {signOutLabel}
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-4 mb-6">
          {cart.length === 0 ? (
            <div className="text-center text-muted-foreground">
              {emptyCartLabel}
            </div>
          ) : (
            cart.map((item, idx) => (
              <div
                key={idx}
                className={`flex justify-between items-center border-b py-3 ${item.redeemed ? 'bg-purple-50 -mx-4 px-4 rounded' : ''}`}
              >
                <div>
                  <div className="font-medium">
                    {translatedCart[idx]?.name || item.name}
                    {item.redeemed && (
                      <span className="ml-2 text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full">
                        Redeemed
                      </span>
                    )}
                  </div>
                      {item.redeemed ? (
                        <div className="text-purple-600 font-bold">FREE <span className="font-normal text-sm">(-{item.pointsValue} pts)</span></div>
                      ) : (
                        <div className="text-sm text-gray-500">${(Number(item.price || 0) + Math.max(0, Number(item.size || 1) - 1)).toFixed(2)}</div>
                      )}
                      <div className="text-sm text-gray-500">
                        Size: {Number(item.size || 1) === 1 ? 'Small' : Number(item.size || 1) === 2 ? 'Medium' : 'Large'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {item.boba}% {bobaLabel}
                        <br />
                        {item.ice}% {iceLabel}
                        <br />
                        {item.sugar}% {sugarLabel}
                      </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeAt(idx)}
                  >
                    {removeLabel}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t pt-4 space-y-2 mb-6">
          <div className="flex justify-between text-lg">
            <span className="text-foreground-muted">{subtotalLabel}</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg">
            <span className="text-foreground-muted">
              {taxLabel} ({(TAX_RATE * 100).toFixed(2)}%)
            </span>
            <span>${tax.toFixed(2)}</span>
          </div>
          {totalPointsToRedeem > 0 && (
            <div className="flex justify-between text-lg text-purple-600">
              <span>Points Redeemed</span>
              <span>-{totalPointsToRedeem} pts</span>
            </div>
          )}
          <div className="flex justify-between text-xl font-bold mt-2 pt-2 border-t">
            <span>{totalLabel}</span>
            <span>${grandTotal.toFixed(2)}</span>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            {specialInstructionsLabel}
          </label>
          <textarea
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            rows={3}
            placeholder={instructionsPlaceholderLabel}
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            maxLength={500}
          />
          <div className="text-xs text-gray-500 mt-1 text-right">
            {specialInstructions.length}/500
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
            {payWithCardLabel}
          </Button>
          <Button
            variant={paymentType === "cash" ? "default" : "outline"}
            onClick={() => setPaymentType("cash")}
            className={
              paymentType !== null && paymentType !== "cash" ? "opacity-50" : ""
            }
          >
            {payWithCashLabel}
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
            {payWithMobileLabel}
          </Button>
        </div>

        {/* Error Display */}
        {submitError && (
          <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg mb-4">
            <p className="text-red-700 font-semibold">{submitError}</p>
          </div>
        )}

        <div className="flex justify-end">
          <Button
            className="w-full sm:w-auto"
            onClick={handleCompleteCheckout}
            disabled={cart.length === 0 || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="inline-block animate-spin mr-2">⏳</span>
                Processing...
              </>
            ) : (
              completeCheckoutLabel
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
