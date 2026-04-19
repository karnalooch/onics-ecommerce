"use client"

import { KnowledgeProvider } from "@/lib/knowledge/KnowledgeContext"
import { GlobalKnowledgeIndicator } from "@/components/knowledge/GlobalKnowledgeIndicator"
import { GlobalTrainingModal } from "@/components/knowledge/GlobalTrainingModal"
import { GlobalAdminSidebar } from "./_components/GlobalAdminSidebar"
import { CommandPalette } from "./_components/CommandPalette"
import { AtmosphereToggle } from "@/components/ui/AtmosphereToggle"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <KnowledgeProvider>
      <div className="relative min-h-screen w-full bg-[#FDFCFB] dark:bg-[#050505] transition-colors duration-700 overflow-x-hidden">
        {/* V12 GLOBAL BACKGROUND ELEMENTS */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
          <div className="absolute bottom-[10%] -right-[10%] w-[30%] h-[30%] bg-blue-500/5 blur-[100px] rounded-full" />
        </div>

        <CommandPalette />
        <GlobalAdminSidebar />

        {/* Global Admin Header */}
        <header className="sticky top-0 z-40 h-20 flex items-center justify-between px-8 xl:pl-44 bg-white/40 dark:bg-slate-900/40 backdrop-blur-3xl border-b border-white dark:border-slate-800 shadow-sm">
           <div className="flex items-center gap-4">
              <div className="h-[2px] w-8 bg-primary" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 italic">Terminal Admin Protocol V12</span>
           </div>
           
           <div className="flex items-center gap-8">
              <GlobalKnowledgeIndicator />
              <div className="h-10 w-[1px] bg-slate-200 dark:bg-slate-800" />
              <AtmosphereToggle />
           </div>
        </header>

        {/* Main Content Area */}
        <main className="relative z-10 flex-1 w-full min-h-[calc(100vh-5rem)]">
          <div className="max-w-[2000px] mx-auto px-8 xl:pl-44 py-12">
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-1000">
              {children}
            </div>
          </div>
        </main>
        
        <GlobalTrainingModal />
      </div>
    </KnowledgeProvider>
  )
}
