export type RouteAccessRole = "ADMIN" | "BIZ" | "RETAIL"

function matchesRoute(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

export function authorizePageRoute(
  pathname: string,
  role: string | null | undefined
) {
  if (matchesRoute(pathname, "/admin")) {
    return role === "ADMIN"
  }

  if (
    matchesRoute(pathname, "/dashboard") ||
    matchesRoute(pathname, "/oferty") ||
    matchesRoute(pathname, "/ustawienia")
  ) {
    return role === "BIZ"
  }

  return true
}
