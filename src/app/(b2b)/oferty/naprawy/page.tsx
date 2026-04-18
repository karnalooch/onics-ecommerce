"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Wrench, ShieldAlert, Clock, ChevronRight } from "lucide-react"

export default function RmaInstallerPage() {
  const [formOpen, setFormOpen] = useState(false);

  const MOCK_REPAIRS = [
    { id: "RMA-0012", item: "Rejestrator 4CH", serial: "SN12345678", date: "2026-04-10", status: "W NAPRAWIE" },
    { id: "RMA-0013", item: "Kamera IP 4MP", serial: "SN987654", date: "2026-04-12", status: "WERYFIKACJA" },
  ];

  return (
    <div className="container mx-auto py-10 px-6 max-w-7xl space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight flex items-center gap-3 uppercase italic text-foreground">
            <Wrench className="h-10 w-10 text-primary" /> Centrum <span className="text-primary tracking-tighter">RMA</span>
          </h2>
          <p className="text-muted-foreground font-medium mt-2">
            Monitoruj postępy napraw i zgłaszaj nowe incydenty serwisowe Celtronics.
          </p>
        </div>
        <Button onClick={() => setFormOpen(!formOpen)} size="lg" className="rounded-2xl px-8 py-6 h-auto font-black uppercase tracking-widest gap-3 shadow-lg shadow-primary/20">
          <ShieldAlert className="h-5 w-5" /> Zgłoś Naprawę
        </Button>
      </div>

      {formOpen && (
        <Card className="border-primary/20 bg-primary/5 shadow-2xl rounded-[2rem] overflow-hidden animate-in zoom-in-95 duration-200">
          <CardHeader className="p-8">
            <CardTitle className="text-2xl font-black uppercase italic tracking-tight">Nowy <span className="text-primary">Protokół</span> Usterki</CardTitle>
            <CardDescription className="font-medium text-muted-foreground">Wprowadź dane urządzenia, aby wygenerować unikalny numer RMA w systemie.</CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">Model Urządzenia</label>
                <input type="text" className="flex h-12 w-full rounded-2xl border border-border bg-background px-4 font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all" placeholder="np. IPOX 4MP Dome" />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">Numer Seryjny (S/N)</label>
                <input type="text" className="flex h-12 w-full rounded-2xl border border-border bg-background px-4 font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all" placeholder="SN..." />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">Charakterystyka błędu</label>
              <textarea rows={4} className="flex min-h-[120px] w-full rounded-2xl border border-border bg-background px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all" placeholder="Opisz dokładnie kiedy i w jakich okolicznościach wystąpił problem..." />
            </div>
          </CardContent>
          <CardFooter className="px-8 py-6 bg-muted/30 border-t flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setFormOpen(false)} className="rounded-xl font-bold">Anuluj</Button>
            <Button onClick={() => setFormOpen(false)} className="rounded-xl font-black px-8">Wyślij do Serwisu</Button>
          </CardFooter>
        </Card>
      )}

      <div className="bg-card border border-border rounded-[2rem] shadow-sm overflow-hidden">
        <div className="p-8 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-primary" />
                <h3 className="text-xl font-black uppercase tracking-tight">Aktywne <span className="text-primary italic">Zlecenia</span></h3>
            </div>
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-50">Ostatnia synchronizacja: przed chwilą</span>
        </div>
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest px-8">ID RMA</TableHead>
              <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest">Model</TableHead>
              <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest">S/N</TableHead>
              <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest">Data</TableHead>
              <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-right px-8">Aktualny Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_REPAIRS.map(r => (
              <TableRow key={r.id} className="hover:bg-primary/5 transition-colors group">
                <TableCell className="font-mono font-black text-primary py-6 px-8">{r.id}</TableCell>
                <TableCell className="font-bold">{r.item}</TableCell>
                <TableCell className="text-muted-foreground text-xs font-bold leading-none">{r.serial}</TableCell>
                <TableCell className="text-xs font-bold text-muted-foreground">
                  {new Date(r.date).toLocaleDateString("pl-PL")}
                </TableCell>
                <TableCell className="text-right px-8">
                  <div className="flex items-center justify-end gap-3">
                    <Badge variant="outline" className={`rounded-lg px-3 py-1 font-black uppercase text-[10px] ${r.status === "W NAPRAWIE" ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground border-border"}`}>
                        {r.status}
                    </Badge>
                    <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
