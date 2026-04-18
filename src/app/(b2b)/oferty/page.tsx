import { Suspense } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ListTree, Info } from "lucide-react";
import { B2BDashboardGrid } from "@/components/ui/B2BDashboardGrid";

export default async function B2BOfertyPage() {
  const session = await auth();

  if (!session || (session.user as any)?.role !== 'BIZ') {
    redirect("/logowanie");
  }

  const userNIP = (session.user as any)?.nip || "BRAK PODPIĘTEGO KSEF";
  const userEmail = session.user?.email || "unknown";

  return (
    <div className="container mx-auto py-12 px-6 max-w-7xl animate-in fade-in duration-500">
      
      <div className="mb-10 flex items-center justify-between">
         <h1 className="text-4xl font-extrabold flex items-center gap-4 text-foreground tracking-tight uppercase italic">
           <ListTree className="w-10 h-10 text-primary" />
           Katalog <span className="text-primary italic">Urządzeń</span>
         </h1>
      </div>

      <div className="mb-10 p-6 rounded-3xl bg-primary/5 border border-primary/10 flex items-start gap-5 shadow-sm">
        <div className="p-3 bg-white rounded-2xl shadow-sm border border-primary/20 shrink-0">
          <Info className="w-6 h-6 text-primary" />
        </div>
        <div className="flex flex-col">
           <strong className="text-foreground text-lg font-black tracking-tight mb-1">Masowy katalog sprzętowy V2</strong>
           <p className="text-sm text-muted-foreground font-medium leading-relaxed max-w-3xl">
             Zidentyfikuj urządzenia dla swoich inwestycji. Możesz buforować wybrane pozycje direct do Zapytania Ofertowego. 
             Nasz zespół handlowy zweryfikuje dodatkowe upusty projektowe w czasie poniżej 120 minut.
           </p>
        </div>
      </div>

      <Suspense fallback={
        <div className="animate-in fade-in space-y-8 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 bg-muted rounded-3xl animate-pulse"></div>
            ))}
          </div>
          <div className="text-center font-bold text-muted-foreground mt-8 p-12 border-2 border-dashed border-border rounded-3xl uppercase tracking-widest text-xs">
            Pobieranie indeksów z węzła Strapi / KSeF...
          </div>
        </div>
      }>
        <B2BDashboardGrid nip={userNIP} email={userEmail} />
      </Suspense>
    </div>
  );
}
