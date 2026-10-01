import p from "@/components/public/pages.module.css"
import c from "@/components/public/catalog.module.css"
export default function CatalogLoading() {
  return <div className={p.page}><div className={c.loading} role="status" aria-live="polite"><h1 className={c.price}>Wczytywanie katalogu</h1><p>Pobieramy aktualne urządzenia i warunki konta.</p></div></div>
}
