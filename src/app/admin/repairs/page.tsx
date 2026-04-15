"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default function AdminRmaPage() {
  const MOCK_REPAIRS = [
    { id: "RMA-0012", client: "Instalator ABC", item: "Rejestrator 4CH", serial: "SN12345678", date: "2026-04-10", status: "W NAPRAWIE" },
    { id: "RMA-0013", client: "Tech-Mon Ewa Kowalska", item: "Kamera IP 4MP", serial: "SN987654", date: "2026-04-12", status: "WERYFIKACJA" },
    { id: "RMA-0014", client: "Instalator ABC", item: "Zasilacz buforowy", serial: "BS1002", date: "2026-04-14", status: "ZAKOŃCZONE" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Kolejka Zgłoszeń Serwisowych</h2>
        <p className="text-muted-foreground">
          Zarządzaj statutami napraw, kontaktuj się z producentami i powiadamiaj instalatorów po diagnozie sprzętu.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kanban statusowy reklamacji (RMA)</CardTitle>
          <CardDescription>Oznaczaj priorytety i posuwaj zgłoszenia. Zmiana statusu wywoła e-mail do klienta.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Klient</TableHead>
                <TableHead>RMA ID</TableHead>
                <TableHead>Urządzenie (S/N)</TableHead>
                <TableHead>Data Przyjęcia</TableHead>
                <TableHead>Bieżący Status</TableHead>
                <TableHead className="text-right">Zmiana / Akcja</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_REPAIRS.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-semibold">{r.client}</TableCell>
                  <TableCell className="font-mono">{r.id}</TableCell>
                  <TableCell>
                    {r.item} <span className="text-xs text-muted-foreground">({r.serial})</span>
                  </TableCell>
                  <TableCell>{r.date}</TableCell>
                  <TableCell>
                    <Badge variant={
                      r.status === "ZAKOŃCZONE" ? "outline" : 
                      (r.status === "W NAPRAWIE" ? "default" : "destructive")
                    }>
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {r.status !== "ZAKOŃCZONE" && (
                      <select className="border text-xs rounded p-1">
                        <option>Status: Weryfikacja</option>
                        <option>Status: Wysłano do Producenta</option>
                        <option>Status: Naprawione / Zakończone</option>
                        <option>Status: Odrzucone (Mechaniczne)</option>
                      </select>
                    )}
                    <Button size="sm" variant="secondary" className="px-2" onClick={() => alert("Status zaktualizowany!")}>
                      Zapisz
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
