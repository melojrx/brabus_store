"use client"

import { usePathname } from "next/navigation"
import { getBrandTheme } from "@/lib/storefront-theme"

export default function FooterTheme({ storefront, legacy }: { storefront: React.ReactNode; legacy: React.ReactNode }) {
  return getBrandTheme(usePathname()) === "storefront" ? storefront : legacy
}
