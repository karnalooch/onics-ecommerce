import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import AdminActions from "./AdminActions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Wrench, 
  Package, 
  FileText, 
  AlertCircle, 
  ChevronRight, 
  TrendingUp, 
  UserPlus,
  Activity,
  ArrowUpRight,
  Database
} from "lucide-react";

import { initializeMockData } from "@/store/serverStore";

export default async function AdminDashboard() {
  const session = await auth();

  if (!session?.user || (session.user as any).role !== "ADMIN") {
    // Development bypass for UI/UX testing
    // redirect("/");
  }

  const { users, orders, repairs, products } = initializeMockData();
  
  const unapprovedUsers = users.filter((u: any) => u.roleType === "BIZ" && !u.isApproved);
  const registeredUsers = users.filter((u: any) => u.roleType === "BIZ" && u.isApproved);
  const totalProducts = products.length;
  const pendingQuotes = orders.filter((o: any) => o.status === "INQUIRY" || o.orderType === "INQUIRY");
  const pendingRepairs = repairs.filter((r: any) => r.status !== "DONE");

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-700">
      
      {/* 1. COMMAND HEADER (HORIZONTAL DENSITY) */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 border-b border-slate-100 pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-gradient-to-b from-[#1e2335] to-[#cbd5e1] text-white flex items-center justify-center rounded-lg italic font-black shadow-md shadow-[#1e2335]/30">CD</div>
             <h2 className="text-3xl font-black tracking-tighter text-[#1e2335] uppercase italic leading-none">OPERATIONAL_COMMAND</h2>
          </div>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] ml-12">
            Zasoby: B2B_PARTNERS / PIM_VAULT / RMA_LOGISTICS
          </p>
        </div>
        
        <div className="flex items-center gap-4">
           <div className="flex flex-col items-end leading-none">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">System_Node_Ok</span>
              <span className="text-[10px] font-black text-primary uppercase mt-1 italic leading-none">REBUILD_COMPLETE_V4</span>
           </div>
           <div className="h-10 px-4 bg-white border border-slate-100 flex items-center justify-center rounded-none">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
           </div>
        </div>
      </div>

      {/* 2. OPERATIONAL METRICS (FLAT HORIZONTAL GRID) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard 
          label="Partnerzy B2B" 
          value={registeredUsers.length} 
          subText="Zatwierdzone konta" 
          icon={<Users className="w-4 h-4" />}
          trend="+2"
        />
        <StatCard 
          label="Logistyka RMA" 
          value={pendingRepairs.length} 
          subText="Aktywne zgłoszenia" 
          icon={<Wrench className="w-4 h-4 text-white" />}
          variant="navy"
        />
        <StatCard 
          label="Baza PIM" 
          value={totalProducts} 
          subText="Indeksy asortymentu" 
          icon={<Package className="w-4 h-4" />}
          variant="primary"
        />
        <StatCard 
          label="Wyceny CPQ" 
          value={pendingQuotes.length} 
          subText="Oczekujące oferty" 
          icon={<FileText className="w-4 h-4" />}
        />
        <StatCard 
          label="Weryfikacja" 
          value={unapprovedUsers.length} 
          subText="Kolejka NIP" 
          icon={<UserPlus className="w-4 h-4" />}
          variant="secondary"
        />
      </div>

      {/* 3. MAIN WORKSPACE (SATEL PATTERN) */}
      <div className="grid gap-6 grid-cols-1 xl:grid-cols-12">
        
        {/* Verification Hub (Left Broad Card) */}
        <div className="xl:col-span-8 satel-card p-0 bg-white overflow-hidden rounded-xl border border-slate-200">
          <div className="bg-gradient-to-b from-[#1e2335] to-[#cbd5e1] text-white px-8 py-5 flex justify-between items-center shadow-md">
             <div className="flex flex-col">
                <h3 className="text-[11px] font-black text-white uppercase tracking-[0.3em] flex items-center gap-3 italic">
                   <Database className="w-4 h-4 text-white" /> B2B_IDENTITY_RECORDS
                </h3>
             </div>
             <Link href="/admin/clients" className="text-[9px] font-black text-slate-300 hover:text-white uppercase tracking-widest transition-colors active-press">
                Pełen_Rejestr →
             </Link>
          </div>
          
          <div className="p-2">
            {unapprovedUsers.length === 0 ? (
              <div className="text-[10px] font-black text-slate-400 text-center py-20 uppercase tracking-[0.4em] italic opacity-30">
                BRAK_ZADAŃ: Rejestr Partnerów Zsynchronizowany.
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50 border-b border-slate-100">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400 py-4 pl-6">Firma / Partner</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400">NIP / VAT_ID</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400">Rejestracja</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400 text-right pr-6">Działania</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unapprovedUsers.map((user: any) => (
                    <TableRow key={user.id} className="hover:bg-slate-50/50 border-b border-slate-50 last:border-0 transition-colors group">
                      <TableCell className="font-black text-slate-950 py-4 pl-6 text-[13px] uppercase tracking-tighter">{user.companyName}</TableCell>
                      <TableCell className="font-bold text-slate-400 text-[11px] tabular-nums">{user.nip}</TableCell>
                      <TableCell suppressHydrationWarning className="text-slate-400 text-[10px] font-bold uppercase">{new Date(user.createdAt).toLocaleDateString("pl-PL")}</TableCell>
                      <TableCell className="text-right pr-6">
                         <div className="flex justify-end gap-2">
                            <AdminActions actionType="approveUser" userId={user.id} />
                            <AdminActions actionType="deleteUser" userId={user.id} />
                         </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        {/* Activity Feed (Right Narrow Card) */}
        <div className="xl:col-span-4 satel-card p-0 bg-white overflow-hidden rounded-xl border border-slate-200">
          <div className="bg-gradient-to-b from-[#1e2335] to-[#cbd5e1] px-8 py-5 flex justify-between items-center shadow-md">
             <h3 className="text-[11px] font-black text-white uppercase tracking-[0.3em] flex items-center gap-3 italic">
                <Activity className="w-4 h-4 text-white" /> SYSTEM_ACTIVITY
             </h3>
             <div className="h-6 px-3 bg-white/20 backdrop-blur-sm text-white text-[9px] flex items-center font-black rounded-sm shadow-sm border border-white/30">LOG: {pendingQuotes.length}</div>
          </div>
          
          <div className="p-6">
            <div className="space-y-6">
              {pendingQuotes.length > 0 ? (
                pendingQuotes.slice(0, 6).map((quote: any) => (
                  <div key={quote.id} className="flex justify-between items-center group cursor-pointer active-press border-b border-slate-50 pb-4 last:border-0 last:pb-0">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                         <span className="font-black text-slate-950 text-[12px] uppercase tracking-tight group-hover:text-primary transition-colors">{quote.id}</span>
                         <ArrowUpRight className="w-3 h-3 text-slate-200 group-hover:text-primary transition-colors" />
                      </div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{quote.user?.email || "Partner_B2B"}</span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                       <span className="text-[13px] font-black text-slate-950 tabular-nums leading-none">
                          {quote.totalPriceOrig.toFixed(2)}
                       </span>
                       <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">PLN_NETTO</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-[10px] font-black text-slate-300 text-center py-20 uppercase tracking-[0.4em] italic opacity-50">
                  QUIET_NODE: Brak zdarzeń.
                </div>
              )}
            </div>
            
            <button className="w-full mt-6 h-10 bg-slate-50 text-slate-400 hover:text-slate-950 font-black text-[10px] uppercase tracking-widest border border-slate-100 active-press transition-all">
               Szczegółowy_Dziennik_Zdarzeń
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

function StatCard({ label, value, subText, icon, variant = "default", trend }: { 
  label: string, value: number, subText: string, icon: React.ReactNode, variant?: "default" | "primary" | "secondary" | "navy", trend?: string 
}) {
  const iconSets = {
    default: "bg-slate-50 text-slate-400 border-slate-100 rounded-md",
    primary: "bg-gradient-to-br from-primary to-blue-600 text-white border-transparent shadow-lg shadow-blue-500/30 rounded-md",
    secondary: "bg-blue-50 text-blue-600 border border-blue-100 rounded-md",
    navy: "bg-gradient-to-b from-[#1e2335] to-[#cbd5e1] text-white border-transparent shadow-lg shadow-[#1e2335]/30 rounded-md"
  };

  return (
    <div className="satel-card p-6 bg-white border border-slate-200 flex flex-col gap-5 relative group no-blur rounded-xl">
      <div className="flex items-center justify-between">
         <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic leading-none">{label}</span>
         </div>
         <div className={`w-10 h-10 flex items-center justify-center border transition-all duration-300 group-hover:scale-110 ${iconSets[variant]}`}>
            {icon}
         </div>
      </div>
      
      <div className="flex flex-col leading-none">
         <div className="flex items-end gap-2">
            <span className="text-4xl font-black text-slate-950 tracking-tighter tabular-nums leading-none">{value}</span>
            {trend && <span className="text-primary text-[10px] font-black italic mb-1">({trend})</span>}
         </div>
         <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-3">{subText}</span>
      </div>
    </div>
  );
}
