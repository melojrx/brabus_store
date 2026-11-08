import React from "react"
import Image from "next/image"
import { brandAssets } from "@/lib/brand-assets"

export default function BrandLogo({ variant = "storefront" }: { variant?: "storefront" | "pdv" | "admin" }) {
  const logo = brandAssets.horizontal

  return (
    <Image
      src={logo.src}
      width={logo.width}
      height={logo.height}
      alt="Brabu’s Performance Store"
      className={variant === "admin" ? "admin-header-logo" : variant === "pdv" ? "pdv-logo" : "storefront-logo"}
      sizes={variant === "storefront" ? "(max-width: 767px) 155px, 210px" : "128px"}
      unoptimized
    />
  )
}
