// components/AccessibilityMenu.tsx
"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Sun, Moon, Eye, RotateCcw, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Accessibility } from 'lucide-react';

import { translateText } from '@/lib/translate';
import { NativeSelect, NativeSelectOption } from "./ui/native-select";
import { set } from "react-hook-form";

export default function AccessibilityMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [zoom, setZoom] = useState(1.0);
  const [highContrast, setHighContrast] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { lang, setLang } = useLanguage();

  // translation labels
  const [screenMagnifierLabel, setScreenMagnifierLabel] = useState('Screen Magnifier');
  const [decreaseLabel, setDecreaseLabel] = useState('Decrease');
  const [increaseLabel, setIncreaseLabel] = useState('Increase');
  const [displayAdjustmentsLabel, setDisplayAdjustmentsLabel] = useState('Display Adjustments');
  const [highContrastModeLabel, setHighContrastModeLabel] = useState('High Contrast Mode');
  const [textSizeLabel, setTextSizeLabel] = useState('Text Size');
  const [selectLanguageLabel, setSelectLanguageLabel] = useState('Select Language');
  const [accessibilityLabel, setAccessibilityLabel] = useState('Accessibility');

  // const applyLanguage = () => {
  //   const storedLang = localStorage.getItem('lang');
  //   console.log("Stored lang:", storedLang);
  //   if (storedLang) {
  //     setLang(storedLang);
  //   } else {
  //     console.log('setting lang to en');
  //     setLang('en');
  //     localStorage.setItem('lang', 'en');
  //   }
  // }

    useEffect(() => {
      async function translateLabels() {
        setScreenMagnifierLabel(await translateText('Screen Magnifier', lang));
        setDecreaseLabel(await translateText('Decrease', lang));
        setIncreaseLabel(await translateText('Increase', lang));
        setDisplayAdjustmentsLabel(await translateText('Display Adjustments', lang));
        setHighContrastModeLabel(await translateText('High Contrast Mode', lang));
        setTextSizeLabel(await translateText('Text Size', lang));
        setSelectLanguageLabel(await translateText('Select Language', lang));
        setAccessibilityLabel(await translateText('Accessibility', lang));
      }
      translateLabels();
    }, [lang]);
  // Load saved settings from localStorage on mount
  useEffect(() => {
    try {
      const savedZoom = localStorage.getItem('accessibility-zoom');
      const savedContrast = localStorage.getItem('accessibility-contrast');

      if (savedZoom) {
        const parsedZoom = parseFloat(savedZoom);
        if (!isNaN(parsedZoom) && parsedZoom >= 1.0 && parsedZoom <= 2.5) {
          setZoom(parsedZoom);
        }
      }

      if (savedContrast === 'true') {
        setHighContrast(true);
      }
    } catch (e) {
      console.error('Failed to load accessibility settings:', e);
    } finally {
      setMounted(true);
    }
  }, []);

  // Apply Zoom and save to localStorage
  useEffect(() => {
    if (!mounted) return;

    // 'zoom' is a non-standard CSS property but supported in Chrome/Edge/Safari
    // It effectively scales the content while triggering layout reflow, keeping elements on screen.
    const body = document.body as any;
    if (body) {
      body.style.zoom = zoom;

      // CRITICAL FIX: Dispatch a resize event so the Iridescence background
      // recalculates its dimensions immediately after zooming.
      window.dispatchEvent(new Event('resize'));

      // Save to localStorage
      try {
        localStorage.setItem('accessibility-zoom', zoom.toString());
      } catch (e) {
        console.error('Failed to save zoom setting:', e);
      }
    }
  }, [zoom, mounted]);

  // Apply High Contrast and save to localStorage
  useEffect(() => {
    if (!mounted) return;

    if (highContrast) {
      document.documentElement.classList.add("high-contrast");
    } else {
      document.documentElement.classList.remove("high-contrast");
    }

    // Save to localStorage
    try {
      localStorage.setItem('accessibility-contrast', highContrast.toString());
    } catch (e) {
      console.error('Failed to save contrast setting:', e);
    }
  }, [highContrast, mounted]);


  // Accessibility: text size (root font-size in px). Persist in localStorage under 'textSize'
    const [textSize, setTextSize] = useState<number | null>(null);

    const applyTextSize = (px: number) => {
        try {
            // set a CSS variable so we can target only kiosk text via .kiosk-text
            document.documentElement.style.setProperty(
                "--kiosk-text-size",
                `${px}px`
            );
            window.localStorage.setItem("textSize", String(px));
            setTextSize(px);
        } catch (e) {
            // ignore
        }
    };


  const increaseText = () =>
        applyTextSize(Math.min((textSize ?? 16) + 2, 24));
    const decreaseText = () =>
        applyTextSize(Math.max((textSize ?? 16) - 2, 16));
    const resetText = () => applyTextSize(16);

  useEffect(() => {
        // initialize from localStorage or computed root size
        try {
            const stored = window.localStorage.getItem("textSize");
            if (stored) {
                const n = Number(stored);
                if (!isNaN(n)) {
                    document.documentElement.style.setProperty(
                        "--kiosk-text-size",
                        `${n}px`
                    );
                    setTextSize(n);
                    return;
                }
            }
            // If nothing stored, default to 16px for the kiosk text variable
            document.documentElement.style.setProperty(
                "--kiosk-text-size",
                `16px`
            );
            setTextSize(16);
        } catch (e) {
            // ignore
        }

        // Initialization complete; text size variable has been set from storage (if any).
        return;
    }, []);

  // Toggle Menu
  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <div
      className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-4 print:hidden"
      // Inverse scale the menu so it stays consistent while the rest of the UI zooms
      style={{ zoom: 1 / zoom }}
    >
      {isOpen && (
        <Card className="w-72 p-4 shadow-2xl border-2 animate-in slide-in-from-bottom-5 fade-in duration-200 bg-white/90 backdrop-blur-md dark:bg-black/90">
          <div className="flex items-center justify-between mb-4 border-b pb-2">
            <h3 className="font-bold text-lg">{accessibilityLabel}</h3>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => { setZoom(1); setHighContrast(false); }}
                title="Reset All"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Magnifier Controls */}
          <div className="space-y-3 mb-4">
            <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{screenMagnifierLabel}</span>
                <span className="text-xs font-mono bg-muted px-2 py-1 rounded border">{Math.round(zoom * 100)}%</span>
            </div>
            <div className="flex gap-2">
                <Button className="flex-1" variant="outline" onClick={() => setZoom(z => Math.max(1.0, z - 0.1))}>
                    <ZoomOut className="h-4 w-4 mr-2" /> {decreaseLabel}
                </Button>
                <Button className="flex-1" variant="outline" onClick={() => setZoom(z => Math.min(2.5, z + 0.1))}>
                    <ZoomIn className="h-4 w-4 mr-2" /> {increaseLabel}
                </Button>
            </div>
          </div>

          {/* Contrast Controls */}
          <div className="space-y-3">
            <span className="text-sm font-medium">{displayAdjustmentsLabel}</span>
            <Button
                className="w-full justify-between"
                variant={highContrast ? "default" : "outline"}
                onClick={() => setHighContrast(!highContrast)}
            >
                <span>{highContrastModeLabel}</span>
                {highContrast ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>

          <div className="space-y-3">
            <span className="text-sm font-medium">{textSizeLabel}</span>

            <div className="flex items-center gap-3">

                      <div className="flex items-center gap-2">
                          <Button
                              size="sm"
                              variant="outline"
                              onClick={decreaseText}
                              aria-label="Decrease text size"
                          >
                              A-
                          </Button>
                          <Button
                              size="sm"
                              variant="outline"
                              onClick={increaseText}
                              aria-label="Increase text size"
                          >
                              A+
                          </Button>
                          <div className="text-sm text-muted-foreground ms-2">
                              {textSize ? `${textSize}px` : ""}
                          </div>
                      </div>
                  </div>
          </div>

          <div className="space-y-3">
                        <h1>{selectLanguageLabel}</h1>
                        <NativeSelect value={lang} onChange={e => setLang(e.target.value)}>
                            <NativeSelectOption value='en'>English</NativeSelectOption>
                            <NativeSelectOption value='es'>Español</NativeSelectOption>
                            <NativeSelectOption value='fr'>Français</NativeSelectOption>
                            <NativeSelectOption value='zh'>中文</NativeSelectOption>
                            <NativeSelectOption value='de'>Deutsch</NativeSelectOption>
                        </NativeSelect>
                    </div>

        </Card>
      )}

      <Button
        size="icon"
        className={`rounded-full h-14 w-14 shadow-xl border-4 border-white ring-2 ring-black/10 transition-all duration-300 ${isOpen ? 'scale-120' : 'hover:scale-120'}`}
        onClick={toggleMenu}
        title="Accessibility Options"
      >
        <Accessibility className="h-8 w-8" />
      </Button>
    </div>
  );
}
