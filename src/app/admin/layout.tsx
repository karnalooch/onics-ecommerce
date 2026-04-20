"use client"

import { KnowledgeProvider } from "@/lib/knowledge/KnowledgeContext"
import { CommandPalette } from "./_components/CommandPalette"
import { SupportCard } from "./_components/SupportCard"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <KnowledgeProvider>
      <div className="min-h-[calc(100vh-80px)] w-full bg-background selection:bg-primary/20">
        <CommandPalette />
        
        {/* ELITE LAYOUT GRID: CONTENT + CONTEXTUAL SUPPORT */}
        <div className="max-w-[1920px] mx-auto px-4 lg:px-8 py-6 flex flex-col xl:flex-row gap-8">
          
          {/* MAIN OPERATIONAL VIEWPORT (Fluid Grid Mandate) */}
          <main className="flex-1 min-w-0">
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              {children}
            </div>
          </main>

          {/* FIXED CONTEXTUAL SUPPORT (SATEL PATTERN) - Hidden on mobile/small tablets */}
          <aside className="hidden xl:block w-[320px] shrink-0">
             <SupportCard />
          </aside>
        </div>

      </div>
    </KnowledgeProvider>
  )
}
