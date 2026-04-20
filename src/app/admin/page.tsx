import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import AdminActions from "./AdminActions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
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
  UserPlus
} from "lucide-react";

import { initializeMockData } from "@/store/serverStore";

export default async function AdminDashboard() {
  const session = await auth();

  if (!session?.user || (session.user as any).role !== "ADMIN") {
    // Tymczasowo nie przekierowujemy tak aby można było testować dev:
    // redirect("/");
  }

  const { users, orders, repairs, products } = initializeMockData();
  
  const unapprovedUsers = users.filter((u: any) => u.roleType === "BIZ" && !u.isApproved);
  const registeredUsers = users.filter((u: any) => u.roleType === "BIZ" && u.isApproved);
  const totalProducts = products.length;
  const pendingQuotes = orders.filter((o: any) => o.status === "INQUIRY" || o.orderType === "INQUIRY");
  const pendingRepairs = repairs.filter((r: any) => r.status !== "DONE");

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-black tracking-tight text-foreground uppercase italic">Zestawienie <span className="text-accent">Dnia</span></h2>
          <p className="text-muted-foreground font-medium">
            Monitorowanie statusów instalatorów, logistyki RMA i zapytań systemowych.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-xl border shadow-sm">
           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
           <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Wszystkie systemy sprawne</span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <StatCard 
          title="Instalatorzy B2B" 
          value={registeredUsers.length} 
          sub="Zatwierdzone konta" 
          icon={<Users className="w-4 h-4" />}
          trend="+2 w tym tygodniu"
        />
        <StatCard 
          title="Serwis / RMA" 
          value={pendingRepairs.length} 
          sub="Zgłoszenia w toku" 
          icon={<Wrench className="w-4 h-4" />}
          variant="secondary"
        />
        <StatCard 
          title="Baza Produktów" 
          value={totalProducts} 
          sub="Aktywne indeksy" 
          icon={<Package className="w-4 h-4" />}
          variant="primary"
        />
        <StatCard 
          title="Nowe Zapytania" 
          value={pendingQuotes.length} 
          sub="Oczekujące" 
          icon={<FileText className="w-4 h-4" />}
        />
        <StatCard 
          title="Do weryfikacji" 
          value={unapprovedUsers.length} 
          sub="Oczekujący na NIP" 
          icon={<UserPlus className="w-4 h-4" />}
          variant="secondary"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Oczekujący Instalatorzy B2B</CardTitle>
            <CardDescription>
              Wymagana weryfikacja NIP w białej księdze dla tych firm.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {unapprovedUsers.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6">
                ✅ Brak kont oczekujących na zatwierdzenie.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Firma</TableHead>
                    <TableHead>NIP</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Akcja</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unapprovedUsers.map((user: any) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.companyName}</TableCell>
                      <TableCell>{user.nip}</TableCell>
                      <TableCell>{new Date(user.createdAt).toLocaleDateString("pl-PL")}</TableCell>
                      <TableCell className="text-right flex justify-end gap-2">
                        <AdminActions actionType="approveUser" userId={user.id} />
                        <AdminActions actionType="deleteUser" userId={user.id} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Ostatnie Zapytania Ofertowe</CardTitle>
            <CardDescription>
              Zgłoszenia wolumenu oczekujące na dodanie stawek.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingQuotes.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6">
                ℹ️ Brak ruszonych zapytań ofertowych.
              </div>
            ) : (
              <div className="space-y-4">
                {pendingQuotes.slice(0, 5).map((quote: any) => (
                  <div key={quote.id} className="flex justify-between items-start border-b pb-3 last:border-0 last:pb-0">
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm">{quote.id}</span>
                      <span className="text-xs text-muted-foreground">{quote.user?.email}</span>
                      <span className="text-xs text-primary mt-1">
                        Suma cennikowa: {quote.totalPriceOrig.toFixed(2)} PLN
                      </span>
                    </div>
                    <Link href="/admin/orders">
                      <Badge variant="outline" className="bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer border-primary/20">
                        Otwórz Negocjacje
                      </Badge>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, sub, icon, variant = "default", trend }: { 
  title: string, value: number, sub: string, icon: React.ReactNode, variant?: "default" | "primary" | "secondary", trend?: string 
}) {
  const styles = {
    default: "text-foreground border-border bg-card",
    primary: "text-primary border-primary/20 bg-primary/5",
    secondary: "text-foreground border-border bg-muted/30"
  };

  const iconStyles = {
    default: "bg-muted text-muted-foreground",
    primary: "bg-primary/20 text-primary",
    secondary: "bg-background border border-border text-muted-foreground"
  };

  return (
    <Card className={`overflow-hidden border shadow-sm transition-all hover:shadow-md ${styles[variant]}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-[10px] font-black uppercase tracking-wider opacity-70">{title}</CardTitle>
        <div className={`p-1.5 rounded-lg ${iconStyles[variant]}`}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-black">{value}</div>
        <p className="text-[10px] font-bold opacity-70 mt-1 uppercase tracking-tight">
          {sub}
        </p>
        {trend && (
          <div className="mt-3 flex items-center gap-1 text-[10px] font-bold text-primary">
             <TrendingUp className="w-3 h-3" />
             {trend}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
