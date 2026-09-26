"use client";

import { useSession } from "next-auth/react";
import { useCartStore } from "@/store/cartStore";
import { Trash2, FileText, Send, ShoppingBag, Loader2, UploadCloud, Info, ShieldCheck, CreditCard } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner"; // Jeśli mamy sonner zainstalowane, jeśli nie to mock
import { Button } from "@/components/ui/button";

type CheckoutPaymentMethod = {
  id: "STRIPE" | "BANK_TRANSFER";
  name: string;
  enabled: boolean;
  configured: boolean;
  available: boolean;
  kind: "REDIRECT" | "MANUAL";
  maintenanceMessage: string | null;
};

type BankTransferConfirmation = {
  orderId: string;
  recipient: string;
  iban: string;
  title: string;
  amount: number;
  currency: string;
};

export default function CartPage() {
  const { data: session } = useSession();
  const { items, removeItem, updateQuantity, getTotalPrice, clearCart } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState<"PDF" | "INQUIRY" | "ORDER" | "STRIPE" | "BANK_TRANSFER" | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<CheckoutPaymentMethod[]>([]);
  const [paymentControlEnabled, setPaymentControlEnabled] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);
  const [paymentMethodsLoaded, setPaymentMethodsLoaded] = useState(false);
  const [bankTransferConfirmation, setBankTransferConfirmation] = useState<BankTransferConfirmation | null>(null);
  const router = useRouter();

  // Zabezpieczenie przez Hydration Mismatch przy renderze Local Storage
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!session?.user) {
      setPaymentMethods([]);
      setPaymentControlEnabled(false);
      setPaymentNotice(null);
      setPaymentMethodsLoaded(true);
      return;
    }

    let cancelled = false;
    setPaymentMethodsLoaded(false);

    fetch("/api/payment-methods", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.error || "PAYMENT_METHODS_UNAVAILABLE");

        const controlEnabled = data?.control?.enabled !== false;

        if (!cancelled) {
          setPaymentMethods(data?.methods ?? []);
          setPaymentControlEnabled(controlEnabled);
          setPaymentNotice(
            controlEnabled
              ? null
              : data?.control?.maintenanceMessage ||
                  "Płatności online są obecnie wyłączone."
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPaymentMethods([]);
          setPaymentControlEnabled(false);
          setPaymentNotice("Nie udało się sprawdzić dostępności płatności.");
        }
      })
      .finally(() => {
        if (!cancelled) setPaymentMethodsLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [session?.user]);

  const isB2B = (session?.user as any)?.role === "BIZ" || (session?.user as any)?.role === "ADMIN";
  const availablePaymentMethods = paymentControlEnabled
    ? paymentMethods.filter((method) => method.available)
    : [];

  const unavailablePaymentNotice =
    paymentNotice ||
    paymentMethods.find((method) => method.enabled && !method.configured)
      ?.maintenanceMessage ||
    paymentMethods.find((method) => !method.enabled)?.maintenanceMessage ||
    "Brak aktywnej i poprawnie skonfigurowanej metody płatności.";

  const handlePaymentCheckout = async (method: CheckoutPaymentMethod) => {
    setSubmitting(method.id);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod: method.id,
          items: items.map((item) => ({
            id: item.id,
            quantity: item.quantity,
          })),
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          data?.error || "Nie udało się uruchomić płatności."
        );
      }

      if (method.id === "STRIPE") {
        if (!data?.url) {
          throw new Error("Bramka płatności nie zwróciła adresu przekierowania.");
        }
        window.location.assign(data.url);
        return;
      }

      if (!data?.bankTransfer?.iban || !data?.orderId) {
        throw new Error("Nie udało się pobrać danych do przelewu.");
      }

      setBankTransferConfirmation({
        orderId: data.orderId,
        recipient: data.bankTransfer.recipient,
        iban: data.bankTransfer.iban,
        title: data.bankTransfer.title,
        amount: Number(data.bankTransfer.amount),
        currency: data.bankTransfer.currency || "PLN",
      });
      clearCart();
      toast.success("Zamówienie utworzone. Dane do przelewu są gotowe.");
      setSubmitting(null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Nie udało się uruchomić płatności."
      );
      setSubmitting(null);
    }
  };

  const handleAction = async (action: "PDF" | "INQUIRY" | "ORDER") => {
    setSubmitting(action);
    try {
      if (action === "PDF") {
        // Generowanie oferty PDF lokalnie dla instalatora
        alert("Generuję dokument PDF... (symulacja)");
        window.print();
        setSubmitting(null);
        return;
      }

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: session?.user || { email: "gosc@anon.pl" },
          items,
          orderType: action, 
        }),
      });

      if (response.ok) {
        if (action === "ORDER") {
          alert("✅ Zamówienie weryfikacyjne wysłane! Czekaj na nadanie czasów dostaw przez Admina.");
        } else {
          alert("💬 Zapytanie cenowe wysłane.");
        }
        clearCart();
        router.push("/oferty/zamowienia");
      } else {
        alert("Wystąpił błąd podczas wysyłania do centrali.");
      }
    } catch {
      alert("Błąd połączenia. Spróbuj ponownie.");
    }
    setSubmitting(null);
  };

  if (!mounted) return <div className="p-12 text-center flex justify-center"><Loader2 className="animate-spin text-primary w-8 h-8"/></div>;

  return (
    <div className="container mx-auto py-8 px-4 flex flex-col min-h-screen">
      {/* 1. ProgressBar / Chlebowe okruszki ( SATEL STYLE ) */}
      {isB2B && (
        <div className="flex justify-center mb-12 border-b pb-8">
          <div className="flex items-center gap-12 font-medium text-sm">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-[10px] text-white">✓</div>
              Formularz zamówienia
            </div>
            <div className="flex flex-col items-center gap-2 text-primary font-bold">
              <div className="w-4 h-4 rounded-full bg-yellow-400"></div>
              Twój Koszyk
            </div>
            <div className="flex flex-col items-center gap-2 text-muted-foreground opacity-50">
              <div className="w-4 h-4 rounded-full bg-gray-200"></div>
              Podsumowanie
            </div>
          </div>
        </div>
      )}

      {bankTransferConfirmation ? (
        <div className="max-w-2xl mx-auto w-full rounded-2xl border border-green-200 bg-green-50 p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <ShieldCheck className="w-8 h-8 text-green-600 shrink-0" />
            <div className="w-full">
              <p className="text-xs font-bold uppercase tracking-widest text-green-700">
                Zamówienie {bankTransferConfirmation.orderId}
              </p>
              <h2 className="text-2xl font-bold text-slate-950 mt-1">
                Dane do przelewu
              </h2>
              <div className="mt-6 grid gap-4 text-sm">
                <div>
                  <div className="text-xs text-slate-500 uppercase font-semibold">Odbiorca</div>
                  <div className="font-semibold mt-1">{bankTransferConfirmation.recipient}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 uppercase font-semibold">IBAN</div>
                  <div className="font-mono font-semibold mt-1 break-all">{bankTransferConfirmation.iban}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 uppercase font-semibold">Tytuł przelewu</div>
                  <div className="font-mono font-semibold mt-1">{bankTransferConfirmation.title}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 uppercase font-semibold">Kwota</div>
                  <div className="text-xl font-bold mt-1">
                    {bankTransferConfirmation.amount.toFixed(2)} {bankTransferConfirmation.currency}
                  </div>
                </div>
              </div>
              <p className="mt-6 text-xs text-slate-600">
                Zachowaj dokładny tytuł przelewu — identyfikuje on płatność z zamówieniem.
              </p>
              <Button
                onClick={() => router.push("/oferty/zamowienia")}
                className="mt-6 rounded-xl"
              >
                Przejdź do zamówień
              </Button>
            </div>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-muted/30 border border-dashed rounded-xl p-16 text-center">
          <p className="text-muted-foreground text-lg">Twój koszyk jest pusty.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* MAIN TABLE (Odpowiednik screena nr 3) */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-12 gap-4 pb-4 border-b text-sm font-semibold text-muted-foreground px-4">
              <div className="col-span-5">Nazwa produktu</div>
              <div className="col-span-2 text-right">Cena</div>
              <div className="col-span-2 text-center">Liczba</div>
              <div className="col-span-2 text-right">Suma</div>
              <div className="col-span-1"></div>
            </div>

            <div className="flex flex-col">
              {items.map((item, idx) => (
                <div key={item.id} className="grid grid-cols-12 gap-4 py-6 border-b items-center px-4 hover:bg-muted/10">
                  <div className="col-span-5 flex items-start gap-3">
                    <span className="text-muted-foreground text-xs mt-1">{idx + 1}.</span>
                    <ShieldCheck className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-base text-gray-800 dark:text-gray-200">{item.name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <span className="opacity-50">EAN/SKU:</span> {item.sku}
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-span-2 text-right font-medium">
                    {item.price.toFixed(2)} PLN
                  </div>
                  
                  <div className="col-span-2 flex justify-center">
                    <div className="flex border rounded-sm overflow-hidden h-9 w-24">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-8 flex items-center justify-center bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">-</button>
                      <input 
                        type="text" 
                        value={item.quantity} 
                        readOnly
                        className="w-8 text-center text-sm font-medium border-x focus:outline-none bg-transparent" 
                      />
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-8 flex items-center justify-center bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">+</button>
                    </div>
                  </div>

                  <div className="col-span-2 text-right font-bold text-gray-700 dark:text-gray-300">
                    {(item.price * item.quantity).toFixed(2)} PLN
                  </div>

                  <div className="col-span-1 flex justify-end">
                    <button 
                      onClick={() => removeItem(item.id)} 
                      className="btn-action-red !p-1.5 opacity-40 hover:opacity-100 transition-opacity"
                      title="Usuń z koszyka"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex justify-end">
               <Button variant="destructive" className="bg-red-600 hover:bg-red-700 rounded-full px-8 font-semibold" onClick={clearCart}>
                 Wyczyść koszyk
               </Button>
            </div>
          </div>

          {/* SIDEBAR RIGHT (Import XML + Podsumowanie z 3 przyciskami ze screena nr 1 i promptu) */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 border rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
              <h3 className="font-semibold text-lg mb-2">Importuj plik z zamówieniem</h3>
              <p className="text-xs text-muted-foreground mb-6 flex items-start gap-2 text-left">
                <Info className="w-4 h-4 shrink-0 mt-0.5" /> 
                Możesz zaimportować dane swojego zamówienia z pliku XML (standard EDI) lub korzystając z naszego szablonu zamówienia.
              </p>
              <Button variant="outline" className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 font-semibold border-none rounded-full">
                Wybierz plik
              </Button>
            </div>

            <div className="border rounded-2xl p-6 shadow-sm bg-gray-50 dark:bg-gray-900/50">
              <h3 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100">Podsumowanie</h3>
              
              <div className="flex justify-between items-end mb-8">
                <span className="text-gray-600 dark:text-gray-400 font-medium text-lg">Suma:</span>
                <div className="text-right">
                   <div className="text-3xl font-extrabold text-primary">{getTotalPrice().toFixed(2)} PLN</div>
                   <div className="text-xs text-muted-foreground mt-1">(bez VAT)</div>
                </div>
              </div>

              {isB2B ? (
                <div className="space-y-3">
                  <Button 
                    onClick={() => handleAction("PDF")} 
                    disabled={submitting !== null}
                    variant="outline"
                    className="w-full justify-start gap-3 rounded-xl h-12 font-semibold bg-white border-gray-200 hover:bg-gray-50 dark:bg-gray-950 dark:border-gray-800"
                  >
                    <FileText className="w-5 h-5 text-gray-500" />
                    {submitting === "PDF" ? "Przetwarzanie..." : "Tworzenie oferty (Generuj PDF)"}
                  </Button>
                  
                  <Button 
                    onClick={() => handleAction("INQUIRY")} 
                    disabled={submitting !== null}
                    variant="outline"
                    className="w-full justify-start gap-3 rounded-xl h-12 font-semibold bg-white border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:bg-gray-950 dark:border-gray-800"
                  >
                    <Send className="w-5 h-5 text-blue-500" />
                    {submitting === "INQUIRY" ? "Wysyłanie..." : "Wyślij z luźnym Zapytaniem"}
                  </Button>

                  <Button 
                    onClick={() => handleAction("ORDER")} 
                    disabled={submitting !== null}
                    className="w-full justify-start gap-3 rounded-xl h-12 font-semibold bg-green-600 hover:bg-green-700 text-white shadow-md border-none"
                  >
                    <ShoppingBag className="w-5 h-5" />
                    {submitting === "ORDER" ? <Loader2 className="w-5 h-5 animate-spin" /> : "Wyślij realne ZAMÓWIENIE"}
                  </Button>

                  {availablePaymentMethods.map((method) => (
                    <Button
                      key={method.id}
                      onClick={() => handlePaymentCheckout(method)}
                      disabled={submitting !== null}
                      className="w-full justify-start gap-3 rounded-xl h-12 font-semibold bg-slate-950 hover:bg-slate-800 text-white shadow-md border-none"
                    >
                      {submitting === method.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <CreditCard className="w-5 h-5" />
                      )}
                      {method.id === "STRIPE"
                        ? `Zapłać online przez ${method.name}`
                        : method.name}
                    </Button>
                  ))}

                  {paymentMethodsLoaded && availablePaymentMethods.length === 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[11px] text-slate-500">
                      {unavailablePaymentNotice} Nadal możesz wysłać zamówienie do ręcznej realizacji.
                    </div>
                  )}

                  <p className="text-[11px] text-muted-foreground text-center pt-2">
                    Naciśnięcie Zamówienia rezerwuje kolejkę. Oczekuj potwierdzenia czasu dostawy przez Administratora.
                  </p>
                </div>
              ) : (
                <Button className="w-full h-14 text-lg font-bold rounded-xl" onClick={() => router.push("/rejestracja")}>
                  Zaloguj się aby Kupić
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
