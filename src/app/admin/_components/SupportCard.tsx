"use client"

import { useState } from "react"
import { Phone, Mail, MessageSquare, Headphones, ChevronRight, Minus, Maximize2 } from "lucide-react"

export function SupportCard() {
  const [isMinimized, setIsMinimized] = useState(true)

  if (isMinimized) {
    return (
      <div 
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-6 right-6 z-50 glass-mica w-14 h-14 rounded-full flex items-center justify-center cursor-pointer shadow-2xl hover:scale-110 hover:shadow-primary/30 transition-all duration-300 border-primary/20 group"
      >
        <Headphones className="w-6 h-6 text-primary group-hover:animate-pulse" />
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-status-success rounded-full border-2 border-white animate-pulse" />
      </div>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 glass-mica p-6 bg-white flex flex-col gap-6 shadow-2xl border-l-4 border-l-primary no-blur rounded-xl w-[320px] animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* 1. SECTION HEADER (SATEL STYLE) */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-50">
         <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-950 text-white flex items-center justify-center rounded-none transition-transform">
               <Headphones className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
               <h3 className="text-[11px] font-black uppercase tracking-[0.2em] italic text-slate-950">Wsparcie B2B</h3>
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Twoje wsparcie techniczne</span>
            </div>
         </div>
         <button 
           onClick={() => setIsMinimized(true)}
           className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors"
         >
           <Minus className="w-4 h-4" />
         </button>
      </div>

      {/* 2. CONTACT OPTIONS */}
      <div className="space-y-4">
         <div className="flex items-center gap-4 group cursor-pointer hover:translate-x-1 transition-transform">
            <div className="w-9 h-9 bg-slate-50 text-slate-900 flex items-center justify-center rounded-full group-hover:bg-primary group-hover:text-white transition-all">
               <Phone className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Infolinia B2B</span>
               <span className="text-sm font-black text-slate-950">+48 25 644 12 12</span>
            </div>
         </div>

         <div className="flex items-center gap-4 group cursor-pointer hover:translate-x-1 transition-transform">
            <div className="w-9 h-9 bg-slate-50 text-slate-900 flex items-center justify-center rounded-full group-hover:bg-primary group-hover:text-white transition-all">
               <Mail className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dział Techniczny</span>
               <span className="text-sm font-black text-slate-950">serwis@celtronics.pl</span>
            </div>
         </div>
      </div>

      {/* 3. QUICK CHAT / RMA BRIDGE */}
      <div className="pt-2">
         <button className="pill-action w-full h-11 flex items-center justify-center gap-3 active-press active-inset italic no-blur">
            <MessageSquare className="w-4 h-4" /> Live_Intel_Chat
         </button>
      </div>

      {/* 4. OPERATIONAL FOOTER */}
      <div className="flex items-center justify-between pt-2">
         <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-status-success rounded-full animate-ping" />
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Serwis_Online</span>
         </div>
         <div className="flex items-center gap-2 text-slate-200">
            <span className="text-[8px] font-normal italic">v11.4 fluent</span>
            <ChevronRight className="w-4 h-4" />
         </div>
      </div>

    </div>
  )
}
