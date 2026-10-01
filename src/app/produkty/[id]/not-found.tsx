import Link from "next/link"
import { PublicPageHeading } from "@/components/public/PublicPageHeading"
import p from "@/components/public/pages.module.css"
import s from "@/components/public/public.module.css"
export default function ProductNotFound() {
  return <div className={p.page}><PublicPageHeading eyebrow="Katalog CEL-TRONICS" title="Nie znaleźliśmy tego urządzenia">Pozycja mogła zostać usunięta lub zmieniła się jej identyfikacja. Wyszukaj urządzenie ponownie albo skontaktuj się z nami.</PublicPageHeading><Link href="/produkty" className={s.primaryAction}>Wróć do katalogu</Link></div>
}
