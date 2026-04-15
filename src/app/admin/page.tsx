import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import AdminActions from "./AdminActions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

import { initializeMockData } from "@/store/serverStore";

export default async function AdminDashboard() {
  const session = await auth();

  if (!session?.user || (session.user as any).role !== "ADMIN") {
    // Tymczasowo nie przekierowujemy tak aby można było testować dev:
    // redirect("/");
  }

  const { users, orders, repairs } = initializeMockData();
  
  const unapprovedUsers = users.filter((u: any) => u.roleType === "BIZ" && !u.isApproved);
  const registeredUsers = users.filter((u: any) => u.roleType === "BIZ" && u.isApproved);
  const totalProducts = 455; // Można zasymulować lub później podpiąć Strapi
  const pendingQuotes = orders.filter((o: any) => o.status === "INQUIRY" || o.orderType === "INQUIRY");
  const pendingRepairs = repairs.filter((r: any) => r.status !== "DONE");

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Overview</h2>
        <p className="text-muted-foreground">
          Zarządzaj statystykami swojego e-commerce, zgłoszeniami RMA oraz weryfikuj klientów hurtowych.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Użytkownicy B2B</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{registeredUsers.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Zarejestrowani instalatorzy
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktywne Naprawy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{pendingRepairs.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Zgłoszenia RMA w toku
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Baza Produktów</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{totalProducts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Aktywne indeksy
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nowe Zapytania</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{pendingQuotes.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Oczekujące u handlowca
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-600">Oczekujący (KSeF)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{unapprovedUsers.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Konta do zatwierdzenia wpisu rejestru
            </p>
          </CardContent>
        </Card>
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
                  {unapprovedUsers.map(user => (
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
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer">
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
