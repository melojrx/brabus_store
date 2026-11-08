import React from "react"
import Link from "next/link"

type ProductCardProps = {
  product: {
    slug: string
    name: string
    price: number
    stock: number
    images: string[]
    category?: { name: string }
    isNew?: boolean
  }
  action?: React.ReactNode
}

export default function ProductCard({ product, action }: ProductCardProps) {
  const image = product.images[0] === "/placeholder.jpg" ? null : product.images[0]
  const href = `/products/${product.slug}`
  const badge = product.stock === 0 ? "Esgotado" : product.stock < 10 ? "Últimas unidades" : product.isNew ? "Novo" : null
  return (
    <article className="storefront-product-card">
      <Link href={href} className="storefront-product-media" aria-label={`Ver ${product.name}`}>
        {image ? (
          // Catalog images can come from configured uploads or external suppliers.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={product.name} width={600} height={600} loading="lazy" />
        ) : <span className="storefront-product-placeholder">Imagem indisponível</span>}
        {badge && <span className={`storefront-product-badge ${product.stock === 0 ? "storefront-product-sold-out" : ""}`}>{badge}</span>}
      </Link>
      <div className="storefront-product-content">
        {product.category && <p className="storefront-product-category">{product.category.name}</p>}
        <h3><Link href={href}>{product.name}</Link></h3>
        <div className="storefront-product-footer">
          <span className="storefront-product-price">R$ {product.price.toFixed(2).replace(".", ",")}</span>
          {action && <div className="storefront-product-action">{action}</div>}
        </div>
      </div>
    </article>
  )
}
