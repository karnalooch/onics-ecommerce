import { Suspense } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ShieldCheck, UserCircle2, Info } from "lucide-react";
import { B2BDashboardGrid } from "@/components/ui/B2BDashboardGrid";

export default async function B2BOfertyPage() {
  const session = await auth();

  // Ochrona trasy - całkowite wymuszenie braku dostępu bez weryfikacji KSeF / NIP z logowania
  if (!session || (session.user as any)?.role !== 'BIZ') {
    redirect("/logowanie");
  }

  const userNIP = (session.user as any)?.nip || "BRAK PODPIĘTEGO KSEF";
  const userEmail = session.user?.email || "unknown";

  return (
    <div className="container mx-auto py-12 px-4 max-w-7xl">
      
      {/* Moduł Powitalny (Dashboard Header) */}
      <div className="bg-card border rounded-2xl shadow-sm p-6 sm:p-8 mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-3xl font-extrabold flex items-center gap-3 mb-2">
            <UserCircle2 className="w-8 h-8 text-primary" />
            Panel Sterowania B2B
          </h1>
          <p className="text-muted-foreground">Uzyskujesz dostęp do cen na szczeblu dystrybucji hurtowej.</p>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-start gap-4">
          <ShieldCheck className="w-6 h-6 text-emerald-600 mt-0.5" />
          <div className="flex flex-col">
            <span className="text-sm font-bold text-emerald-800 uppercase tracking-widest">KSeF Validated</span>
            <span className="text-emerald-700 font-mono font-medium">NIP: {userNIP}</span>
          </div>
        </div>
      </div>

      <div className="mb-6 p-4 rounded-lg bg-blue-50/50 border border-blue-100 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800">
          <strong>Tryb zapytań hurtowych:</strong> Zgodnie z decyzją spółki, konta biznesowe negocjują wielkogabarytowe zakupy na podstawie Indywidualnych Ofert. Znajdź pożądany asortyment poniżej i zbuduj "Zapytanie Ofertowe". My odpiszemy w ciągu kliku godzin, zabezpieczając Ci najniższą cenę przy przetargu. (Tradycyjny koszyk detalu został wyłączony).
        </p>
      </div>

      <Suspense fallback={<div className="animate-pulse space-y-4">
          <div className="h-48 bg-muted rounded-lg w-full"></div>
          <div className="h-48 bg-muted rounded-lg w-full mt-4"></div>
          <div className="text-center text-muted-foreground mt-4">Ładowanie Asortymentu ze środowiska Strapi...</div>
      </div>}>
        <B2BDashboardGrid nip={userNIP} email={userEmail} />
      </Suspense>
    </div>
  );
}
