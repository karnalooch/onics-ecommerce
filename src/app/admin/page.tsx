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
  Database,
  ShieldCheck,
  Zap,
  Globe
} from "lucide-react";

import { initializeMockData } from "@/store/serverStore";

export default async function AdminDashboard() {
  const session = await auth();

  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    redirect("/logowanie");
  }

  const { users, orders, repairs, products } = initializeMockData();
  
  const unapprovedUsers = users.filter((u: any) => u.roleType === "BIZ" && !u.isApproved);
  const registeredUsers = users.filter((u: any) => u.roleType === "BIZ" && u.isApproved);
  const totalProducts = products.length;
  const pendingQuotes = orders.filter((o: any) => o.status === "INQUIRY" || o.orderType === "INQUIRY");
  const pendingRepairs = repairs.filter((r: any) => r.status !== "DONE");

  return (
    <div className="flex flex-col gap-12 animate-in fade-in duration-700 pb-20">
      
      {/* 1. FLUENT DASHBOARD HEADER */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6">
        <div className="flex items-center gap-6">
           <div className="w-16 h-16 bg-primary text-white flex items-center justify-center rounded-xl shadow-2xl shadow-primary/30">
              <Zap className="w-8 h-8" />
           </div>
           <div className="flex flex-col">
              <div className="flex items-center gap-3">
                 <span className="text-[11px] font-bold uppercase tracking-widest text-primary">Centrum Operacyjne</span>
                 <span className="w-1.5 h-1.5 bg-black/10 dark:bg-white/10 rounded-full" />
                 <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Admin_Node_v4</span>
              </div>
              <h1 className="text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight mt-1">Panel Sterowania</h1>
           </div>
        </div>
        
        <div className="flex items-center gap-10">
           <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status Systemu</span>
              <div className="flex items-center gap-2 mt-1">
                 <div className="w-2.5 h-2.5 bg-green-500 rounded-full shadow-lg shadow-green-500/40 animate-pulse" />
                 <span className="text-[12px] font-bold text-foreground uppercase tracking-tight">Active Online</span>
              </div>
           </div>
        </div>
      </div>

      {/* 2. OPERATIONAL METRICS (FLUENT CARDS) */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard 
          label="Partnerzy B2B" 
          value={registeredUsers.length} 
          subText="Zatwierdzone konta" 
          icon={<Users className="w-5 h-5" />}
          sector="Sprzedaż"
        />
        <StatCard 
          label="Logistyka RMA" 
          value={pendingRepairs.length} 
          subText="Aktywne zgłoszenia" 
          icon={<Wrench className="w-5 h-5" />}
          variant="navy"
          sector="Serwis"
        />
        <StatCard 
          label="Baza PIM" 
          value={totalProducts} 
          subText="Indeksy asortymentu" 
          icon={<Package className="w-5 h-5" />}
          variant="primary"
          sector="Katalog"
        />
        <StatCard 
          label="Wyceny CPQ" 
          value={pendingQuotes.length} 
          subText="Oczekujące oferty" 
          icon={<FileText className="w-5 h-5" />}
          sector="Oferty"
        />
        <StatCard 
          label="Weryfikacja" 
          value={unapprovedUsers.length} 
          subText="Kolejka NIP" 
          icon={<UserPlus className="w-5 h-5" />}
          variant="secondary"
          sector="System"
        />
      </div>

      {/* 3. MAIN WORKSPACE */}
      <div className="grid gap-10 grid-cols-1 xl:grid-cols-12">
        
        {/* Verification Hub */}
        <div className="xl:col-span-8 fluent-card p-0 border-white/10 overflow-hidden shadow-2xl">
          <div className="bg-primary/5 px-8 py-6 border-b border-black/5 dark:border-white/10 flex justify-between items-center">
             <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-primary/10 text-primary flex items-center justify-center rounded-lg">
                   <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Weryfikacja Partnerów B2B</h3>
             </div>
             <Link href="/admin/clients" className="text-[11px] font-bold text-primary hover:underline uppercase tracking-widest transition-all">
                Pełen Rejestr →
             </Link>
          </div>
          
          <div className="p-4">
            {unapprovedUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center group">
                <Activity className="w-12 h-12 text-primary/10 mb-4 group-hover:scale-110 transition-transform" />
                <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-widest">Kolejka Pusta</span>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-black/5 dark:bg-white/5 border-b border-black/5 dark:border-white/10">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground py-4 pl-6">Firma / Partner</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground text-center">NIP</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground text-right pr-6">Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unapprovedUsers.map((user: any) => (
                    <TableRow key={user.id} className="hover:bg-black/5 dark:hover:bg-white/5 border-b border-black/5 dark:border-white/10 last:border-0 transition-colors group">
                      <TableCell className="py-5 pl-6">
                         <div className="flex flex-col">
                            <span className="font-bold text-foreground text-[14px]">{user.companyName}</span>
                            <span className="text-[11px] text-muted-foreground italic">{user.username}</span>
                         </div>
                      </TableCell>
                      <TableCell className="font-bold text-center text-muted-foreground text-[12px] tabular-nums tracking-wider">{user.nip}</TableCell>
                      <TableCell className="text-right pr-6">
                         <div className="flex justify-end gap-3 scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all">
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

        {/* Activity Feed */}
        <div className="xl:col-span-4 fluent-card p-0 border-white/10 overflow-hidden shadow-2xl">
          <div className="bg-primary/5 px-8 py-6 border-b border-black/5 dark:border-white/10 flex justify-between items-center">
             <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-primary/10 text-primary flex items-center justify-center rounded-lg">
                   <Activity className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Ostatnia Aktywność</h3>
             </div>
             <div className="h-7 px-3 bg-primary text-white text-[10px] flex items-center font-bold rounded-md shadow-lg shadow-primary/20">LOG: {pendingQuotes.length}</div>
          </div>
          
          <div className="p-8">
            <div className="space-y-8">
              {pendingQuotes.length > 0 ? (
                pendingQuotes.slice(0, 6).map((quote: any) => (
                  <div key={quote.id} className="flex justify-between items-center group cursor-pointer active-press border-b border-black/5 dark:border-white/10 pb-6 last:border-0 last:pb-0">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                         <span className="font-bold text-foreground text-[13px] tracking-tight group-hover:text-primary transition-colors">{quote.id}</span>
                         <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{quote.user?.email || "Partner B2B"}</span>
                    </div>
                    <div className="flex flex-col items-end leading-none">
                       <span className="text-[16px] font-extrabold text-foreground tabular-nums leading-none">
                          {quote.totalPriceOrig.toFixed(2)}
                       </span>
                       <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1">PLN</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-20">
                  <Globe className="w-12 h-12 text-primary/10 mx-auto mb-4" />
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Brak zdarzeń</span>
                </div>
              )}
            </div>
            
            <button className="w-full mt-8 h-12 rounded-xl bg-primary/5 dark:bg-white/5 text-primary hover:bg-primary hover:text-white font-bold text-[11px] uppercase tracking-widest transition-all active-press border border-primary/10 shadow-sm">
               Szczegółowy Log Zdarzeń
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

function StatCard({ label, value, subText, icon, variant = "default", trend, sector }: { 
  label: string, value: number, subText: string, icon: React.ReactNode, variant?: "default" | "primary" | "secondary" | "navy", trend?: string, sector: string
}) {
  return (
    <div className="fluent-card p-8 flex flex-col gap-6 relative group transition-all active-press border-white/5 shadow-xl">
      <div className="flex items-center justify-between">
         <div className="flex flex-col">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{sector}</span>
            <span className="text-[12px] font-extrabold text-foreground uppercase tracking-tight leading-none">{label}</span>
         </div>
         <div className="w-12 h-12 rounded-xl bg-primary/5 dark:bg-white/5 text-primary flex items-center justify-center transition-all group-hover:bg-primary group-hover:text-white group-hover:scale-110 shadow-sm">
            {icon}
         </div>
      </div>
      
      <div className="flex flex-col leading-none">
         <div className="flex items-end gap-2">
            <span className="text-4xl font-extrabold text-foreground tracking-tighter tabular-nums leading-none">{value}</span>
            {trend && <span className="text-green-500 text-[11px] font-bold mb-1">({trend})</span>}
         </div>
         <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-4">{subText}</span>
      </div>
    </div>
  );
}
