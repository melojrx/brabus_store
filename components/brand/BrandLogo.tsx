import React from "react"
import Image from "next/image"
import { brandAssets } from "@/lib/brand-assets"

export default function BrandLogo() {
  const logo = brandAssets.horizontal

  return (
    <Image
      src={logo.src}
      width={logo.width}
      height={logo.height}
      alt="Brabu’s Performance Store"
      className="storefront-logo"
      sizes="(max-width: 767px) 155px, 210px"
      unoptimized
    />
  )
}
