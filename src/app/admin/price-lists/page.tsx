"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { FileSpreadsheet, Download, RefreshCw } from "lucide-react"
import * as XLSX from "xlsx"

const MOCK_PRODUCTS = [
  { id: 1, sku: "CAM-001", name: "Kamera IP 4MP", category: "Kamery", priceNet: 250 },
  { id: 2, sku: "CAM-002", name: "Kamera IP 8MP PTZ", category: "Kamery", priceNet: 850 },
  { id: 3, sku: "REC-001", name: "Rejestrator 4CH", category: "Rejestratory", priceNet: 400 },
  { id: 4, sku: "ALR-001", name: "Czujka PIR", category: "Alarmy", priceNet: 45 },
  { id: 5, sku: "ALR-002", name: "Centrala Alarmowa", category: "Alarmy", priceNet: 550 },
];

export default function PriceListsGenerator() {
  const [loading, setLoading] = useState(false)
  const [discount, setDiscount] = useState(15)

  const handleExportExcel = () => {
    setLoading(true)
    setTimeout(() => {
      // Przygotowanie danych z zachowaniem narzuconego rabatu
      const exportData = MOCK_PRODUCTS.map(p => ({
        "Kod Produktu / SKU": p.sku,
        "Kategoria": p.category,
        "Nazwa": p.name,
        "Cena Netto (Bazowa)": p.priceNet,
        "Rabat (%)": discount,
        "Cena ostateczna (B2B)": parseFloat((p.priceNet * (1 - discount / 100)).toFixed(2))
      }))

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Cennik");
      XLSX.writeFile(wb, `Cennik_Celtronics_${new Date().toLocaleDateString()}.xlsx`);
      
      setLoading(false)
    }, 800)
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <FileSpreadsheet className="h-8 w-8 text-primary" /> Generator Cenników
        </h2>
        <p className="text-muted-foreground">
          Eksportuj dynamiczne cenniki w formatach docelowych (.xlsx) bazujące na danych ze Strapi / WF-Mag.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Parametry Cennika</CardTitle>
            <CardDescription>Skonfiguruj globalne mnożniki dla wybranego dumpa B2B.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Globalny Rabat Instalatorski (%)</label>
              <input 
                type="number" 
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleExportExcel} disabled={loading} className="w-full gap-2">
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Pobierz .XLSX
            </Button>
          </CardFooter>
        </Card>

        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Podgląd danych (Mock Baza)</CardTitle>
            <CardDescription>Symulacja cen po przyznaniu rabatu ({discount}%)</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Produkt</TableHead>
                  <TableHead>Bazowa netto</TableHead>
                  <TableHead className="text-right">Cena B2B (Po procencie)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_PRODUCTS.map((prod) => (
                  <TableRow key={prod.id}>
                    <TableCell className="font-mono">{prod.sku}</TableCell>
                    <TableCell>{prod.name}</TableCell>
                    <TableCell className="text-muted-foreground">{prod.priceNet.toFixed(2)} zł</TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      {(prod.priceNet * (1 - discount / 100)).toFixed(2)} zł
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
