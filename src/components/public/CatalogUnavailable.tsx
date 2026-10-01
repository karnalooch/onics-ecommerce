import Link from "next/link"
import c from "./catalog.module.css"
import s from "./public.module.css"

export function CatalogUnavailable({ retryHref, reference }: { retryHref: string; reference?: string }) {
  return <section className={c.empty} role="alert"><h2>Katalog jest chwilowo niedostępny</h2><p>Nie udało się odczytać danych. To nie oznacza braku produktów. Twoje filtry pozostały w adresie strony.</p>{reference && <p className={c.muted}>Numer zgłoszenia: {reference}</p>}<div className={s.actions}><a href={retryHref} className={s.primaryAction}>Spróbuj ponownie</a><Link href="/kontakt" className={s.textAction}>Kontakt z CEL-TRONICS</Link></div></section>
}
