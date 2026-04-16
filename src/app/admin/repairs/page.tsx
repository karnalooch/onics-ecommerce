import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, Save, X } from "lucide-react"

export default function AdminRmaPage() {
  const [repairs, setRepairs] = useState([
    { id: "RMA-0012", client: "Instalator ABC", item: "Rejestrator 4CH", serial: "SN12345678", date: "2026-04-10", status: "W NAPRAWIE" },
    { id: "RMA-0013", client: "Tech-Mon Ewa Kowalska", item: "Kamera IP 4MP", serial: "SN987654", date: "2026-04-12", status: "WERYFIKACJA" },
    { id: "RMA-0014", client: "Instalator ABC", item: "Zasilacz buforowy", serial: "BS1002", date: "2026-04-14", status: "ZAKOŃCZONE" },
  ]);

  const [isAdding, setIsAdding] = useState(false);
  const [newRepair, setNewRepair] = useState({ client: "", item: "", serial: "" });

  const handleAdd = () => {
    if (!newRepair.client || !newRepair.item) return;
    const id = `RMA-${Math.floor(Math.random() * 9000) + 1000}`;
    const date = new Date().toISOString().split('T')[0];
    setRepairs([{ ...newRepair, id, date, status: "WERYFIKACJA" }, ...repairs]);
    setNewRepair({ client: "", item: "", serial: "" });
    setIsAdding(false);
  }

  const handleDelete = (id: string) => {
    if (confirm("Usunąć to zgłoszenie?")) {
      setRepairs(repairs.filter(r => r.id !== id));
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold tracking-tight">Kolejka Zgłoszeń Serwisowych</h2>
          <p className="text-muted-foreground">
            Zarządzaj statutami napraw, kontaktuj się z producentami i powiadamiaj instalatorów po diagnozie sprzętu.
          </p>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)} className="gap-2">
          {isAdding ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {isAdding ? "Anuluj" : "Dodaj zgłoszenie"}
        </Button>
      </div>

      {isAdding && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Nowe zgłoszenie ręczne</CardTitle>
            <CardDescription>Wprowadź dane urządzenia otrzymanego od klienta.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-muted-foreground">Klient</label>
                <input 
                  type="text" 
                  value={newRepair.client} 
                  onChange={e => setNewRepair({...newRepair, client: e.target.value})}
                  className="w-full border rounded h-9 px-3 text-sm focus:ring-1 focus:ring-primary"
                  placeholder="Nazwa firmy lub imię"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-muted-foreground">Urządzenie</label>
                <input 
                  type="text" 
                  value={newRepair.item} 
                  onChange={e => setNewRepair({...newRepair, item: e.target.value})}
                  className="w-full border rounded h-9 px-3 text-sm focus:ring-1 focus:ring-primary"
                  placeholder="np. Kamera IP"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-muted-foreground">S/N</label>
                <input 
                  type="text" 
                  value={newRepair.serial} 
                  onChange={e => setNewRepair({...newRepair, serial: e.target.value})}
                  className="w-full border rounded h-9 px-3 text-sm focus:ring-1 focus:ring-primary"
                  placeholder="Numer seryjny"
                />
              </div>
              <Button onClick={handleAdd} className="gap-2">
                <Save className="h-4 w-4" /> Zapisz zgłoszenie
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
                <TableHead className="text-right">Akcja</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {repairs.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-semibold">{r.client}</TableCell>
                  <TableCell className="font-mono text-xs">{r.id}</TableCell>
                  <TableCell>
                    {r.item} <span className="text-[10px] text-muted-foreground ml-1">({r.serial})</span>
                  </TableCell>
                  <TableCell className="text-xs">{r.date}</TableCell>
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
                      <select className="border text-xs rounded p-1 outline-none focus:ring-1 focus:ring-primary">
                        <option>Status: Weryfikacja</option>
                        <option>Status: Wysłano do Producenta</option>
                        <option>Status: Naprawione / Zakończone</option>
                        <option>Status: Odrzucone (Mechaniczne)</option>
                      </select>
                    )}
                    <button 
                      onClick={() => handleDelete(r.id)} 
                      className="p-1 px-2 text-muted-foreground/30 hover:text-destructive transition-colors"
                      title="Usuń zgłoszenie"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
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
