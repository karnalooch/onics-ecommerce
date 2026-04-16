import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Building2, Mail, MapPin, Phone, Settings2, UserCircle2 } from "lucide-react";

export default async function SettingsPage() {
  const session = await auth();

  if (!session || (session.user as any)?.role !== 'BIZ') {
    redirect("/logowanie");
  }

  const user = session.user as any;
  const userNIP = user.nip || "Brak zweryfikowanego NIP";
  
  return (
    <div className="container mx-auto py-12 px-6 max-w-5xl">
       <div className="mb-8">
          <h1 className="text-3xl font-extrabold flex items-center gap-3 text-slate-800">
            <Settings2 className="w-8 h-8 text-emerald-600" />
            Ustawienia Firmy i Dane B2B
          </h1>
          <p className="text-slate-500 mt-2">Zarządzaj informacjami o swoim przedsiębiorstwie widocznymi na fakturach i listach przewozowych.</p>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
               <h2 className="text-xl font-bold mb-6 text-slate-800">Główne Informacje</h2>
               
               <form className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                       <label className="text-sm font-semibold text-slate-600">Pełna Nazwa Firmy</label>
                       <div className="relative">
                         <Building2 className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
                         <input type="text" disabled defaultValue={user.companyName} className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-600 focus:outline-none" />
                       </div>
                       <p className="text-xs text-slate-400 mt-1">Nazwa jest zablokowana po zatwierdzeniu NIP.</p>
                    </div>

                    <div className="space-y-2">
                       <label className="text-sm font-semibold text-slate-600">Numer NIP</label>
                       <input type="text" disabled defaultValue={userNIP} className="w-full px-4 py-2 border border-emerald-200 rounded-xl bg-emerald-50 text-emerald-800 font-mono font-bold focus:outline-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                       <label className="text-sm font-semibold text-slate-600">Adres Email Konta</label>
                       <div className="relative">
                         <Mail className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
                         <input type="email" defaultValue={user.email} className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" />
                       </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-sm font-semibold text-slate-600">Telefon Kontaktowy (Dla Kuriera)</label>
                       <div className="relative">
                         <Phone className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
                         <input type="tel" defaultValue={user.phone || ""} placeholder="+48 000 000 000" className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" />
                       </div>
                    </div>
                  </div>

                  <hr className="border-slate-100 my-6" />

                  <div className="space-y-2">
                     <label className="text-sm font-semibold text-slate-600">Główny Adres Dostaw</label>
                     <div className="relative">
                       <MapPin className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
                       <input type="text" defaultValue={user.address || ""} placeholder="ul. Przemysłowa 1, 00-001 Warszawa" className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" />
                     </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                     <button type="button" className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/20 transition-all">Zapisz Zmiany</button>
                  </div>
               </form>
            </div>
          </div>

          <div className="md:col-span-1 space-y-6">
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl shadow-lg border border-slate-800 p-6 text-white relative overflow-hidden">
               <div className="absolute -right-6 -top-6 opacity-10">
                 <UserCircle2 className="w-32 h-32" />
               </div>
               <h3 className="font-bold text-lg mb-2 relative z-10 flex items-center gap-2">Status Partnera</h3>
               <p className="text-slate-300 text-sm mb-6 relative z-10">Twoje konto posiada pełen dostęp do platformy hurtowej i jest zweryfikowane Certyfikatem KSeF.</p>
               
               <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/20">
                 <p className="text-xs text-slate-300 uppercase tracking-wider font-semibold mb-1">Poziom Rabatowy</p>
                 <p className="text-2xl font-black text-emerald-400">Poziom: GOLD</p>
               </div>
               
               <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center text-sm">
                 <span className="text-slate-400">Opiekun Celtronics:</span>
                 <span className="font-medium text-white hover:underline cursor-pointer">Jan Kowalski</span>
               </div>
            </div>
          </div>
       </div>
    </div>
  );
}
