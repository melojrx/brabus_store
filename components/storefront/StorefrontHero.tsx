import React from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { brandAssets } from "@/lib/brand-assets"

export default function StorefrontHero() {
  const artwork = brandAssets.hero

  return (
    <section className="storefront-hero" aria-labelledby="storefront-heading">
      <div
        aria-hidden="true"
        className="storefront-hero-atmosphere"
        style={{ backgroundImage: `url("${brandAssets.atmosphere.src}")` }}
      />
      <div className="storefront-container storefront-hero-grid">
        <div className="storefront-hero-copy">
          <p className="storefront-eyebrow">Aracoiaba · Ceará</p>
          <h1 id="storefront-heading" className="storefront-headline">
            Para quem treina{" "}
            <span>de verdade</span>
          </h1>
          <p className="storefront-hero-description">
            Suplementos, moda fitness masculina e acessórios para sua rotina de treino.
          </p>
          <div className="storefront-hero-actions">
            <Link href="/products?category=suplementos" className="storefront-button storefront-button-primary">
              Ver suplementos <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <Link href="/products?category=roupas-fitness" className="storefront-button storefront-button-secondary">
              Moda masculina
            </Link>
          </div>
        </div>
        <div className="storefront-hero-art">
          <Image
            src={artwork.src}
            width={artwork.width}
            height={artwork.height}
            alt="Brabu’s Performance Store — Força de Verdade"
            sizes="(max-width: 767px) 300px, (max-width: 1023px) 360px, 520px"
            className="storefront-hero-signature"
            preload
            unoptimized
          />
        </div>
      </div>
    </section>
  )
}
