import Image from "next/image"

type BrandLogoProps = { className?: string; eager?: boolean }

/** Approved outlined artwork; dimensions match the SVG viewBox. */
export function BrandLogo({ className, eager = false }: BrandLogoProps) {
  return <Image src="/assets/logo.svg" alt="CEL-TRONICS" width={2045} height={515} unoptimized loading={eager ? "eager" : "lazy"} className={className} />
}
