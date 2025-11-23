// components/AccessibilityMenu.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Sun, Moon, Eye, RotateCcw, X } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function AccessibilityMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [zoom, setZoom] = useState(1.0);
  const [highContrast, setHighContrast] = useState(false);
  const [mounted, setMounted] = useState(false);

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
            <h3 className="font-bold text-lg">Accessibility</h3>
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
                <span className="text-sm font-medium">Screen Magnifier</span>
                <span className="text-xs font-mono bg-muted px-2 py-1 rounded border">{Math.round(zoom * 100)}%</span>
            </div>
            <div className="flex gap-2">
                <Button className="flex-1" variant="outline" onClick={() => setZoom(z => Math.max(1.0, z - 0.1))}>
                    <ZoomOut className="h-4 w-4 mr-2" /> Decrease
                </Button>
                <Button className="flex-1" variant="outline" onClick={() => setZoom(z => Math.min(2.5, z + 0.1))}>
                    <ZoomIn className="h-4 w-4 mr-2" /> Increase
                </Button>
            </div>
          </div>

          {/* Contrast Controls */}
          <div className="space-y-3">
            <span className="text-sm font-medium">Display Adjustments</span>
            <Button
                className="w-full justify-between"
                variant={highContrast ? "default" : "outline"}
                onClick={() => setHighContrast(!highContrast)}
            >
                <span>High Contrast Mode</span>
                {highContrast ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </Card>
      )}

      <Button
        size="icon"
        className={`rounded-full h-14 w-14 shadow-xl border-4 border-white ring-2 ring-black/10 transition-all duration-300 ${isOpen ? 'rotate-90 scale-110' : 'hover:scale-110'}`}
        onClick={toggleMenu}
        title="Accessibility Options"
      >
        <Eye className="h-8 w-8" />
      </Button>
    </div>
  );
}
