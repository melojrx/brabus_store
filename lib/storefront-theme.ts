export type BrandTheme = "storefront" | "pdv" | "legacy"

// Header branding is independent from the theme inherited by page content.
export function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/")
}

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
