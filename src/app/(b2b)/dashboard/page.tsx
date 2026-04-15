import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ShieldCheck, UserCircle2, Info } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();

  if (!session || (session.user as any)?.role !== 'BIZ') {
    redirect("/logowanie");
  }

  const userNIP = (session.user as any)?.nip || "BRAK PODPIĘTEGO KSEF";

  return (
    <div className="container mx-auto py-12 px-4 max-w-7xl">
      
      {/* Moduł Powitalny (Dashboard Header) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold flex items-center gap-3 mb-2 text-slate-800">
            <UserCircle2 className="w-8 h-8 text-blue-600" />
            Panel Sterowania B2B
          </h1>
          <p className="text-slate-500 font-medium">Uzyskujesz dostęp do cen na szczeblu dystrybucji hurtowej.</p>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-start gap-4 relative z-10 shadow-sm">
          <ShieldCheck className="w-6 h-6 text-emerald-600 mt-0.5" />
          <div className="flex flex-col">
            <span className="text-sm font-bold text-emerald-800 uppercase tracking-widest">KSeF Validated</span>
            <span className="text-emerald-700 font-mono font-medium">NIP: {userNIP}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Twój Poziom</span>
          <div className="mt-3 text-3xl font-black text-emerald-600">Instalator A</div>
          <span className="mt-2 text-sm font-medium text-slate-500">Stały Rabat: 15%</span>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Ostatni wniosek</span>
          <div className="mt-3 text-3xl font-black text-amber-500">Przetwarzany</div>
          <span className="mt-2 text-sm font-medium text-slate-500">Zapytanie #ZQ-441</span>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Naprawy (RMA)</span>
          <div className="mt-3 text-3xl font-black text-blue-600">1 W Toku</div>
          <span className="mt-2 text-sm font-medium text-slate-500">Zobacz zakładkę Serwis</span>
        </div>
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-6 rounded-2xl shadow-lg border border-slate-800 flex flex-col justify-between">
          <span className="text-sm font-bold text-slate-300 uppercase tracking-wider">Twoje Zakupy YTD</span>
          <div className="mt-3 text-3xl font-black text-white">42 500 zł</div>
          <span className="mt-2 text-sm font-medium text-indigo-200">+12% w stosunku do zeszłego kwartału</span>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-blue-50 border border-blue-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="bg-white p-3 rounded-xl shadow-sm border border-blue-100 mt-1">
             <Info className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex flex-col">
             <strong className="text-blue-900 text-lg">Składanie Wniosków Ofertowych</strong>
             <p className="text-slate-600 font-medium mt-1">
               Zgodnie z wdrożonym rygorem B2B, platforma operuje na wycenach masowych. Przejdź do zakładki Katalog Sprzętu, zbuforuj urządzenia i zgłoś Zapytanie Ofertowe, aby uzyskać dedykowany kosztorys od naszych handlowców.
             </p>
          </div>
        </div>
        <a href="/oferty" className="shrink-0 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all text-center">
            Przejdź do Katalogu
        </a>
      </div>
    </div>
  );
}
