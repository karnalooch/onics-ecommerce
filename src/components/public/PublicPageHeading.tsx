import type { ReactNode } from "react"
import s from "./pages.module.css"

type Props = { eyebrow: string; title: ReactNode; children?: ReactNode }
export function PublicPageHeading({ eyebrow, title, children }: Props) {
  return <header className={s.intro}><p className={s.eyebrow}>{eyebrow}</p><h1>{title}</h1>{children && <div className={s.lead}>{children}</div>}</header>
}
