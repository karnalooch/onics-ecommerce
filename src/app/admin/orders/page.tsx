"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ShoppingBag, CalendarClock, Loader2, CheckCircle2 } from "lucide-react"

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [validatingOrder, setValidatingOrder] = useState<any | null>(null);

  // States for modal inputs
  const [deliveryDays, setDeliveryDays] = useState<string>("5");
  const [editableItems, setEditableItems] = useState<any[]>([]);

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOrders();
  }, []);

  const openVerificationModal = (order: any) => {
    setValidatingOrder(order);
    setDeliveryDays(order.estimatedDeliveryDays?.toString() || "3");
    // Kopie pozycji z koszyka, by Admin mógł edytować stawkę ZAMÓWIONĄ
    setEditableItems([...order.items]);
  }

  const updateItemPrice = (index: number, newPrice: string) => {
    const updated = [...editableItems];
    updated[index].price = parseFloat(newPrice) || 0;
    setEditableItems(updated);
  }

  const confirmOrder = async () => {
    try {
      await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: validatingOrder.id,
          status: "CONFIRMED",
          estimatedDeliveryDays: parseInt(deliveryDays),
          items: editableItems // wysyłamy ewentualnie nowe zmodyfikowane ceny
        })
      });
      // Symulacja e-maila
      alert("✅ E-mail Weryfikacyjny został wysłany do Klienta z załączonymi czasami realizacji!");
      setValidatingOrder(null);
      fetchOrders();
    } catch {
      alert("Błąd podczas zapisywania!");
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ShoppingBag className="h-8 w-8 text-primary" /> Zamówienia B2B i Czas Dostaw
        </h2>
        <p className="text-muted-foreground">
          Zarządzaj potokiem twardych zamówień. Tutaj jako administrator, nadpisujesz globalne czasy realizacji oraz masz ostateczne okienko modyfikacji cen poszczególnych pozycji przed przyjęciem rezerwacji magazynowej.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Logistyka - Przegląd Kolejki Weryfikacyjnej</CardTitle>
          <CardDescription>Zamówienia wysłane poprzez system E-commerce / Integracja ze stanami WF-Mag.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 flex justify-center"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>
          ) : orders.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">Brak spływających zamówień w buforze.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nr Zamówienia</TableHead>
                  <TableHead>Akcja / Typ</TableHead>
                  <TableHead>Zgłaszający</TableHead>
                  <TableHead>Wartość Startowa</TableHead>
                  <TableHead>Wartość Finalna</TableHead>
                  <TableHead>Stan weryfikacji / Czas dostawy</TableHead>
                  <TableHead className="text-right">Działanie</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono font-bold text-primary">{o.id}</TableCell>
                    <TableCell>
                      {o.orderType === "ORDER" 
                        ? <Badge className="bg-green-600">Rezerwacja LOG / Zamówienie</Badge> 
                        : <Badge variant="secondary">Zapytanie / Wycena Luźna</Badge>}
                    </TableCell>
                    <TableCell>{o.user?.name || o.user?.email}</TableCell>
                    <TableCell>{Number(o.totalPriceOrig).toFixed(2)} zł</TableCell>
                    <TableCell className="font-bold">{Number(o.totalPriceFinal).toFixed(2)} zł</TableCell>
                    <TableCell>
                      {o.status === 'PENDING_VERIFICATION' ? (
                        <span className="flex items-center text-orange-500 font-medium text-xs border border-orange-200 bg-orange-50 px-2 py-1 rounded w-fit">
                           <CalendarClock className="w-3 h-3 mr-1" /> Wymaga oznaczenia dni 
                        </span>
                      ) : (
                        <span className="flex items-center text-green-600 font-medium text-xs border border-green-200 bg-green-50 px-2 py-1 rounded w-fit">
                           <CheckCircle2 className="w-3 h-3 mr-1" /> Zakończono (Dostawa: ~{o.estimatedDeliveryDays} dni)
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                       <Dialog open={validatingOrder?.id === o.id} onOpenChange={(open) => !open && setValidatingOrder(null)}>
                          <DialogTrigger asChild>
                             <Button size="sm" variant={o.status === "PENDING_VERIFICATION" ? "default" : "outline"} onClick={() => openVerificationModal(o)}>
                               {o.status === "PENDING_VERIFICATION" ? "Weryfikuj & Ustal ceny" : "Podgląd nadpisania"}
                             </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl">
                            <DialogHeader>
                              <DialogTitle className="text-2xl">Zarządzanie Czasem i Cenami (#{o.id})</DialogTitle>
                              <DialogDescription>Wiadomość z potwierdzeniem zostanie automatycznie wystosowana do Klienta Poczty Instalatorskiej.</DialogDescription>
                            </DialogHeader>
                            
                            <div className="py-4 space-y-6">
                              <div className="bg-muted px-4 py-3 rounded-lg border flex items-center justify-between">
                                 <div>
                                   <p className="font-semibold text-sm">Nadaj gwarantowany czas dostawy (logistyka)</p>
                                   <p className="text-xs text-muted-foreground">Liczba ta pojawi się w panelu klienta jako "Szacowany czas (Dni Roboczych)"</p>
                                 </div>
                                 <div className="flex items-center gap-2">
                                    <input 
                                       type="number" 
                                       value={deliveryDays} 
                                       onChange={(e) => setDeliveryDays(e.target.value)}
                                       className="w-20 text-center text-xl font-bold bg-background border p-2 rounded-md"
                                       min="1"
                                    />
                                    <strong>Dni</strong>
                                 </div>
                              </div>

                              <div>
                                 <h4 className="font-semibold mb-2">Edycja stawek poszczególnych indeksów:</h4>
                                 <div className="border rounded-lg overflow-hidden">
                                   <table className="w-full text-sm">
                                     <thead className="bg-muted text-muted-foreground font-medium text-left">
                                       <tr>
                                         <th className="p-2 pl-4">Indeks / SKU</th>
                                         <th className="p-2">Zamówiona Ilość</th>
                                         <th className="p-2">Pierwotna Kwota (Systemowa)</th>
                                         <th className="p-2 pr-4 text-right">Ostateczna Kwota (po Mod.)</th>
                                       </tr>
                                     </thead>
                                     <tbody>
                                        {editableItems.map((item, idx) => (
                                          <tr key={idx} className="border-t">
                                            <td className="p-2 pl-4 font-medium">{item.name} <span className="text-xs text-muted-foreground block">{item.sku}</span></td>
                                            <td className="p-2">{item.quantity} szt.</td>
                                            <td className="p-2 text-muted-foreground">{item.price?.toFixed(2)} zł</td>
                                            <td className="p-2 pr-4 text-right">
                                               <input 
                                                 type="number" 
                                                 value={item.price}
                                                 onChange={(e) => updateItemPrice(idx, e.target.value)}
                                                 className="w-24 border text-right p-1 rounded font-bold"
                                                 step="0.01"
                                               /> zł
                                            </td>
                                          </tr>
                                        ))}
                                     </tbody>
                                   </table>
                                 </div>
                                 <div className="mt-4 text-right">
                                   <span className="text-sm text-muted-foreground">Suma bazowa: {Number(o.totalPriceOrig).toFixed(2)} zł</span>
                                   <div className="text-lg font-bold">
                                     Nowa Suma (dla klienta): <span className="text-primary">{editableItems.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0).toFixed(2)} zł</span>
                                   </div>
                                 </div>
                              </div>
                            </div>

                            <DialogFooter>
                              {o.status === "PENDING_VERIFICATION" && (
                                <Button onClick={confirmOrder} className="w-full md:w-auto">Zatwierdź Terminy i Ceny (Wyślij Alert)</Button>
                              )}
                            </DialogFooter>
                          </DialogContent>
                       </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
