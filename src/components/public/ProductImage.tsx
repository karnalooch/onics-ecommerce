"use client"

import Image from "next/image"
import { useState } from "react"
import { Package } from "lucide-react"
import c from "./catalog.module.css"

type Props = { src?: string; large?: boolean }
export function ProductImage({ src, large = false }: Props) {
  const [failedSource, setFailedSource] = useState<string | undefined>()
  const safe = typeof src === "string" && (/^\/(?!\/)/.test(src) || /^https:\/\//.test(src))
  return <div className={large ? c.imageLarge : c.image}>
    {safe && src !== failedSource ? <Image src={src} alt="" width={large ? 400 : 80} height={large ? 320 : 80} unoptimized referrerPolicy="no-referrer" onError={() => setFailedSource(src)} /> : <span className={c.imageFallback}><Package size={large ? 48 : 26} aria-hidden="true" /><span>Brak zdjęcia</span></span>}
  </div>
}
