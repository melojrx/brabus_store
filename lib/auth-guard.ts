/**
 * Check if a role has staff-level access (admin panel, PDV, etc).
 * ADMIN and SELLER share operational access; sensitive actions require isAdminRole.
 */
export function isStaffRole(role: string | undefined | null): boolean {
  return role === "ADMIN" || role === "SELLER"
}

export function isAdminRole(role: string | undefined | null): boolean {
  return role === "ADMIN"
}
