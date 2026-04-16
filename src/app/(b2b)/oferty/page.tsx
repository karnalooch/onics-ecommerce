import { Suspense } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ListTree, Info } from "lucide-react";
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
      
      <div className="mb-6 flex items-center justify-between">
         <h1 className="text-3xl font-extrabold flex items-center gap-3 text-slate-800">
           <ListTree className="w-8 h-8 text-blue-600" />
           Katalog Urządzeń (Oferty)
         </h1>
      </div>

      <div className="mb-8 p-5 rounded-xl bg-blue-50/50 border border-blue-100 flex items-start gap-4">
        <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="flex flex-col">
           <strong className="text-blue-900 text-sm">Masowy katalog sprzętowy V2</strong>
           <p className="text-sm text-blue-800 mt-1">
             Znajdź pożądany asortyment poniżej i zbuforuj go w Zapytanie Ofertowe. Nasi handlowcy przygotują odpowiedź w kilka godzin z uwzględnieniem dodatkowych zniżek.
           </p>
        </div>
      </div>

      <Suspense fallback={<div className="animate-pulse space-y-4">
          <div className="h-48 bg-slate-200 rounded-2xl w-full"></div>
          <div className="h-48 bg-slate-200 rounded-2xl w-full mt-4"></div>
          <div className="text-center font-medium text-slate-400 mt-4">Ładowanie Asortymentu ze środowiska Strapi...</div>
      </div>}>
        <B2BDashboardGrid nip={userNIP} email={userEmail} />
      </Suspense>
    </div>
  );
}
