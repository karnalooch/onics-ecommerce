"use client"

import { Phone, Mail, MessageSquare, Headphones, ChevronRight, User } from "lucide-react"

export function SupportCard() {
  return (
    <div className="satel-card p-6 bg-white border-l-4 border-l-primary flex flex-col gap-6 shadow-lg shadow-slate-200/50 sticky top-24">
      
      {/* 1. SECTION HEADER (SATEL STYLE) */}
      <div className="flex items-center gap-3 pb-4 border-b border-slate-50">
         <div className="w-10 h-10 bg-slate-950 text-white flex items-center justify-center rounded-none shadow-xl">
            <Headphones className="w-5 h-5" />
         </div>
         <div className="flex flex-col">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] italic text-slate-950">Wsparcie Techniczne</h3>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dedykowany Opiekun</span>
         </div>
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
         <button className="w-full h-11 bg-slate-950 text-white flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] active-press active-inset italic">
            <MessageSquare className="w-4 h-4" /> Live_Intel_Chat
         </button>
      </div>

      {/* 4. OPERATIONAL FOOTER */}
      <div className="flex items-center justify-between pt-2">
         <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-status-success rounded-full animate-ping" />
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Serwis_Online</span>
         </div>
         <ChevronRight className="w-4 h-4 text-slate-200" />
      </div>

    </div>
  )
}
