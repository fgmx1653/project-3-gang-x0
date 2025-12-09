"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { jsPDF } from "jspdf";

import { translateText } from '@/lib/translate';
import { useLanguage } from "@/lib/LanguageContext";

type Props = {
  encodedData?: string | null;
};

export default function OrderConfirmationClient({ encodedData }: Props) {
  const [orderData, setOrderData] = useState<any>(null);

  const { lang, setLang } = useLanguage();
  const [translatedOrderData, setTranslatedOrderData] = useState<any>(null);
  const [missingOrderDataLabel, setMissingOrderDataLabel] = useState('No order data found.');
  const [backToKioskLabel, setBackToKioskLabel] = useState('Back to Kiosk');
  const [orderPlacedLabel, setOrderPlacedLabel] = useState('Order Placed!');
  const [thankYouLabel, setThankYouLabel] = useState('Thank you for your order.');
  const [orderDetailsLabel, setOrderDetailsLabel] = useState('Order Details');
  const [orderNumberLabel, setOrderNumberLabel] = useState('Order Number');
  const [dateLabel, setDateLabel] = useState('Date');
  const [paymentMethodLabel, setPaymentMethodLabel] = useState('Payment Method');
  const [paymentTypeLabel, setPaymentTypeLabel] = useState('');
  const [itemsLabel, setItemsLabel] = useState('Items');
  const [subtotalLabel, setSubtotalLabel] = useState('Subtotal');
    const [totalLabel, setTotalLabel] = useState('Total');
    const [taxLabel, setTaxLabel] = useState('Tax');
    const [specialInstructionsLabel, setSpecialInstructionsLabel] = useState('Special Instructions');
    const [downloadReceiptLabel, setDownloadReceiptLabel] = useState('Download Receipt');

  const handleLangChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLang(e.target.value);
  };

  useEffect(() => {
      async function translateLabels() {
        setMissingOrderDataLabel(await translateText('No order data found.', lang));
        setBackToKioskLabel(await translateText('Back to Kiosk', lang));
        setOrderPlacedLabel(await translateText('Order Placed!', lang));
        setThankYouLabel(await translateText('Thank you for your order.', lang));
        setOrderDetailsLabel(await translateText('Order Details', lang));
        setOrderNumberLabel(await translateText('Order Number', lang));
        setDateLabel(await translateText('Date', lang));
        setPaymentMethodLabel(await translateText('Payment Method', lang));
        if (orderData?.paymentType) {
          setPaymentTypeLabel(await translateText(orderData.paymentType, lang));
        } else {
          setPaymentTypeLabel(await translateText('Not specified', lang));
        }
        setItemsLabel(await translateText('Items', lang));
        setSubtotalLabel(await translateText('Subtotal', lang));
        setTotalLabel(await translateText('Total', lang));
        setTaxLabel(await translateText('Tax', lang));
        setSpecialInstructionsLabel(await translateText('Special Instructions', lang));
        setDownloadReceiptLabel(await translateText('Download Receipt', lang));
      }
      translateLabels();
    }, [lang]);

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

  useEffect(() => {
    async function translateOrderDetails() {
      if (!Array.isArray(orderData?.items) || orderData.items.length === 0) {
        setTranslatedOrderData([]);
        return;
      }
      const translated = await Promise.all(
        orderData.items.map(async (item: any) => ({
          ...item,
          name: await translateText(item?.name, lang)
        }))
      );
      setTranslatedOrderData(translated);
    }
    translateOrderDetails();
  }, [orderData, lang]);



  if (!orderData) {
    return (
      <div className="min-h-screen p-8 bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl mb-4">{missingOrderDataLabel}</p>
          <Link href="/kiosk">
            <Button>{backToKioskLabel}</Button>
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

  const downloadReceipt = () => {
    const doc = new jsPDF();

    // Set up fonts and styles
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = 20;

    // Header
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("KUNG FU TEA", pageWidth / 2, yPosition, { align: "center" });
    yPosition += 10;

    doc.setFontSize(16);
    doc.text("RECEIPT", pageWidth / 2, yPosition, { align: "center" });
    yPosition += 15;

    // Order Details
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Order #: ${orderData.orderId}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Date: ${currentDate}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Payment: ${orderData.paymentType}`, 20, yPosition);
    yPosition += 12;

    // Line separator
    doc.setLineWidth(0.5);
    doc.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 10;

    // Items section
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("ITEMS", 20, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    orderData.items?.forEach((item: any) => {
      // Check if we need a new page
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFont("helvetica", "bold");
      doc.text(item.name, 20, yPosition);
      yPosition += 6;

      doc.setFont("helvetica", "normal");
      doc.text(`Price: $${Number(item.price).toFixed(2)}`, 25, yPosition);
      yPosition += 5;

      if (item.boba !== undefined) {
        doc.text(`Boba: ${item.boba}%`, 25, yPosition);
        yPosition += 5;
      }
      if (item.ice !== undefined) {
        doc.text(`Ice: ${item.ice}%`, 25, yPosition);
        yPosition += 5;
      }
      if (item.sugar !== undefined) {
        doc.text(`Sugar: ${item.sugar}%`, 25, yPosition);
        yPosition += 5;
      }
      yPosition += 3;
    });

    yPosition += 5;

    // Special Instructions
    if (orderData.specialInstructions) {
      if (yPosition > 240) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setLineWidth(0.5);
      doc.line(20, yPosition, pageWidth - 20, yPosition);
      yPosition += 10;

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("SPECIAL INSTRUCTIONS", 20, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      // Split long instructions text
      const splitInstructions = doc.splitTextToSize(orderData.specialInstructions, pageWidth - 40);
      splitInstructions.forEach((line: string) => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(line, 20, yPosition);
        yPosition += 5;
      });
      yPosition += 5;
    }

    // Payment Summary
    if (yPosition > 220) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setLineWidth(0.5);
    doc.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 10;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("PAYMENT SUMMARY", 20, yPosition);
    yPosition += 10;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Subtotal:", 20, yPosition);
    doc.text(`$${orderData.subtotal?.toFixed(2)}`, pageWidth - 20, yPosition, { align: "right" });
    yPosition += 7;

    doc.text("Tax (8.5%):", 20, yPosition);
    doc.text(`$${orderData.tax?.toFixed(2)}`, pageWidth - 20, yPosition, { align: "right" });
    yPosition += 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Total:", 20, yPosition);
    doc.text(`$${orderData.total?.toFixed(2)}`, pageWidth - 20, yPosition, { align: "right" });
    yPosition += 15;

    // Footer
    doc.setLineWidth(0.5);
    doc.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 10;

    doc.setFontSize(12);
    doc.setFont("helvetica", "italic");
    doc.text("Thank you for your order!", pageWidth / 2, yPosition, { align: "center" });

    // Save the PDF
    doc.save(`receipt-${orderData.orderId}.pdf`);
  };

  return (
    <div className="min-h-screen p-8 bg-background text-foreground">
      <div className="max-w-2xl mx-auto bg-white/70 backdrop-blur-md rounded-lg p-8">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">✓</div>
          <h1 className="text-3xl font-bold text-green-600 mb-2">{orderPlacedLabel}</h1>
          <p className="text-gray-600">{thankYouLabel}</p>
        </div>

        <div className="border-t border-b py-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">{orderDetailsLabel}</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">{orderNumberLabel}:</span>
              <span className="font-medium">#{orderData.orderId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{dateLabel}:</span>
              <span className="font-medium">{currentDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{paymentMethodLabel}:</span>
              <span className="font-medium capitalize">{paymentTypeLabel}</span>
            </div>
          </div>
        </div>

        {orderData.specialInstructions && (
          <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
            <h2 className="text-lg font-semibold text-yellow-900 mb-2">{specialInstructionsLabel}</h2>
            <p className="text-sm text-yellow-800 break-words">{orderData.specialInstructions}</p>
          </div>
        )}

        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">{itemsLabel}</h2>
          <div className="space-y-3">
            {orderData.items?.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center py-2 border-b">
                <div>
                  <div className="font-medium">
                    {Array.isArray(translatedOrderData) && translatedOrderData[idx]?.name
                      ? translatedOrderData[idx].name
                      : item.name}
                  </div>
                  <div className="text-sm text-gray-500">
                    Size: {Number(item.size || 1) === 1 ? 'Small' : Number(item.size || 1) === 2 ? 'Medium' : 'Large'}
                  </div>
                </div>
                <div className="font-medium">${(Number(item.price || 0) + Math.max(0, Number(item.size || 1) - 1)).toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t pt-4 space-y-2 mb-8">
          <div className="flex justify-between text-lg">
            <span className="text-gray-600">{subtotalLabel}</span>
            <span>${orderData.subtotal?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg">
            <span className="text-gray-600">{taxLabel} (8.50%)</span>
            <span>${orderData.tax?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-2xl font-bold mt-2 pt-2 border-t">
            <span>{totalLabel}</span>
            <span>${orderData.total?.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <Button onClick={downloadReceipt} variant="outline" className="w-full sm:w-auto">
            {downloadReceiptLabel}
          </Button>
          <Link href="/kiosk">
            <Button className="w-full sm:w-auto">{backToKioskLabel}</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
