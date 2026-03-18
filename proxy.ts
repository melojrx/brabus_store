import { auth } from "./auth"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const pathname = req.nextUrl.pathname
  
  const isApiAuthRoute = pathname.startsWith("/api/auth")
  const isPublicRoute = [
    "/",
    "/auth/login",
    "/auth/register",
    "/loja",
    "/contato",
  ].includes(pathname) ||
    pathname.startsWith("/products") ||
    pathname.startsWith("/cart")

  if (isApiAuthRoute) return

  // Redireciona usuários não autenticados que tentam acessar /account
  if (!isLoggedIn && pathname.startsWith("/account")) {
    return Response.redirect(new URL("/auth/login?callbackUrl=/account", req.nextUrl))
  }

  // Redireciona usuários não autenticados que tentam acessar /checkout
  if (!isLoggedIn && pathname.startsWith("/checkout")) {
    return Response.redirect(new URL("/auth/login?callbackUrl=/checkout", req.nextUrl))
  }

  // Redireciona usuários não autenticados que tentam acessar /admin
  if (!isLoggedIn && pathname.startsWith("/admin")) {
    return Response.redirect(new URL("/auth/login", req.nextUrl))
  }

  // Bloqueia usuários sem role ADMIN de acessar /admin
  if (isLoggedIn && pathname.startsWith("/admin") && req.auth?.user?.role !== "ADMIN") {
    return Response.redirect(new URL("/", req.nextUrl))
  }

  // Redireciona usuários autenticados para fora das páginas de auth
  if (isLoggedIn && (pathname === "/auth/login" || pathname === "/auth/register")) {
    return Response.redirect(new URL("/account", req.nextUrl))
  }
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|placeholder.jpg).*)" ],
}
