"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  Building2, Mail, Ban, CheckCircle, Trash2, Search, Eye, Percent, 
  Database, ChevronRight, User as UserIcon, FileText, Terminal, 
  ShieldCheck, ShieldAlert, Activity, Users, MoreHorizontal, Settings,
  Zap, Globe, RefreshCcw
} from "lucide-react";
import { toast } from "sonner";
import { User } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";

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
    <div className="flex flex-col gap-12 animate-in fade-in duration-700 pb-20 max-w-[1920px] mx-auto">
      
      {/* 1. OPERATIONAL CLIENT HEADER (FLUENT) */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6">
        <div className="flex items-center gap-6">
           <div className="w-16 h-16 bg-primary text-white flex items-center justify-center rounded-xl shadow-2xl shadow-primary/30">
              <Users className="w-8 h-8" />
           </div>
           <div className="flex flex-col">
              <div className="flex items-center gap-3">
                 <span className="text-[11px] font-bold uppercase tracking-widest text-primary">Rejestr Podmiotów</span>
                 <span className="w-1.5 h-1.5 bg-black/10 dark:bg-white/10 rounded-full" />
                 <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">B2B_Identity_Registry</span>
              </div>
              <h1 className="text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight mt-1">Ewidencja Partnerów</h1>
           </div>
        </div>
        
        <div className="flex items-center gap-10">
           <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Węzły Aktywne / Blokady</span>
              <div className="flex items-center gap-3 mt-1">
                 <span className="text-2xl font-extrabold text-foreground tabular-nums tracking-tight">{users.filter(u => !u.isBlocked).length}</span>
                 <div className="w-[2px] h-6 bg-black/10 dark:bg-white/10" />
                 <span className="text-2xl font-extrabold text-red-500 tabular-nums tracking-tight">{users.filter(u => u.isBlocked).length}</span>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        
        {/* COMMAND BAR */}
        <div className="xl:col-span-12 space-y-8">
           
           <div className="flex flex-col lg:flex-row items-center gap-6">
              <div className="flex-1 relative group w-full lg:w-auto">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                 <input 
                   type="text" 
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   placeholder="Szukaj po NIP lub nazwie podmiotu..."
                   className="w-full h-14 bg-black/5 dark:bg-white/5 border border-transparent rounded-xl pl-12 pr-4 text-[14px] font-medium placeholder:text-muted-foreground/40 outline-none focus:bg-white dark:focus:bg-white/10 focus:border-primary/20 transition-all shadow-inner"
                 />
              </div>
              
              <div className="flex items-center gap-3 w-full lg:w-auto">
                 <button className="h-14 px-8 bg-black/5 dark:bg-white/5 border border-transparent rounded-xl text-muted-foreground hover:text-foreground font-bold uppercase text-[11px] tracking-widest flex items-center gap-3 transition-all active:scale-95 shadow-sm">
                    <FileText className="w-4 h-4" /> Eksportuj Logi
                 </button>
                 <button className="h-14 px-10 bg-primary text-white font-bold uppercase text-[11px] tracking-widest flex items-center gap-4 active:scale-95 transition-all hover:brightness-110 shadow-xl shadow-primary/20 rounded-xl flex-1 lg:flex-none">
                    DODAJ NOWY PODMIOT
                 </button>
              </div>
           </div>

           <div className="fluent-card p-0 border-white/10 shadow-2xl overflow-hidden">
              <div className="px-10 py-6 border-b border-black/5 dark:border-white/10 bg-primary/5 dark:bg-white/5 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/10 text-primary flex items-center justify-center rounded-lg">
                       <Database className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Rejestr Partnerów B2B (High Density)</h3>
                 </div>
              </div>

              <div className="w-full overflow-x-auto">
                 <table className="w-full border-collapse">
                    <thead>
                       <tr className="bg-black/5 dark:bg-white/5 border-b border-black/10 dark:border-white/10">
                          <th className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest py-5 pl-10 text-left">TYP</th>
                          <th className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest py-5 px-6 text-left">Podmiot / Tożsamość</th>
                          <th className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest py-5 px-6 text-left">Kontakt Email</th>
                          <th className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest py-5 px-6 text-left">Warunki Handlowe</th>
                          <th className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest py-5 px-6 text-left">Status Pracy</th>
                          <th className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest py-5 pr-10 text-right">Akcje</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                       {loading ? (
                          <tr>
                             <td colSpan={6} className="h-64 text-center">
                                <div className="flex flex-col items-center justify-center opacity-20">
                                   <Activity className="w-12 h-12 mb-4 animate-pulse text-primary" />
                                   <span className="text-[12px] font-bold uppercase tracking-[0.3em] italic">Weryfikacja węzłów...</span>
                                </div>
                             </td>
                          </tr>
                       ) : filteredUsers.length === 0 ? (
                          <tr>
                             <td colSpan={6} className="h-64 text-center text-muted-foreground font-medium text-sm">Brak wyników spełniających kryteria wyszukiwania.</td>
                          </tr>
                       ) : (
                          filteredUsers.map(user => (
                             <tr key={user.id} className="group hover:bg-primary/5 transition-all">
                                <td className="py-6 pl-10">
                                   {user.roleType === 'ADMIN' && <Badge className="bg-black dark:bg-white text-white dark:text-black font-black text-[9px] uppercase tracking-widest h-6">SYS</Badge>}
                                   {user.roleType === 'BIZ' && <Badge className="bg-primary text-white font-black text-[9px] uppercase tracking-widest h-6">B2B</Badge>}
                                   {user.roleType === 'RETAIL' && <Badge variant="outline" className="text-muted-foreground font-black text-[9px] uppercase tracking-widest h-6">B2C</Badge>}
                                </td>
                                
                                <td className="px-6 py-6">
                                   <div className="flex flex-col">
                                      <span className="text-[14px] font-extrabold text-foreground leading-none">{user.companyName || user.username || "Anonim"}</span>
                                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mt-1.5 opacity-60">{user.nip ? `NIP: ${user.nip}` : "ID_B2C_001"}</span>
                                   </div>
                                </td>

                                <td className="px-6 py-6 font-medium text-[13px] text-muted-foreground group-hover:text-foreground transition-colors">
                                   {user.email}
                                </td>

                                <td className="px-6 py-6">
                                   <div className="flex flex-col gap-1">
                                      <div className="flex items-center gap-3">
                                         <span className="text-lg font-extrabold text-foreground italic">-{user.discount || 0}%</span>
                                         <div className="w-1.5 h-1.5 bg-primary rounded-full opacity-40" />
                                         <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded-md">{user.tierName || "BASIC"}</span>
                                      </div>
                                   </div>
                                </td>

                                <td className="px-6 py-6">
                                   {user.isBlocked ? (
                                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg">
                                         <div className="w-1.5 h-1.5 bg-red-500 rounded-full shadow-lg shadow-red-500/40" />
                                         <span className="text-[9px] font-bold uppercase tracking-widest">Zablokowany</span>
                                      </div>
                                   ) : (
                                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-500 border border-green-500/20 rounded-lg">
                                         <div className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-lg shadow-green-500/40 animate-pulse" />
                                         <span className="text-[9px] font-bold uppercase tracking-widest">Aktywny</span>
                                      </div>
                                   )}
                                </td>

                                <td className="pr-10 py-6 text-right">
                                   <div className="flex items-center justify-end gap-3 scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all">
                                      <button 
                                         onClick={() => openDiscountModal(user)}
                                         className="w-11 h-11 flex items-center justify-center bg-white dark:bg-white/10 border border-black/5 dark:border-white/10 rounded-xl text-muted-foreground hover:text-primary hover:border-primary/30 transition-all active:scale-90 shadow-sm"
                                      >
                                         <Percent className="w-4 h-4" />
                                      </button>
                                      <button 
                                         onClick={() => toggleBlock(user.id, user.isBlocked)}
                                         className={`w-11 h-11 flex items-center justify-center bg-white dark:bg-white/10 border border-black/5 dark:border-white/10 rounded-xl transition-all active:scale-90 shadow-sm ${user.isBlocked ? 'text-green-500' : 'text-muted-foreground hover:text-red-500 hover:border-red-500/30'}`}
                                      >
                                         <Ban className="w-4 h-4" />
                                      </button>
                                      <button 
                                         onClick={() => deleteUser(user.id)}
                                         className="w-11 h-11 flex items-center justify-center bg-white dark:bg-white/10 border border-black/5 dark:border-white/10 rounded-xl text-muted-foreground hover:text-red-600 hover:border-red-600/30 transition-all active:scale-90 shadow-sm"
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

              <div className="px-10 py-5 bg-black/5 dark:bg-white/5 border-t border-black/5 dark:border-white/10 flex justify-between items-center">
                 <div className="flex items-center gap-3">
                    <ShieldCheck className="w-4 h-4 text-green-500" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Integrity_Control: SECURE</span>
                 </div>
                 <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    <span>Strona: 1 / 1</span>
                    <Globe className="w-4 h-4 opacity-30" />
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Corporate Pricing Modal (Fluent Design) */}
      <AnimatePresence>
        {isDialogOpen && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-md">
              <motion.div 
                 initial={{ opacity: 0, scale: 0.95, y: 30 }}
                 animate={{ opacity: 1, scale: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.95, y: 30 }}
                 className="w-full max-w-[520px] bg-white dark:bg-[#1c2237] relative z-10 overflow-hidden shadow-3xl rounded-[32px] border border-black/5 dark:border-white/10 p-0 flex flex-col"
              >
                 <div className="bg-primary px-10 py-8 flex items-center justify-between text-white">
                    <div className="flex items-center gap-5">
                       <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                          <Percent className="w-6 h-6" />
                       </div>
                       <div className="flex flex-col">
                          <h3 className="text-xl font-extrabold tracking-tight">Parametry Handlowe</h3>
                          <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">Modyfikacja matrycy partnera</span>
                       </div>
                    </div>
                    <button onClick={() => setIsDialogOpen(false)} className="w-10 h-10 rounded-full hover:bg-white/20 transition-colors flex items-center justify-center">
                       <Settings className="w-5 h-5 animate-spin-slow" />
                    </button>
                 </div>

                 <div className="p-12 space-y-12">
                    <div className="space-y-8">
                       <div className="flex flex-col gap-3">
                          <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest ml-1 opacity-60">Globalny Rabat Partnera (%)</label>
                          <div className="relative group">
                             <input 
                                type="number" 
                                min="0"
                                max="100"
                                value={tempDiscount}
                                onChange={e => setTempDiscount(e.target.value)}
                                className="w-full h-24 bg-primary/5 dark:bg-white/5 border border-transparent rounded-[24px] px-8 text-6xl font-extrabold text-foreground tabular-nums tracking-tighter outline-none focus:bg-white dark:focus:bg-white/10 focus:border-primary/20 transition-all pr-28 shadow-inner"
                             />
                             <div className="absolute right-8 top-1/2 -translate-y-1/2 text-4xl font-extrabold text-primary/20">%</div>
                          </div>
                       </div>

                       <div className="flex flex-col gap-3">
                          <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest ml-1 opacity-60">Poziom Klasyfikacji (TIER)</label>
                          <div className="relative group">
                             <Database className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
                             <input 
                                value={tempTier}
                                onChange={e => setTempTier(e.target.value.toUpperCase())}
                                placeholder="Np: GOLD_VERIFIER"
                                className="w-full h-16 pl-16 bg-primary/5 dark:bg-white/5 border border-transparent rounded-2xl px-6 text-sm font-bold text-foreground uppercase tracking-widest outline-none focus:bg-white dark:focus:bg-white/10 focus:border-primary/20 transition-all shadow-inner"
                             />
                          </div>
                       </div>
                    </div>

                    <div className="pt-6 flex items-center gap-4">
                       <button 
                          onClick={() => setIsDialogOpen(false)}
                          className="flex-1 h-16 rounded-2xl border border-black/5 dark:border-white/10 text-muted-foreground font-bold text-[11px] uppercase tracking-widest hover:bg-black/5 dark:hover:bg-white/5 transition-all active:scale-95"
                       >
                          Anuluj Zmiany
                       </button>
                       <button 
                          onClick={handleSaveDiscount}
                          disabled={saving}
                          className="flex-1 h-16 bg-primary text-white font-bold text-[11px] uppercase tracking-widest shadow-xl shadow-primary/20 rounded-2xl flex items-center justify-center gap-3 transition-all hover:brightness-110 active:scale-95"
                       >
                          {saving ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                          {saving ? "Zapisywanie..." : "AUTORYZUJ ZMIANY"}
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

