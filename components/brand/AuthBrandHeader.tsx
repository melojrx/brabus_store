import React from "react"
import Link from "next/link"
import BrandLogo from "@/components/brand/BrandLogo"

export default function AuthBrandHeader({ caption }: { caption: string }) {
  return (
    <div className="mb-10 text-center">
      <Link href="/" className="inline-block"><BrandLogo /></Link>
      <p className="mt-2 text-sm uppercase tracking-widest text-[var(--color-foreground)]">{caption}</p>
    </div>
  )
}
