import React from "react"
import Link from "next/link"
import { Instagram, MapPin, Truck } from "lucide-react"

type StorefrontInfoStripProps = {
  address: string
  instagram: string
  instagramUrl: string
}

export default function StorefrontInfoStrip({ address, instagram, instagramUrl }: StorefrontInfoStripProps) {
  return (
    <section className="storefront-info" aria-label="Informações da loja">
      <ul className="storefront-container storefront-info-grid">
        <li className="storefront-info-item">
          <Truck aria-hidden="true" />
          <div>
            <p className="storefront-info-title">Entrega na região</p>
            <p className="storefront-info-description">Consulte a entrega para sua cidade</p>
          </div>
        </li>
        <li>
          <Link href="/loja" className="storefront-info-item storefront-info-link">
            <MapPin aria-hidden="true" />
            <div>
              <p className="storefront-info-title">Loja física</p>
              <p className="storefront-info-description">{address}</p>
            </div>
          </Link>
        </li>
        <li>
          <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="storefront-info-item storefront-info-link">
            <Instagram aria-hidden="true" />
            <div>
              <p className="storefront-info-title">Siga a Brabu’s</p>
              <p className="storefront-info-description">{instagram}</p>
            </div>
          </a>
        </li>
      </ul>
    </section>
  )
}
