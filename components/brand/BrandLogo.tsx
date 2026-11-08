import React from "react"
import Image from "next/image"
import { brandAssets } from "@/lib/brand-assets"

export default function BrandLogo({ variant = "storefront" }: { variant?: "storefront" | "pdv" }) {
  const logo = brandAssets.horizontal

  return (
    <Image
      src={logo.src}
      width={logo.width}
      height={logo.height}
      alt="Brabu’s Performance Store"
      className={variant === "pdv" ? "pdv-logo" : "storefront-logo"}
      sizes={variant === "pdv" ? "128px" : "(max-width: 767px) 155px, 210px"}
      unoptimized
    />
  )
}
