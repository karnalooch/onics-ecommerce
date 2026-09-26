"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Package, Clock, Truck, ShieldCheck, Landmark } from "lucide-react"

export default function B2BClientOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch("/api/orders", { cache: "no-store" });
        const data = await res.json();
        setOrders(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col gap-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Twoje Zamówienia</h1>
        <p className="text-muted-foreground">Śledź weryfikację logistyczną i oczekuj potwierdzeń czasów dostaw od dystrybutora.</p>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
      ) : orders.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
            <h3 className="text-xl font-bold text-gray-700">Brakuje zamówień</h3>
            <p className="text-muted-foreground mt-2 max-w-md">Nie utworzyłeś jeszcze twardego zapytania lub zamówienia e-commerce. Przejdź do cennika i dodaj urządzenia do koszyka.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <Card key={order.id} className="overflow-hidden">
              <div className="bg-muted px-6 py-4 border-b flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="font-bold text-lg">Zamówienie #{order.id}</div>
                  <Badge variant={order.orderType === "ORDER" ? "default" : "secondary"}>
                    {order.orderType === "ORDER" ? "Zakup twardy" : "Zapytanie Luźne"}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  Zgłoszono: {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString()}
                </div>
              </div>

              <CardContent className="p-6">
                {order.paymentProvider === "BANK_TRANSFER" &&
                 order.bankTransferIban && (
                  <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-5">
                    <div className="flex items-start gap-3">
                      <Landmark className="w-5 h-5 text-blue-700 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="text-blue-950">
                            Przelew bankowy
                          </strong>
                          <Badge
                            variant={
                              order.paymentStatus === "PAID"
                                ? "default"
                                : order.paymentStatus === "REFUNDED"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {order.paymentStatus === "PAID"
                              ? "ZAKSIĘGOWANY"
                              : order.paymentStatus === "REFUNDED"
                                ? "ZWRÓCONY"
                                : "OCZEKUJE NA WPŁYW"}
                          </Badge>
                        </div>
                        <div className="grid gap-2 mt-3 text-sm text-blue-950">
                          <div>
                            Odbiorca:{" "}
                            <span className="font-semibold">
                              {order.bankTransferRecipient}
                            </span>
                          </div>
                          <div className="break-all">
                            IBAN:{" "}
                            <span className="font-mono font-semibold">
                              {order.bankTransferIban}
                            </span>
                          </div>
                          <div>
                            Tytuł:{" "}
                            <span className="font-mono font-semibold">
                              {order.bankTransferReference}
                            </span>
                          </div>
                          <div>
                            Kwota:{" "}
                            <span className="font-semibold">
                              {Number(
                                order.bankTransferAmount ??
                                  order.totalPriceFinal
                              ).toFixed(2)}{" "}
                              {order.bankTransferCurrency || "PLN"}
                            </span>
                          </div>
                        </div>
                        {order.paymentStatus === "PENDING" && (
                          <p className="text-xs text-blue-800 mt-3">
                            Użyj dokładnie podanego tytułu przelewu. Status
                            zmieni się po ręcznym potwierdzeniu wpływu przez
                            administratora.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="md:col-span-2">
                    <h4 className="font-semibold mb-4 border-b pb-2">Zawartość pakietu</h4>
                    <div className="space-y-3">
                      {order.items?.map((item: any) => (
                        <div key={item.id} className="flex justify-between items-center text-sm">
                          <div>
                            <span className="font-medium text-gray-800 dark:text-gray-200">{item.name}</span>
                            <span className="text-muted-foreground ml-2">x{item.quantity}</span>
                            <div className="text-xs text-muted-foreground">SKU: {item.sku}</div>
                          </div>
                          <div className="font-bold text-gray-600">
                             {item.price.toFixed(2)} zł / szt.
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-900 border rounded-xl p-5 flex flex-col justify-between">
                    <div>
                      <h4 className="font-semibold mb-4 text-center">Status Operacyjny</h4>

                      {order.status === "PENDING_VERIFICATION" ? (
                        <div className="bg-orange-100 border-orange-200 text-orange-800 p-3 rounded-lg flex gap-3 text-sm">
                          <Clock className="w-5 h-5 shrink-0" />
                          <div>
                            <strong>Oczekuje na Weryfikację</strong>
                            <p className="opacity-80 text-xs mt-1">Administrator musi potwierdzić ostateczne uwarunkowania cenowe oraz załączyć szacowany termin dostawy.</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="bg-green-100 border-green-200 text-green-800 p-3 rounded-lg flex items-center gap-3 text-sm">
                            <ShieldCheck className="w-5 h-5" />
                            <strong>Zamówienie Potwierdzone</strong>
                          </div>
                          <div className="bg-white dark:bg-gray-950 border p-3 rounded-lg flex items-center gap-3 text-sm shadow-sm">
                            <Truck className="w-5 h-5 text-blue-500" />
                            <div>
                              <div className="text-muted-foreground text-xs">Ustalony czas dostawy:</div>
                              <strong className="text-base text-gray-800 dark:text-white">~ {order.estimatedDeliveryDays} dni roboczych</strong>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-8 pt-4 border-t">
                      <div className="flex justify-between text-sm text-muted-foreground mb-1">
                        <span>Wartość pierwotna:</span>
                        <span className="line-through">{Number(order.totalPriceOrig).toFixed(2)} zł</span>
                      </div>
                      <div className="flex justify-between text-xl font-bold text-primary">
                        <span>Ostateczne zapytanie (Netto):</span>
                        <span>{Number(order.totalPriceFinal).toFixed(2)} zł</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
