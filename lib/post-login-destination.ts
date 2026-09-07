type AuthenticatedRole = "ADMIN" | "SELLER" | "CUSTOMER" | undefined | null

function getSafeInternalPath(callbackUrl: string | null): string | null {
  if (!callbackUrl || !callbackUrl.startsWith("/") || callbackUrl.startsWith("//")) {
    return null
  }

  const url = new URL(callbackUrl, "http://localhost")
  if (url.pathname.startsWith("/auth/")) {
    return null
  }

  return `${url.pathname}${url.search}${url.hash}`
}

export function resolvePostLoginDestination(role: AuthenticatedRole, callbackUrl: string | null): string {
  if (role === "SELLER") {
    return "/admin/pdv"
  }

  const safeCallbackPath = getSafeInternalPath(callbackUrl)
  if (safeCallbackPath) {
    return safeCallbackPath
  }

  return role === "ADMIN" ? "/admin" : "/"
}
