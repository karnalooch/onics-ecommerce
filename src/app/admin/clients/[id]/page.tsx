"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Mail, Ban, Trash2, ArrowLeft, Building2, MapPin, Phone, CalendarDays, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner"; // opcjonalnie

export default function ClientProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/users", { cache: "no-store" });
        const allUsers = await res.json();
        const found = allUsers.find((u: any) => u.id === params.id);
        if (found) setUser(found);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [params.id]);

  if (loading) return <div className="p-12 text-center text-muted-foreground animate-pulse">Pobieranie akt klienta...</div>;
  if (!user) return <div className="p-12 text-center text-destructive">Nie znaleziono takiego profilu. Został usunięty lub nie istnieje.</div>;

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex items-center gap-4">
        <Link href="/admin/clients">
          <Button variant="outline" size="icon" className="rounded-full shadow-sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
            Karta Klienta {user.isBlocked ? <Badge variant="destructive">ZABLOKOWANY</Badge> : <Badge variant="default" className="bg-emerald-600">AKTYWNY</Badge>}
          </h2>
          <p className="text-muted-foreground text-sm flex items-center gap-2 mt-1">
            Rejestracja wpłynęła: {new Date(user.createdAt).toLocaleDateString("pl-PL")} o {new Date(user.createdAt).toLocaleTimeString("pl-PL")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Kolumna Lewa: Główne Detale */}
        <div className="col-span-1 md:col-span-2 space-y-6">
          <Card className="shadow-sm border-blue-100 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Tożsamość Operacyjna</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 mb-1">
                    <Building2 className="w-4 h-4" /> Dane Firmowe
                  </h3>
                  <div className="text-lg font-bold">{user.companyName || user.username || "Brak Nazwy Firmy"}</div>
                  <div className="text-sm text-foreground mb-1">Status prawny: {user.nip ? "Zarejestrowana Działalność" : "Osoba Prywatna"}</div>
                  {user.nip && (
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-muted rounded-md mt-2">
                       <span className="font-mono text-sm tracking-widest font-semibold">{user.nip}</span>
                       <Button variant="ghost" size="icon" className="w-6 h-6 hover:bg-white"><Copy className="w-3 h-3" /></Button>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 mb-1">
                    <ShieldCheck className="w-4 h-4" /> Autoryzacja
                  </h3>
                  <div className="text-base font-semibold">
                    {user.roleType === 'BIZ' && "Portfel Hurtowy B2B"}
                    {user.roleType === 'RETAIL' && "Sektor Detaliczny B2C"}
                    {user.roleType === 'ADMIN' && "Pełne Prawa Root (A)"}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    Cennik: {user.roleType === 'BIZ' ? "NETTO (z weryfikacją KSeF)" : "BRUTTO (Końcowy)"}
                  </div>
                </div>
              </div>

              <div className="border-t pt-6 grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div>
                   <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 mb-2">
                     <Mail className="w-4 h-4" /> Adres Konta E-Mail
                   </h3>
                   <div className="font-medium text-blue-600">{user.email}</div>
                </div>
                <div>
                   <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 mb-2">
                     <Phone className="w-4 h-4" /> Telefon Kontaktowy
                   </h3>
                   <div className="font-medium">{user.phone || "Brak Numeru"}</div>
                </div>
              </div>

            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <MapPin className="w-5 h-5 text-muted-foreground" /> Adres do wysyłki (Domyślny)
              </CardTitle>
            </CardHeader>
            <CardContent>
               <p className="text-lg font-medium p-4 bg-muted/40 rounded-xl border border-dashed">
                 {user.address || "Klient nie uzupełnił jeszcze adresu dostawy w systemie."}
               </p>
            </CardContent>
          </Card>
        </div>

        {/* Kolumna Prawa: Obsługa i Logi */}
        <div className="col-span-1 space-y-6">
          <Card className="shadow-sm border-orange-100 bg-orange-50/30">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Akcje Dopuszczalne</CardTitle>
              <CardDescription>Wyegzekwuj procedury e-commerce.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href={`mailto:${user.email}`} className="w-full block">
                <Button className="w-full justify-start gap-3 bg-blue-600 hover:bg-blue-700 h-12 shadow-sm font-semibold rounded-xl">
                  <Mail className="w-4 h-4" /> Wyślij E-mail
                </Button>
              </Link>
              
              <Button variant="outline" className={`w-full justify-start gap-3 h-12 border shadow-sm font-semibold rounded-xl ${user.isBlocked ? 'text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100' : 'text-orange-700 border-orange-200 bg-orange-50 hover:bg-orange-100'}`}>
                <Ban className="w-4 h-4" /> {user.isBlocked ? "Odblokuj Dostęp do Sklepu" : "Zawrzyj Blokadę (Ban)"}
              </Button>

              <Button variant="destructive" className="w-full justify-start gap-3 h-12 shadow-sm font-semibold rounded-xl mt-6">
                <Trash2 className="w-4 h-4" /> Eksterminuj Klienta
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
             <CardHeader>
                <CardTitle className="text-lg">Dodatkowe Logi</CardTitle>
             </CardHeader>
             <CardContent>
                <div className="text-sm text-muted-foreground bg-slate-50 p-4 rounded-lg flex flex-col gap-2">
                  <div className="flex justify-between border-b pb-2">
                     <span>Sesja B2B:</span> <span className="font-mono text-xs">{user.jwt ? "Aktywny Token" : "Zdezaktualizowany"}</span>
                  </div>
                  <div className="flex justify-between pt-1">
                     <span>Potwierdzenie:</span> <span>{user.isApproved ? "Zweryfikowany" : "Świeży"}</span>
                  </div>
                </div>
             </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
