import React from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowUpRight, Package } from "lucide-react"
import { objectiveArtwork } from "@/lib/brand-assets"

type ObjectiveCategory = {
  id: string
  slug: string
  title: string
  href: string
  description: string
}

export default function ObjectiveCategories({ categories }: { categories: ObjectiveCategory[] }) {
  return (
    <section className="storefront-categories" aria-labelledby="objectives-heading">
      <div className="storefront-container">
        <h2 id="objectives-heading" className="storefront-section-title">Encontre seu <span>objetivo</span></h2>
        <div className="storefront-category-grid">
          {categories.map((category) => {
            const artwork = objectiveArtwork[category.slug]
            return (
              <Link key={category.id} href={category.href} className="storefront-category-card">
                <div className="storefront-category-media">
                  {artwork ? (
                    <Image src={artwork.image.src} alt={artwork.alt} width={artwork.image.width} height={artwork.image.height}
                      sizes="(max-width: 767px) 100vw, 33vw" unoptimized style={{ objectPosition: artwork.image.objectPosition }} />
                  ) : <Package aria-hidden="true" className="storefront-category-placeholder" />}
                </div>
                <div className="storefront-category-content">
                  <div className="storefront-category-title"><h3>{artwork?.title ?? category.title}</h3><ArrowUpRight aria-hidden="true" /></div>
                  <p>{artwork?.description ?? category.description}</p>
                </div>
              </Link>
            )
          })}
        </div>
        {categories.length === 0 && <p className="py-12 text-center text-gray-400">Nenhuma categoria disponível no momento.</p>}
      </div>
    </section>
  )
}
