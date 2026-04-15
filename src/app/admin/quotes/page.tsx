"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { FileText, Printer, Plus, Trash2 } from "lucide-react"

const MOCK_PRODUCTS = [
  { id: 1, sku: "CAM-001", name: "Kamera IP 4MP", category: "Kamery", priceNet: 250 },
  { id: 2, sku: "CAM-002", name: "Kamera IP 8MP PTZ", category: "Kamery", priceNet: 850 },
  { id: 5, sku: "ALR-002", name: "Centrala Alarmowa", category: "Alarmy", priceNet: 550 },
];

export default function QuotesGenerator() {
  const [items, setItems] = useState([{ productId: 1, qty: 2, discount: 5 }]);
  const [clientInfo, setClientInfo] = useState({ name: "Firma Instalatorska XYZ", nip: "1234567890" });

  const addLineItem = () => {
    setItems([...items, { productId: 1, qty: 1, discount: 0 }]);
  }

  const removeLineItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  }

  const updateItem = (index: number, field: string, val: number) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = val;
    setItems(newItems);
  }

  const getProduct = (id: number) => MOCK_PRODUCTS.find(p => p.id === id) || MOCK_PRODUCTS[0];

  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      const p = getProduct(item.productId);
      const rowTotal = (p.priceNet * (1 - item.discount / 100)) * item.qty;
      return sum + rowTotal;
    }, 0);
  }

  const handlePrint = () => {
    window.print();
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 print:m-0 print:p-0">
      <div className="flex justify-between items-center print:hidden">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" /> Generator Ofert B2B
          </h2>
          <p className="text-muted-foreground">
            Konstruuj dedykowane oferty z indywidualnymi rabatami i eksportuj je od razu do PDF dla klienta.
          </p>
        </div>
        <Button onClick={handlePrint} className="gap-2">
          <Printer className="h-4 w-4" /> Wygeneruj PDF
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3 print:block print:w-full">
        {/* Editor (Hidden on print) */}
        <div className="col-span-1 space-y-4 print:hidden">
          <Card>
            <CardHeader>
              <CardTitle>Klient</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nazwa Klienta / Firmy</label>
                <input 
                  type="text" 
                  value={clientInfo.name}
                  onChange={(e) => setClientInfo({...clientInfo, name: e.target.value})}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">NIP</label>
                <input 
                  type="text" 
                  value={clientInfo.nip}
                  onChange={(e) => setClientInfo({...clientInfo, nip: e.target.value})}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Linie Oferty</CardTitle>
              <Button size="sm" variant="outline" onClick={addLineItem}><Plus className="h-3 w-3" /> Dodaj dodatek</Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item, idx) => (
                <div key={idx} className="flex flex-col gap-2 p-3 border rounded-md relative">
                  <button onClick={() => removeLineItem(idx)} className="absolute top-2 right-2 text-destructive hover:opacity-70">
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <select 
                    value={item.productId}
                    onChange={(e) => updateItem(idx, 'productId', Number(e.target.value))}
                    className="flex h-9 w-full max-w-[90%] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  >
                    {MOCK_PRODUCTS.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                  </select>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs">Ilość sztuk:</label>
                      <input type="number" min="1" value={item.qty} onChange={(e) => updateItem(idx, 'qty', Number(e.target.value))} className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm" />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs">Rabat (%):</label>
                      <input type="number" min="0" value={item.discount} onChange={(e) => updateItem(idx, 'discount', Number(e.target.value))} className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm" />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Live Preview (Visible on print) */}
        <Card className="col-span-2 print:border-none print:shadow-none print:col-span-1 print:w-full">
          <CardHeader className="print:pb-8">
            <div className="flex justify-between items-start">
              <div>
                <img src="/assets/logo.svg" alt="CEL-TRONICS" className="h-8 mb-4 brightness-0" />
                <h1 className="text-2xl font-bold uppercase text-primary">Oferta Handlowa</h1>
                <p className="text-sm text-muted-foreground">Data wygenerowania: {new Date().toLocaleDateString()}</p>
              </div>
              <div className="text-right text-sm">
                <p className="font-bold">Celtronics S.C.</p>
                <p>NIP: 123-456-78-90</p>
                <p>ul. Niklowa 22, 08-110 Siedlce</p>
              </div>
            </div>
            <div className="mt-8 border-t pt-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase">Nabywca:</h3>
              <p className="font-bold text-lg">{clientInfo.name}</p>
              <p>NIP: {clientInfo.nip}</p>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted hover:bg-muted">
                  <TableHead>Lp.</TableHead>
                  <TableHead>Nazwa urządzenia / SKU</TableHead>
                  <TableHead className="text-right">Ilość</TableHead>
                  <TableHead className="text-right">Cena Kat. (Netto)</TableHead>
                  <TableHead className="text-right">Rabat (%)</TableHead>
                  <TableHead className="text-right font-bold">Wartość Netto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, idx) => {
                  const p = getProduct(item.productId);
                  const priceAfterDiscount = p.priceNet * (1 - item.discount / 100);
                  const lineTotal = priceAfterDiscount * item.qty;
                  return (
                    <TableRow key={idx}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.sku}</p>
                      </TableCell>
                      <TableCell className="text-right">{item.qty}</TableCell>
                      <TableCell className="text-right">{p.priceNet.toFixed(2)} zł</TableCell>
                      <TableCell className="text-right text-destructive">{item.discount}%</TableCell>
                      <TableCell className="text-right font-bold">{lineTotal.toFixed(2)} zł</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            
            <div className="mt-8 flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-lg font-bold border-t-2 pt-2 border-primary">
                  <span>Razem Netto:</span>
                  <span>{calculateTotal().toFixed(2)} zł</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Podatek VAT (23%):</span>
                  <span>{(calculateTotal() * 0.23).toFixed(2)} zł</span>
                </div>
                <div className="flex justify-between text-xl font-bold pt-2 border-t text-primary">
                  <span>Razem Brutto:</span>
                  <span>{(calculateTotal() * 1.23).toFixed(2)} zł</span>
                </div>
              </div>
            </div>
            <div className="mt-16 text-xs text-muted-foreground text-center border-t pt-4">
              Powyższa oferta nie stanowi oferty handlowej w rozumieniu art. 66 § 1 Kodeksu Cywilnego. Ceny podlegają zmianom z uwagi na wahania kursów walut. Ważność oferty: 7 dni.
            </div>
          </CardContent>
        </Card>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:block, .print\\:block * {
            visibility: visible;
          }
          .print\\:block {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}} />
    </div>
  )
}
