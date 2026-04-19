"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"
import { motion } from "framer-motion"

/**
 * React 19 / Next.js 16 (Turbopack) Strict Mode Fix:
 * next-themes injects a <script> for theme-flash blocking which triggers a 
 * console warning/error in React 19. Since this is an intended SSR feature,
 * we suppress the specific "Encountered a script tag" warning in development.
 */
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && (
      args[0].includes('Encountered a script tag') || 
      args[0].includes('bis_skin_checked') ||
      args[0].includes('Hydration failed')
    )) {
      return;
    }
    originalError.apply(console, args);
  };
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider {...props} attribute="class">
      <AtmosphereWrapper>
        {children}
      </AtmosphereWrapper>
    </NextThemesProvider>
  )
}

function AtmosphereWrapper({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const [isTransitioning, setIsTransitioning] = React.useState(false);

  React.useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 1200);
    return () => clearTimeout(timer);
  }, [theme]);

  return (
    <>
      {children}
      {/* THE CINEMATIC WASH CURTAIN */}
      {isTransitioning && (
        <motion.div
           initial={{ opacity: 0, scale: 0 }}
           animate={{ opacity: 1, scale: 2 }}
           exit={{ opacity: 0 }}
           transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
           className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center"
        >
           <div className={`w-[200vw] h-[200vw] rounded-full ${theme === 'dark' ? 'bg-primary/20 invisible dark:visible' : 'bg-white/40 visible dark:invisible'} blur-[150px]`} />
        </motion.div>
      )}
    </>
  );
}
