"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

import { THEME_CONSTANTS } from "@/types";

type TimeTheme = "morning" | "day" | "evening";

interface TimeThemeContextType {
  theme: TimeTheme;
}

const TimeThemeContext = createContext<TimeThemeContextType | undefined>(undefined);

export function TimeThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<TimeTheme>("day");

  useEffect(() => {
    const updateTheme = async () => {
      let sunriseMinutes = THEME_CONSTANTS.MORNING_START * 60; // Default
      let sunsetMinutes = 19 * 60; // Default

      try {
        const res = await fetch("/api/solar");
        const data = await res.json();
        if (data.sunrise && data.sunset) {
          const [srh, srm] = data.sunrise.split(':').map(Number);
          const [ssh, ssm] = data.sunset.split(':').map(Number);
          sunriseMinutes = srh * 60 + srm;
          sunsetMinutes = ssh * 60 + ssm;
        }
      } catch (e) {
        console.error("Solar theme fetch error:", e);
      }

      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      
      let newTheme: TimeTheme = "day";

      // Morning: Sunrise up to MORNING_DURATION_MINUTES
      if (currentMinutes >= sunriseMinutes && currentMinutes < sunriseMinutes + THEME_CONSTANTS.MORNING_DURATION_MINUTES) {
        newTheme = "morning";
      } 
      // Day: Post-morning to Sunset
      else if (currentMinutes >= sunriseMinutes + THEME_CONSTANTS.MORNING_DURATION_MINUTES && currentMinutes < sunsetMinutes) {
        newTheme = "day";
      } 
      // Evening: Sunset onwards
      else {
        newTheme = "evening";
      }

      setTheme(newTheme);
      
      if (typeof window !== 'undefined' && sessionStorage.getItem("manual-theme") === "true") {
        return; // Skip overwriting if user manually toggled the theme this session
      }

      const root = window.document.documentElement;
      root.classList.remove("theme-morning", "theme-day", "theme-evening");
      root.classList.add(`theme-${newTheme}`);
    };

    updateTheme();
    const interval = setInterval(updateTheme, 300000); // Check every 5 mins
    return () => clearInterval(interval);
  }, []);

  return (
    <TimeThemeContext.Provider value={{ theme }}>
      {children}
    </TimeThemeContext.Provider>
  );
}

export const useTimeTheme = () => {
  const context = useContext(TimeThemeContext);
  if (context === undefined) {
    throw new Error("useTimeTheme must be used within a TimeThemeProvider");
  }
  return context;
};
