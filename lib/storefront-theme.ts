export type BrandTheme = "storefront" | "pdv" | "legacy"

export function getBrandTheme(pathname: string): BrandTheme {
  if (pathname === "/admin/pdv") return "pdv"

  if (
    pathname === "/" ||
    pathname === "/products" ||
    pathname.startsWith("/products/") ||
    pathname === "/loja" ||
    pathname === "/contato"
  ) {
    return "storefront"
  }

  return "legacy"
}
