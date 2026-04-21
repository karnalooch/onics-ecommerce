"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  Building2, Mail, Ban, CheckCircle, Trash2, Search, Eye, Percent, 
  Database, ChevronRight, User as UserIcon, FileText, Terminal, 
  ShieldCheck, ShieldAlert, Activity, Users, MoreHorizontal, Settings
} from "lucide-react";
import { toast } from "sonner";
import { User } from "@/types";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminClientsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [tempDiscount, setTempDiscount] = useState<string>("0");
  const [tempTier, setTempTier] = useState<string>("PARTNER");
  const [saving, setSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users", { cache: "no-store" });
      const data = await res.json();
      setUsers(data);
    } catch (e) {
      toast.error("FAULT: Błąd synchronizacji rejestru partnerów.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const toggleBlock = async (id: string, currentlyBlocked: boolean) => {
    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isBlocked: !currentlyBlocked })
      });
      if (res.ok) {
        toast.success(currentlyBlocked ? "Konto odblokowane" : "Konto zablokowane");
        loadUsers();
      }
    } catch (e) {
      toast.error("Błąd połączenia.");
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm("⚠️ Czy na pewno chcesz trwale usunąć konto klienta?")) return;
    try {
      const res = await fetch(`/api/users?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Konto zostało usunięte");
        loadUsers();
      }
    } catch (e) {
      toast.error("Błąd zapisu.");
    }
  };

  const openDiscountModal = (user: User) => {
    setSelectedUser(user);
    setTempDiscount(String(user.discount || 0));
    setTempTier(user.tierName || "PARTNER");
    setIsDialogOpen(true);
  };

  const handleSaveDiscount = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const res = await fetch("/api/users/discount", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id: selectedUser.id, 
          discount: Number(tempDiscount), 
          tierName: tempTier 
        })
      });
      if (res.ok) {
        toast.success(`LOG: Zmodernizowano warunki handlowe dla ${selectedUser.username}`);
        setIsDialogOpen(false);
        loadUsers();
      }
    } catch (e) {
      toast.error("Błąd połączenia.");
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (u.companyName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.nip || "").includes(searchTerm)
  );

  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-700 pb-20 no-blur max-w-[1920px] mx-auto">
      
      {/* 1. OPERATIONAL CLIENT HEADER */}
      <div className="flex flex-col xl:flex-row justify-between items-end xl:items-center gap-8 border-b-2 border-slate-950 pb-8">
        <div className="flex items-center gap-6">
           <div className="w-14 h-14 bg-slate-950 text-white flex items-center justify-center shadow-xl">
              <Users className="w-7 h-7 text-primary" />
           </div>
           <div className="flex flex-col">
              <div className="flex items-center gap-3">
                 <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary italic leading-none">IDENTITY_TERMINAL</span>
                 <div className="w-8 h-[1px] bg-slate-200" />
                 <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 leading-none">B2B_Partner_Registry</span>
              </div>
              <h1 className="text-4xl font-black text-slate-950 uppercase tracking-tighter italic leading-none mt-1">Ewidencja Partnerów</h1>
           </div>
        </div>
        
        <div className="flex items-center gap-4 bg-slate-50 p-2 border border-slate-100 rounded-none h-14 px-6">
            <div className="flex flex-col items-end">
               <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">AKTYWNE_WĘZŁY</span>
               <span className="text-xl font-black text-slate-950 italic tabular-nums leading-none mt-1">{users.filter(u => !u.isBlocked).length}</span>
            </div>
            <div className="h-6 w-[1px] bg-slate-200 mx-4" />
            <div className="flex flex-col items-end">
               <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">BLOKADY</span>
               <span className="text-xl font-black text-status-error italic tabular-nums leading-none mt-1">{users.filter(u => u.isBlocked).length}</span>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        
        {/* COMMAND BAR (CENTER/LEFT) */}
        <div className="xl:col-span-12 space-y-8">
           
           <div className="flex flex-col lg:flex-row items-center gap-4">
              <div className="flex-1 relative group w-full lg:w-auto">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                 <input 
                   type="text" 
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   placeholder="SEARCH_BY_NIP_OR_IDENTITY..."
                   className="w-full h-12 bg-white border border-slate-100 pl-12 pr-4 text-[11px] font-black uppercase tracking-widest italic outline-none focus:border-primary transition-all shadow-sm"
                 />
              </div>
              
              <div className="flex items-center gap-2 w-full lg:w-auto">
                 <button className="h-12 px-6 bg-slate-50 border border-slate-100 text-slate-400 font-black uppercase text-[10px] tracking-widest flex items-center gap-3 transition-all active-press italic">
                    <FileText className="w-4 h-4" /> EXPORT_AUDIT_LOG
                 </button>
                 <button className="h-12 px-8 bg-slate-950 text-white font-black uppercase text-[10px] tracking-widest flex items-center gap-4 active-press transition-all hover:bg-primary shadow-xl shadow-primary/10 italic rounded-none flex-1 lg:flex-none">
                    DODAJ_NOWY_PODMIOT
                 </button>
              </div>
           </div>

           <div className="satel-card p-0 bg-white border-none shadow-sm overflow-hidden rounded-none">
              <div className="p-5 border-b border-slate-100 bg-slate-950 flex items-center justify-between text-white">
                 <div className="flex items-center gap-4">
                    <Database className="w-5 h-5 text-primary" />
                    <h3 className="text-[11px] font-black uppercase tracking-[0.3em] italic">HI_DENSITY_B2B_REGISTRY</h3>
                 </div>
              </div>

              <div className="w-full overflow-x-auto">
                 <table className="w-full border-collapse">
                    <thead>
                       <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="text-[10px] font-black text-slate-950 uppercase tracking-widest py-4 pl-6 text-left w-20 italic">TAG</th>
                          <th className="text-[10px] font-black text-slate-950 uppercase tracking-widest py-4 px-6 text-left italic">Podmiot / ID</th>
                          <th className="text-[10px] font-black text-slate-950 uppercase tracking-widest py-4 px-6 text-left italic">Kontakt / KSeF_Node</th>
                          <th className="text-[10px] font-black text-slate-950 uppercase tracking-widest py-4 px-6 text-left italic">Matryca_Handlowa</th>
                          <th className="text-[10px] font-black text-slate-950 uppercase tracking-widest py-4 px-6 text-left italic">Status</th>
                          <th className="text-[10px] font-black text-slate-950 uppercase tracking-widest py-4 pr-6 text-right italic">Operacje</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {loading ? (
                          <tr>
                             <td colSpan={6} className="h-64 text-center">
                                <div className="flex flex-col items-center justify-center opacity-10">
                                   <Activity className="w-10 h-10 mb-4 animate-pulse" />
                                   <span className="text-[11px] font-black uppercase tracking-[0.5em] italic">Analiza_Węzłów_Partnera...</span>
                                </div>
                             </td>
                          </tr>
                       ) : filteredUsers.length === 0 ? (
                          <tr>
                             <td colSpan={6} className="h-64 text-center text-[11px] font-black text-slate-200 uppercase tracking-[0.4em] italic">Brak_Wyników_W_Bazie</td>
                          </tr>
                       ) : (
                          filteredUsers.map(user => (
                             <tr key={user.id} className="group hover:bg-slate-50/50 transition-colors">
                                <td className="py-5 pl-6">
                                   {user.roleType === 'ADMIN' && <span className="px-2 py-0.5 bg-slate-900 text-white text-[8px] font-black uppercase italic tracking-widest">SYS</span>}
                                   {user.roleType === 'BIZ' && <span className="px-2 py-0.5 bg-primary text-white text-[8px] font-black uppercase italic tracking-widest">B2B</span>}
                                   {user.roleType === 'RETAIL' && <span className="px-2 py-0.5 bg-slate-100 text-slate-400 border border-slate-200 text-[8px] font-black uppercase italic tracking-widest">B2C</span>}
                                </td>
                                
                                <td className="px-6 py-5">
                                   <div className="flex flex-col gap-1">
                                      <span className="text-[13px] font-black text-slate-950 uppercase italic tracking-tighter leading-none">{user.companyName || user.username || "UNKNOWN_NODE"}</span>
                                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{user.nip ? `NIP: ${user.nip}` : "AUTH_USER_V9"}</span>
                                   </div>
                                </td>

                                <td className="px-6 py-5">
                                   <div className="flex items-center gap-3">
                                      <Mail className="w-3.5 h-3.5 text-slate-200" />
                                      <span className="text-[11px] font-black text-slate-600 tracking-tight italic">{user.email}</span>
                                   </div>
                                </td>

                                <td className="px-6 py-5">
                                   <div className="flex flex-col gap-1 leading-none">
                                      <div className="flex items-center gap-2">
                                         <span className="text-base font-black text-slate-950 italic">-{user.discount || 0}%</span>
                                         <div className="h-3 w-[1px] bg-slate-200" />
                                         <span className="text-[9px] font-black text-primary uppercase tracking-[0.1em] italic">{user.tierName || "BASIC_HUB"}</span>
                                      </div>
                                   </div>
                                </td>

                                <td className="px-6 py-5">
                                   {user.isBlocked ? (
                                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-status-error/10 text-status-error border border-status-error/20">
                                         <div className="w-1.5 h-1.5 bg-status-error rounded-full" />
                                         <span className="text-[8px] font-black uppercase italic tracking-widest">BLOCKED</span>
                                      </div>
                                   ) : (
                                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-status-success/10 text-status-success border border-status-success/20">
                                         <div className="w-1.5 h-1.5 bg-status-success rounded-full animate-pulse" />
                                         <span className="text-[8px] font-black uppercase italic tracking-widest">OPERATIONAL</span>
                                      </div>
                                   )}
                                </td>

                                <td className="pr-6 py-5 text-right">
                                   <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100">
                                      <button 
                                         onClick={() => openDiscountModal(user)}
                                         className="w-10 h-10 flex items-center justify-center bg-white border border-slate-100 text-slate-300 hover:text-primary transition-all active-press"
                                      >
                                         <Percent className="w-4 h-4" />
                                      </button>
                                      <button 
                                         onClick={() => toggleBlock(user.id, user.isBlocked)}
                                         className={`w-10 h-10 flex items-center justify-center bg-white border border-slate-100 transition-all active-press ${user.isBlocked ? 'text-status-success' : 'text-slate-300 hover:text-red-500'}`}
                                      >
                                         <Ban className="w-4 h-4" />
                                      </button>
                                      <button 
                                         onClick={() => deleteUser(user.id)}
                                         className="w-10 h-10 flex items-center justify-center bg-white border border-slate-100 text-slate-300 hover:text-red-600 transition-all active-press"
                                      >
                                         <Trash2 className="w-4 h-4" />
                                      </button>
                                   </div>
                                </td>
                             </tr>
                          ))
                       )}
                    </tbody>
                 </table>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                 <div className="flex items-center gap-3">
                    <ShieldCheck className="w-4 h-4 text-status-success" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Identity_Integrity: VERIFIED</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Page_Cluster:</span>
                    <div className="flex gap-1">
                       {[1].map(p => (
                          <button key={p} className="w-6 h-6 bg-slate-950 text-white text-[9px] font-black flex items-center justify-center">0{p}</button>
                       ))}
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Corporate Pricing Modal (Terminal Design) */}
      <AnimatePresence>
        {isDialogOpen && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-6 no-blur">
              <div className="absolute inset-0 bg-slate-950/60" onClick={() => setIsDialogOpen(false)} />
              
              <motion.div 
                 initial={{ opacity: 0, scale: 0.95, y: 20 }}
                 animate={{ opacity: 1, scale: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.95, y: 20 }}
                 className="w-full max-w-[480px] bg-white relative z-10 overflow-hidden shadow-2xl border-none p-0 flex flex-col"
              >
                 <div className="bg-slate-950 px-8 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       <Percent className="w-5 h-5 text-primary" />
                       <h3 className="text-[11px] font-black text-white uppercase tracking-[0.3em] italic">MODYFIKACJA_MATRYCY_HANDLOWEJ</h3>
                    </div>
                    <button onClick={() => setIsDialogOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                       <Settings className="w-5 h-5" />
                    </button>
                 </div>

                 <div className="p-10 space-y-8">
                    <div className="space-y-6">
                       <div className="flex flex-col gap-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic ml-1">Limit Rabatowy Partnera (%)</label>
                          <div className="relative group">
                             <input 
                                type="number" 
                                min="0"
                                max="100"
                                value={tempDiscount}
                                onChange={e => setTempDiscount(e.target.value)}
                                className="w-full h-20 bg-slate-50 border-2 border-slate-100 px-6 text-5xl font-black text-slate-950 tabular-nums italic outline-none focus:bg-white focus:border-primary transition-all pr-24"
                             />
                             <div className="absolute right-6 top-1/2 -translate-y-1/2 text-3xl font-black text-slate-200">%</div>
                          </div>
                       </div>

                       <div className="flex flex-col gap-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic ml-1">Klasyfikacja_TIER (Priority_Level)</label>
                          <div className="relative group">
                             <Database className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-200 group-focus-within:text-primary transition-colors" />
                             <input 
                                value={tempTier}
                                onChange={e => setTempTier(e.target.value.toUpperCase())}
                                placeholder="NP. PRO_SERVICE_VIP"
                                className="w-full h-14 pl-12 bg-slate-50 border-2 border-slate-100 px-6 text-sm font-black text-slate-950 uppercase tracking-widest outline-none focus:bg-white focus:border-primary transition-all font-mono italic"
                             />
                          </div>
                       </div>
                    </div>

                    <div className="pt-4 flex items-center gap-4">
                       <button 
                          onClick={() => setIsDialogOpen(false)}
                          className="flex-1 h-14 border-2 border-slate-950 text-slate-950 font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-all active-press italic"
                       >
                          ODRZUĆ_ZMIANY
                       </button>
                       <button 
                          onClick={handleSaveDiscount}
                          disabled={saving}
                          className="flex-1 h-14 bg-primary text-white font-black text-[11px] uppercase tracking-widest shadow-xl shadow-primary/20 flex items-center justify-center gap-3 transition-all hover:brightness-110 active-press italic"
                       >
                          {saving ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                          {saving ? "WERYFIKACJA..." : "AUTORYZUJ_WARUNKI"}
                       </button>
                    </div>
                 </div>
              </motion.div>
           </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RefreshCcw(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  )
}
