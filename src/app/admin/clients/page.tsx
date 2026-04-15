"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Mail, Ban, CheckCircle, Trash2, Search, Eye } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner"; // opcjonalnie

export default function AdminClientsPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

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
        if (!currentlyBlocked) alert("✅ Konto zostało natychmiast zablokowane. Odrzuci logowanie.");
        else alert("✅ Odblokowano konto pomyślnie.");
        loadUsers();
      }
    } catch (e) {
      alert("Błąd połączenia z bazą danych.");
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm("⚠️ Czy na pewno chcesz trwale usunąć konto klienta? Tej akcji nie można cofnąć!")) return;
    try {
      const res = await fetch(`/api/users?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        alert("✅ Konto zostało bezpowrotnie wykasowane.");
        loadUsers();
      }
    } catch (e) {
      alert("Wystąpił błąd.");
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (u.companyName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.nip || "").includes(searchTerm)
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Klienci B2B i Detaliczni</h2>
        <p className="text-muted-foreground">
          Zarządzaj kontami B2B (Instalatorzy) oraz B2C (Detal). Ustawiaj blokady dostępowe i edytuj informacje o adresach.
        </p>
      </div>

      <div className="flex bg-white dark:bg-gray-900 border rounded-xl overflow-hidden shadow-sm max-w-md items-center pl-3">
        <Search className="w-5 h-5 text-muted-foreground shrink-0" />
        <input 
          type="text" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Szukaj po e-mailu, NIP lub firmie..."
          className="flex-1 bg-transparent border-none py-3 px-3 outline-none text-sm focus:ring-0"
        />
      </div>

      <div className="border rounded-xl bg-card shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Ładowanie portfolio klientów...</div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Typ Autoryzacji</TableHead>
                <TableHead>ID Firmy / Klienta</TableHead>
                <TableHead>Adres E-Mail</TableHead>
                <TableHead>Rejestracja</TableHead>
                <TableHead>Status Konta</TableHead>
                <TableHead className="text-right">Szybkie Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Brak wyników w bazie.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map(user => (
                  <TableRow key={user.id} className="hover:bg-muted/20">
                    <TableCell>
                       {user.roleType === 'ADMIN' && <Badge variant="default" className="bg-purple-600">Administrator</Badge>}
                       {user.roleType === 'BIZ' && <Badge variant="outline" className="border-blue-500 text-blue-700 bg-blue-50">Instalator B2B</Badge>}
                       {user.roleType === 'RETAIL' && <Badge variant="outline" className="border-green-500 text-green-700 bg-green-50">Klient B2C</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold">{user.companyName || user.username || "Brak Nazwy"}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 font-mono">{user.nip ? `NIP: ${user.nip}` : "Paragon (B2C)"}</div>
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {user.email}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString("pl-PL")}
                    </TableCell>
                    <TableCell>
                       {user.isBlocked ? (
                         <div className="flex items-center gap-1.5 text-red-600 text-xs font-bold uppercase">
                           <Ban className="w-4 h-4" /> Zablokowany
                         </div>
                       ) : (
                         <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold uppercase">
                           <CheckCircle className="w-4 h-4" /> Aktywny
                         </div>
                       )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`mailto:${user.email}`}>
                          <Button variant="outline" size="sm" className="h-8 gap-2 bg-slate-50 border-slate-200 hover:bg-slate-100">
                            <Mail className="w-3.5 h-3.5" />
                            Email
                          </Button>
                        </Link>
                        
                        <Link href={`/admin/clients/${user.id}`}>
                          <Button variant="outline" size="sm" className="h-8 w-8 p-0 border-blue-200 text-blue-600 hover:bg-blue-50">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>

                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => toggleBlock(user.id, user.isBlocked)}
                          className={`h-8 w-8 p-0 ${user.isBlocked ? 'text-emerald-600 hover:bg-emerald-50 border-emerald-200' : 'text-orange-600 hover:bg-orange-50 border-orange-200'}`}
                        >
                          <Ban className="w-4 h-4" />
                        </Button>

                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => deleteUser(user.id)}
                          className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 border-red-200"
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
    </div>
  );
}
