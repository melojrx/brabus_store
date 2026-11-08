"use client"

import { usePathname } from "next/navigation"
import { getBrandTheme } from "@/lib/storefront-theme"

export default function BrandTheme({ children }: { children: React.ReactNode }) {
  const theme = getBrandTheme(usePathname())

  return (
    <div className={`flex min-h-screen flex-1 flex-col ${theme === "legacy" ? "" : `theme-${theme}`}`}>
      {children}
    </div>
  )
}
