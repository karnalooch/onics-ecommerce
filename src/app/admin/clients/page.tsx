"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Mail, Ban, CheckCircle, Trash2, Search, Eye, Percent } from "lucide-react";
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
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <div className="flex flex-col gap-2">
        <h2 className="text-4xl font-extrabold tracking-tight uppercase italic">Audyt <span className="text-primary tracking-tighter">Klientów B2B</span></h2>
        <p className="text-muted-foreground font-medium">
          Zarządzanie uprawnieniami, warunkami handlowymi i weryfikacja tożsamości w systemie KSeF.
        </p>
      </div>

      <div className="flex bg-card border border-border shadow-sm rounded-2xl overflow-hidden max-w-md items-center pl-4 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
        <Search className="w-5 h-5 text-muted-foreground shrink-0" />
        <input 
          type="text" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Szukaj po e-mailu, NIP lub firmie..."
          className="flex-1 bg-transparent border-none py-4 px-3 outline-none text-sm font-bold focus:ring-0"
        />
      </div>

      <div className="border border-border rounded-[2rem] bg-card shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-20 text-center text-muted-foreground font-black uppercase tracking-widest animate-pulse">Inwentaryzacja portfela...</div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/50 border-b border-border">
              <TableRow className="hover:bg-transparent">
                <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground px-6">Typ</TableHead>
                <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground">Podmiot / ID</TableHead>
                <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground">Email / KSeF</TableHead>
                <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground">Data Rej.</TableHead>
                <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground">Status</TableHead>
                <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground">Warunki</TableHead>
                <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground text-right px-6">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-20 text-muted-foreground font-bold italic">
                    Baza danych nie zwróciła dopasowań.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map(user => (
                  <TableRow key={user.id} className="hover:bg-primary/5 transition-colors group">
                    <TableCell className="px-6 py-5">
                       {user.roleType === 'ADMIN' && <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">ADMIN</Badge>}
                       {user.roleType === 'BIZ' && <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5">PARTNER B2B</Badge>}
                       {user.roleType === 'RETAIL' && <Badge variant="outline" className="text-muted-foreground">DETAL B2C</Badge>}
                    </TableCell>
                    <TableCell className="py-5">
                      <div className="font-extrabold text-foreground tracking-tight">{user.companyName || user.username || "Brak Nazwy"}</div>
                      <div className="text-[10px] font-black text-muted-foreground mt-0.5 tracking-widest uppercase">{user.nip ? `NIP: ${user.nip}` : "Osoba Fizyczna"}</div>
                    </TableCell>
                    <TableCell className="py-5 font-bold text-sm text-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell className="py-5 text-xs font-bold text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString("pl-PL")}
                    </TableCell>
                    <TableCell className="py-5">
                       {user.isBlocked ? (
                         <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-black uppercase tracking-widest opacity-50">
                           <Ban className="w-3.5 h-3.5" /> BLOKADA
                         </div>
                       ) : (
                         <div className="flex items-center gap-1.5 text-primary text-[10px] font-black uppercase tracking-widest animate-pulse">
                           <CheckCircle className="w-3.5 h-3.5" /> AKTYWNY
                         </div>
                       )}
                    </TableCell>
                    <TableCell className="py-5">
                       <div className="flex flex-col gap-1">
                          <Badge className="bg-primary text-primary-foreground border-transparent h-6 px-2 text-[11px] uppercase font-black tracking-tighter">
                            -{user.discount || 0}%
                          </Badge>
                          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                            {user.tierName || "BASIC"}
                          </span>
                       </div>
                    </TableCell>
                    <TableCell className="text-right px-6 py-5">
                      <div className="flex justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                        <Link href={`mailto:${user.email}`}>
                          <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-border bg-background hover:bg-muted hover:text-primary transition-all">
                            <Mail className="w-4 h-4" />
                          </Button>
                        </Link>
                        
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => openDiscountModal(user)}
                          className="h-9 w-9 rounded-xl border-border bg-background text-primary hover:bg-primary/10 transition-all shadow-sm"
                          title="Warunki handlowe"
                        >
                          <Percent className="w-4 h-4" />
                        </Button>

                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => toggleBlock(user.id, user.isBlocked)}
                          className={`h-9 w-9 rounded-xl border-border bg-background transition-all ${user.isBlocked ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                          <Ban className="w-4 h-4" />
                        </Button>

                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => deleteUser(user.id)}
                          className="h-9 w-9 rounded-xl border-border bg-background text-muted-foreground hover:text-red-500 hover:border-red-200 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Corporate Discount Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[440px] rounded-[2rem] border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter text-foreground">
              Warunki <span className="text-primary tracking-tight">Handlowe</span>
            </DialogTitle>
            <DialogDescription className="font-medium text-muted-foreground text-sm mt-2">
              Modyfikacja uprawnień i poziomów rabatowych dla portfela B2B. <br/>
              Podmiot: <strong className="text-foreground tracking-tight">{selectedUser?.companyName || selectedUser?.email}</strong>
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-8 py-6">
            <div className="flex flex-col gap-3">
              <Label htmlFor="discount" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Rabat B2B (%)</Label>
              <Input
                id="discount"
                type="number"
                min="0"
                max="100"
                value={tempDiscount}
                onChange={(e) => setTempDiscount(e.target.value)}
                className="rounded-2xl border-border focus:ring-primary h-14 text-xl font-black text-primary bg-muted/20"
              />
            </div>
            <div className="flex flex-col gap-3">
              <Label htmlFor="tier" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Poziom Partnerstwa (Tier)</Label>
              <Input
                id="tier"
                value={tempTier}
                onChange={(e) => setTempTier(e.target.value)}
                placeholder="PRO, VIP, PARTNER"
                className="rounded-2xl border-border focus:ring-primary h-14 font-extrabold text-foreground uppercase tracking-tight bg-muted/20"
              />
            </div>
          </div>
          
          <DialogFooter className="sm:justify-start">
            <Button 
              onClick={handleSaveDiscount} 
              disabled={saving}
              className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest transition-all shadow-[0_0_30px_-5px_rgba(37,99,235,0.4)] hover:shadow-[0_0_40px_-5px_rgba(37,99,235,0.6)]"
            >
              {saving ? "Prorokowanie zmian..." : "Zapisz Nowe Warunki"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
