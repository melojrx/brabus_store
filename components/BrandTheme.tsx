"use client"

import { usePathname } from "next/navigation"
import { getBrandTheme } from "@/lib/storefront-theme"

export default function BrandTheme({ children }: { children: React.ReactNode }) {
  const theme = getBrandTheme(usePathname())

  // PDV activation belongs to G4, after its authenticated visual baseline.
  return (
    <div className={`flex min-h-screen flex-1 flex-col ${theme === "storefront" ? "theme-storefront" : ""}`}>
      {children}
    </div>
  )
}
