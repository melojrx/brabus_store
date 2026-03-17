import { auth } from "./auth"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isApiAuthRoute = req.nextUrl.pathname.startsWith("/api/auth")
  const isPublicRoute = ["/", "/auth/login", "/auth/register", "/loja", "/contato"].includes(req.nextUrl.pathname) || req.nextUrl.pathname.startsWith("/products") || req.nextUrl.pathname.startsWith("/cart")
  
  if (isApiAuthRoute) return

  if (!isLoggedIn && !isPublicRoute && req.nextUrl.pathname.startsWith("/account")) {
    return Response.redirect(new URL("/auth/login", req.nextUrl))
  }

  if (!isLoggedIn && !isPublicRoute && req.nextUrl.pathname.startsWith("/checkout")) {
      return Response.redirect(new URL("/auth/login?returnUrl=/checkout", req.nextUrl))
  }

  if (!isLoggedIn && req.nextUrl.pathname.startsWith("/admin")) {
    return Response.redirect(new URL("/auth/login", req.nextUrl))
  }

  if (isLoggedIn && req.nextUrl.pathname.startsWith("/admin") && req.auth?.user?.role !== "ADMIN") {
    return Response.redirect(new URL("/", req.nextUrl))
  }
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
