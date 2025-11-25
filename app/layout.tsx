import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Pacifico } from "next/font/google";
import { Delius } from "next/font/google";
import "./globals.css";
import AccessibilityMenu from "@/components/AccessibilityMenu";
import { LanguageProvider } from "@/lib/LanguageContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const pacifico = Pacifico({
  weight: "400",
  variable: "--font-pacifico",
  subsets: ["latin"],
});

const delius = Delius({
  weight: "400",
  variable: "--font-delius",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Project 3",
  description: "Boba Shop Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${pacifico.variable} ${delius.variable} antialiased`}
      >
        <LanguageProvider>
          {children}
          <AccessibilityMenu />
        </LanguageProvider>
      </body>
    </html>
  );
}
