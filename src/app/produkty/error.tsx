"use client"

import p from "@/components/public/pages.module.css"
import c from "@/components/public/catalog.module.css"
import s from "@/components/public/public.module.css"
export default function CatalogError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className={p.page}><section className={c.empty} role="alert"><h1 className={c.price}>Nie udało się otworzyć katalogu</h1><p>Usługa jest chwilowo niedostępna. Spróbuj ponownie; nie musisz zmieniać filtrów.</p><button className={s.primaryAction} type="button" onClick={reset}>Spróbuj ponownie</button></section></div>
}
