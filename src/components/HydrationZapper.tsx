"use client";

import { useEffect } from "react";

export function HydrationZapper() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      const originalConsoleError = console.error;
      console.error = (...args: any[]) => {
        if (typeof args[0] === "string" && args[0].includes("bis_skin_checked")) {
          // Ignoruj błąd wywoływany przez wtyczkę!
          return;
        }
        if (typeof args[0] === "string" && args[0].includes("A tree hydrated but some attributes")) {
          // Ignoruj ogólny błąd nawadniania spowodowany przez inne wtyczki
          return;
        }
        originalConsoleError(...args);
      };
    }
  }, []);

  return null;
}
