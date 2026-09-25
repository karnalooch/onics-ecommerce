// src/app/sklep/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { initializeMockData } from "@/store/serverStore";
import { ShopDashboardClient } from "./ShopDashboardClient";
import { ShieldAlert, Clock, ArrowLeft } from "lucide-react";
import { calculateCustomerUnitPrice } from "@/lib/commerce";
import Link from "next/link";

/**
 * Modern Retail & B2B Shop Page (Server Component)
 * Consolidated architecture: RSC + Atomic Atoms + Premium Styling.
 * Replaces legacy ClientShop monolithic component.
 */
export default async function SklepPage() {
  const session = await auth();
  if (!session?.user) redirect("/logowanie");

  const { products, categories, users } = initializeMockData();
  const sessionUser = session.user as {
    id?: string
    email?: string | null
  };
  const currentUser = (users as Array<{
    id?: string
    email?: string
    roleType?: string
    isApproved?: boolean
    isBlocked?: boolean
    discount?: number
  }>).find(
    (user) =>
      (sessionUser.id && user.id === sessionUser.id) ||
      (sessionUser.email &&
        user.email?.toLowerCase() === sessionUser.email.toLowerCase())
  );

  if (!currentUser || currentUser.isBlocked) {
    redirect("/logowanie");
  }

  const user = {
    role: currentUser.roleType,
    isApproved: Boolean(currentUser.isApproved),
    discount: Number(currentUser.discount ?? 0),
  };

  // B2B Verification Check
  if (user.role === "BIZ" && !user.isApproved) {
    return <PendingApprovalView />;
  }

  return (
    <div className="container mx-auto py-12 px-6 max-w-[1600px] min-h-screen">
       <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tighter uppercase italic">Katalog <span className="text-primary italic">Produktów</span></h1>
            <p className="text-slate-500 font-medium">Dostęp do {products.length} profesjonalnych rozwiązań SSWiN i CCTV.</p>
          </div>
          
          <div className="flex items-center gap-4 bg-slate-50 border border-slate-100 px-6 py-3 rounded-[2rem] shadow-sm">
             <div className={`w-2 h-2 rounded-full animate-pulse ${user.role === 'BIZ' ? 'bg-primary' : 'bg-emerald-500'}`} />
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
               Profil: {user.role === 'BIZ' ? 'Systemy B2B / Instalator' : 'Klient Detaliczny'}
             </span>
          </div>
       </header>
       
       <ShopDashboardClient
         initialProducts={products.map((product: any) => ({
           ...product,
           price:
             user.role === "BIZ"
               ? calculateCustomerUnitPrice(
                   {
                     id: String(product.id),
                     sku: String(product.sku || ""),
                     name: String(product.name || ""),
                     price: Number(product.price ?? 0),
                     stock: Number(product.stock ?? 0),
                   },
                   { role: "BIZ", discount: Number(user.discount ?? 0) }
                 )
               : Number(product.price ?? 0),
         }))}
         categories={categories}
         role={user.role || "RETAIL"}
       />
    </div>
  );
}

function PendingApprovalView() {
  return (
    <div className="container mx-auto flex items-center justify-center min-h-[80vh] px-6">
      <div className="max-w-xl w-full bg-white border-2 border-slate-100 rounded-[3rem] p-12 text-center shadow-2xl shadow-slate-200/50 animate-in zoom-in-95 duration-500">
         <div className="bg-amber-50 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
            <Clock className="w-10 h-10 text-amber-500" />
         </div>
         <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight italic mb-6">Weryfikacja <span className="text-amber-500 italic">NIP</span> w toku</h2>
         <p className="text-slate-500 font-medium leading-relaxed mb-10">
            Twoje dane firmowe zostały przesłane do administratora. Po zatwierdzeniu otrzymasz dostęp do cen hurtowych B2B oraz systemu przedsprzedaży.
         </p>
         <div className="flex flex-col gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-4 border border-slate-100">
               <ShieldAlert className="w-5 h-5 text-slate-400" />
               <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Status: oczekuje na weryfikację administratora</span>
            </div>
            <Link href="/" className="inline-flex items-center justify-center gap-3 h-14 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10">
               <ArrowLeft className="w-4 h-4" /> Powrót do Strony Głównej
            </Link>
         </div>
      </div>
    </div>
  );
}
