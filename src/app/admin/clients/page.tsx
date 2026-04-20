"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Ban, CheckCircle, Trash2, Search, Eye, Percent, Database, Building2, ChevronRight, MoreHorizontal, User as UserIcon, FileText } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User } from "@/types";

export default function AdminClientsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [tempDiscount, setTempDiscount] = useState<string>("0");
  const [tempTier, setTempTier] = useState<string>("PARTNER");
  const [saving, setSaving] = useState(false);

  const loadUsers = async () => {
    try {
      const res = await fetch("/api/users", { cache: "no-store" });
      const data = await res.json();
      setUsers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

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
      toast.error("Wystąpił błąd.");
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
        toast.success(`Zaktualizowano warunki dla ${selectedUser.username}`);
        setIsDialogOpen(false);
        loadUsers();
      } else {
        const err = await res.json();
        toast.error(err.error || "Błąd zapisu");
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
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-20 font-mono">
      
      {/* 1. TECHNICAL AUDIT HEADER */}
      <header className="flat-panel p-6 bg-slate-950 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
         <div className="space-y-1">
            <div className="flex items-center gap-3">
               <Database className="w-5 h-5 text-primary" />
               <h2 className="text-2xl font-black uppercase tracking-tighter italic leading-none">
                  Ewidencja <span className="text-primary NOT-italic">Partnerów B2B</span>
               </h2>
               <div className="px-2 py-0.5 bg-primary/10 border border-primary/20 rounded-xs">
                  <span className="text-[8px] font-black uppercase text-primary tracking-widest italic">Core v2.1</span>
               </div>
            </div>
            <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">Zarządzanie strukturą hierarchiczną, kredytem i dostępami</p>
         </div>

         <div className="flex items-center gap-4 bg-white/5 p-2 border border-white/10 rounded-sm">
            <div className="flex flex-col items-end">
               <span className="text-[9px] font-black uppercase text-slate-500">Aktywne Konta</span>
               <span className="text-xl font-bold text-white tracking-tighter tabular-nums">{users.filter(u => !u.isBlocked).length}</span>
            </div>
            <div className="h-8 w-[1px] bg-white/10 mx-2" />
            <div className="flex flex-col items-end">
               <span className="text-[9px] font-black uppercase text-slate-500">Zablokowane</span>
               <span className="text-xl font-bold text-status-error tracking-tighter tabular-nums">{users.filter(u => u.isBlocked).length}</span>
            </div>
         </div>
      </header>

      {/* 2. COMMAND & CONTROL BAR */}
      <div className="flat-panel p-3 flex flex-col md:flex-row justify-between items-center gap-4 bg-white">
         <div className="w-full md:w-96 relative flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="SEARCH BY NIP / EMAIL / COMPANY..."
              className="w-full bg-slate-50 border border-border text-[11px] font-black uppercase tracking-widest py-2.5 pl-10 pr-4 outline-none focus:border-primary focus:bg-white transition-all"
            />
         </div>
         
         <div className="flex items-center gap-3">
            <button className="h-9 px-4 border border-border text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2">
               <FileText className="w-3.5 h-3.5 opacity-40" /> Raport Portfela
            </button>
            <button className="h-9 px-6 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all flex items-center gap-2">
               Dodaj Podmiot
            </button>
         </div>
      </div>

      {/* 3. HI-DENSITY DATA GRID */}
      <div className="flex flex-col overflow-hidden">
        {/* Table Headers */}
        <div className="grid grid-cols-12 gap-4 px-6 py-2 bg-slate-100 border-y border-border text-[9px] font-black uppercase tracking-widest text-slate-500 tabular-nums">
           <div className="col-span-1">TAG</div>
           <div className="col-span-3">PODMIOT / IDENTYFIKATOR</div>
           <div className="col-span-3">KONTAKT / KSeF ID</div>
           <div className="col-span-2">MATRYCA RABATOWA</div>
           <div className="col-span-1">STATUS</div>
           <div className="col-span-2 text-right">OPERACJE</div>
        </div>

        {loading ? (
          <div className="p-20 text-center text-slate-400 font-black uppercase tracking-[0.3em] animate-pulse">Analiza bazy danych...</div>
        ) : (
          <div className="flex flex-col">
            {filteredUsers.length === 0 ? (
              <div className="py-20 text-center text-slate-400 italic text-xs uppercase tracking-widest font-black">Brak dopasowań w rejestrze.</div>
            ) : (
              filteredUsers.map(user => (
                <div 
                   key={user.id} 
                   className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-slate-100 hover:bg-slate-50 transition-all group items-center active:scale-[0.995] active:shadow-inner"
                >
                  {/* Tag/Type */}
                  <div className="col-span-1">
                     {user.roleType === 'ADMIN' && <span className="px-1.5 py-0.5 bg-slate-900 text-white text-[8px] font-black uppercase">SYS</span>}
                     {user.roleType === 'BIZ' && <span className="px-1.5 py-0.5 bg-primary/20 text-primary border border-primary/30 text-[8px] font-black uppercase">B2B</span>}
                     {user.roleType === 'RETAIL' && <span className="px-1.5 py-0.5 bg-slate-100 text-slate-400 border border-slate-200 text-[8px] font-black uppercase">B2C</span>}
                  </div>

                  {/* Company/ID */}
                  <div className="col-span-3 flex flex-col min-w-0">
                     <span className="text-[11px] font-black text-slate-900 truncate uppercase tracking-tighter uppercase">{user.companyName || user.username || "BRAK NAZWY"}</span>
                     <span className="text-[8px] font-bold text-slate-400 tracking-widest uppercase">{user.nip ? `NIP: ${user.nip}` : "Osoba Fizyczna"}</span>
                  </div>

                  {/* Email */}
                  <div className="col-span-3 truncate">
                     <span className="text-[10px] font-black text-slate-600 lowercase tracking-tight">{user.email}</span>
                  </div>

                  {/* Pricing Matrix */}
                  <div className="col-span-2 flex items-center gap-3">
                     <div className="flex flex-col items-start leading-none gap-0.5">
                        <span className="text-[11px] font-black text-slate-900 tracking-tighter">-{user.discount || 0}%</span>
                        <span className="text-[7px] font-black text-primary uppercase tracking-[0.2em] italic">{user.tierName || "BASIC_HUB"}</span>
                     </div>
                  </div>

                  {/* Status */}
                  <div className="col-span-1">
                     {user.isBlocked ? (
                       <span className="px-1.5 py-0.5 bg-status-error/10 text-status-error text-[8px] font-black uppercase border border-status-error/20">BLOCK</span>
                     ) : (
                       <span className="px-1.5 py-0.5 bg-status-success/10 text-status-success text-[8px] font-black uppercase border border-status-success/20 animate-pulse">ACTIVE</span>
                     )}
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button 
                        onClick={() => openDiscountModal(user)}
                        className="w-8 h-8 flex items-center justify-center bg-white border border-border text-slate-400 hover:text-primary hover:border-primary transition-all active:scale-90"
                        title="Dostosuj Warunki"
                     >
                        <Percent className="w-4 h-4" />
                     </button>
                     <button 
                        onClick={() => toggleBlock(user.id, user.isBlocked)}
                        className={`w-8 h-8 flex items-center justify-center bg-white border border-border transition-all active:scale-90 ${user.isBlocked ? 'text-status-success' : 'text-status-warning hover:text-status-error'}`}
                        title={user.isBlocked ? "Odblokuj" : "Zablokuj"}
                     >
                        <Ban className="w-4 h-4" />
                     </button>
                     <button 
                        onClick={() => deleteUser(user.id)}
                        className="w-8 h-8 flex items-center justify-center bg-white border border-border text-slate-400 hover:text-status-error hover:bg-status-error/5 transition-all active:scale-90"
                        title="Usuń Trwale"
                     >
                        <Trash2 className="w-4 h-4" />
                     </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Corporate Discount Modal (V4 MISSION CONTROL) */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[400px] border-none bg-slate-950 p-0 shadow-3xl overflow-hidden font-mono">
          <div className="p-6 bg-slate-900 border-b border-white/5 flex items-center gap-4">
             <div className="w-10 h-10 bg-primary flex items-center justify-center rounded-sm">
                <Percent className="w-5 h-5 text-slate-950" />
             </div>
             <div>
                <h2 className="text-lg font-black uppercase tracking-tighter italic text-white leading-none">Matryca Handlowa</h2>
                <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Korekta uprawnień i stawek</span>
             </div>
          </div>
          
          <div className="p-8 space-y-8">
             <div className="flex flex-col gap-3">
               <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">Poziom Rabatowy (%)</Label>
               <input
                 type="number"
                 min="0"
                 max="100"
                 value={tempDiscount}
                 onChange={(e) => setTempDiscount(e.target.value)}
                 className="w-full bg-white/5 border border-white/10 rounded-sm py-4 px-6 text-3xl font-black text-primary outline-none focus:border-primary transition-all"
               />
             </div>
             <div className="flex flex-col gap-3">
               <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">Status Klasyfikacyjny (TIER)</Label>
               <input
                 value={tempTier}
                 onChange={(e) => setTempTier(e.target.value)}
                 placeholder="PRO, VIP, PARTNER"
                 className="w-full bg-white/5 border border-white/10 rounded-sm py-4 px-6 text-base font-black text-white uppercase tracking-widest outline-none focus:border-primary transition-all"
               />
             </div>
          </div>
          
          <div className="p-4 bg-slate-900/50 flex justify-end">
            <button 
              onClick={handleSaveDiscount} 
              disabled={saving}
              className="w-full h-12 bg-primary text-slate-950 font-black uppercase tracking-widest text-[11px] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20"
            >
              {saving ? "PROPAGACJA DANYCH..." : "AUTORYZUJ ZMIANY"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
