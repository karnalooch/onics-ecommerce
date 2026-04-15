"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Wrench, ShieldAlert } from "lucide-react"

export default function RmaInstallerPage() {
  const [formOpen, setFormOpen] = useState(false);

  const MOCK_REPAIRS = [
    { id: "RMA-0012", item: "Rejestrator 4CH", serial: "SN12345678", date: "2026-04-10", status: "W NAPRAWIE" },
    { id: "RMA-0013", item: "Kamera IP 4MP", serial: "SN987654", date: "2026-04-12", status: "WERYFIKACJA" },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center bg-muted/30 p-6 rounded-lg border">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Wrench className="h-8 w-8 text-primary" /> Centrum Serwisowe (RMA)
          </h2>
          <p className="text-muted-foreground mt-2">
            Zgłaszaj usterki i śledź status napraw gwarancyjnych w czasie rzeczywistym.
          </p>
        </div>
        <Button onClick={() => setFormOpen(!formOpen)} size="lg" className="gap-2">
          <ShieldAlert className="h-4 w-4" /> Zgłoś nową naprawę
        </Button>
      </div>

      {formOpen && (
        <Card className="border-primary shadow-sm">
          <CardHeader>
            <CardTitle>Nowe Zgłoszenie RMA</CardTitle>
            <CardDescription>Wypełnij formularz usterki urządzenia wyślij zgłoszenie bezpośrednio do naszego działu technicznego.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Model / Nazwa Urządzenia</label>
                <input type="text" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3" placeholder="np. Kamera IPOX 4MP" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Numer Seryjny (S/N)</label>
                <input type="text" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3" placeholder="Wymagane do gwarancji..." />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Opis usterki / Okoliczności awarii</label>
              <textarea rows={4} className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2" placeholder="Urządzenie zaczęło restartować się po burzy..." />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setFormOpen(false)}>Wyciągnij i anuluj</Button>
            <Button onClick={() => { alert("Zgłoszenie wysłane do Strapi/Backendu!"); setFormOpen(false); }}>Wyślij zgłoszenie</Button>
          </CardFooter>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Twoje aktywne naprawy</CardTitle>
          <CardDescription>Poniżej znajdziesz sprzęt aktualnie zdiagnozowany przez Celtronics.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nr RMA</TableHead>
                <TableHead>Urządzenie</TableHead>
                <TableHead>S/N</TableHead>
                <TableHead>Data Zgłoszenia</TableHead>
                <TableHead className="text-right">Status Serwisu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_REPAIRS.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono font-medium">{r.id}</TableCell>
                  <TableCell>{r.item}</TableCell>
                  <TableCell className="text-muted-foreground">{r.serial}</TableCell>
                  <TableCell>{r.date}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={r.status === "W NAPRAWIE" ? "default" : "secondary"}>{r.status}</Badge>
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
