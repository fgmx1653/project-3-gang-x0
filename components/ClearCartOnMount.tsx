"use client";

import { useEffect } from "react";

export default function ClearCartOnMount() {
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("cart");
      }
    } catch (e) {
      // ignore
    }
  }, []);

  return null;
}
