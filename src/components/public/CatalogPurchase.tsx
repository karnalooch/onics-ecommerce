import Link from "next/link"
import { AddToCartButton } from "@/components/ui/AddToCartButton"
import { catalogPriceState, toCartProduct, type PublicCatalogProduct } from "@/lib/publicCatalogPresentation"
import c from "./catalog.module.css"
import s from "./public.module.css"

export function CatalogPurchase({ product, ownerKey, signedIn }: { product: PublicCatalogProduct; ownerKey: string | null; signedIn: boolean }) {
  const state = catalogPriceState(product, signedIn)
  if (state === "login") return <div className={c.purchase}><p className={c.muted}>Ceny i dostępność dla partnerów</p><Link href="/logowanie" className={s.partnerAction}>Zaloguj się po ceny</Link></div>
  if (state === "restricted") return <div className={c.purchase}><p className={c.muted}>Warunki konta wymagają weryfikacji.</p><Link href="/kontakt" className={s.textAction}>Skontaktuj się z nami</Link></div>
  if (state === "unpriced") return <div className={c.purchase}><p className={c.muted}>Cena do potwierdzenia</p><Link href="/kontakt" className={s.textAction}>Zapytaj o urządzenie</Link></div>
  const stock = product.stock
  return <div className={c.purchase}>
    <strong className={c.price}>{new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(product.price!)}</strong><span className={c.muted}>Cena netto</span>
    <p className={c.stock}>{typeof stock === "number" && Number.isFinite(stock) && stock >= 0 ? `${stock} szt. — stan katalogowy` : "Stan do potwierdzenia"}</p>
    <AddToCartButton product={toCartProduct(product)} ownerKey={ownerKey} />
  </div>
}
