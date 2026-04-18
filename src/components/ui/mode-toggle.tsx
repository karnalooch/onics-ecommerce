"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ModeToggle() {
  const { setTheme, theme } = useTheme()

  const handleToggle = () => {
    // Flag this session as manually overridden so Solar script stops forcing the theme
    sessionStorage.setItem("manual-theme", "true");
    
    // Strip the automated Solar CSS classes to prevent specificity collisions
    const root = document.documentElement;
    root.classList.remove("theme-morning", "theme-day", "theme-evening");
    
    // Determine target theme (if it's solar evening, treat it as 'dark' so toggling goes to 'light')
    const currentIsDark = theme === "dark" || root.classList.contains("theme-evening");
    setTheme(currentIsDark ? "light" : "dark");
  };

  return (
    <button
      onClick={handleToggle}
      className="inline-flex items-center justify-center rounded-md w-9 h-9 border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Przełącz motyw</span>
    </button>
  )
}
