/**
 * Check if a role has staff-level access (admin panel, PDV, etc).
 * Currently ADMIN and SELLER have equivalent access.
 */
export function isStaffRole(role: string | undefined | null): boolean {
  return role === "ADMIN" || role === "SELLER"
}
