/**
 * GlamChain Role Definitions — Single Source of Truth
 *
 * All role-related constants, types, and utilities live here.
 * Both server-side and client-side code import from this file.
 */

// ---------------------------------------------------------------------------
// Role enum values — must match Prisma schema enum
// ---------------------------------------------------------------------------
export const Role = {
  SUPER_ADMIN: 'super_admin',
  OWNER: 'owner',
  RECEPTIONIST: 'receptionist',
  STAFF: 'staff',
} as const

export type RoleType = (typeof Role)[keyof typeof Role]

export const ROLES: RoleType[] = [
  Role.SUPER_ADMIN,
  Role.OWNER,
  Role.RECEPTIONIST,
  Role.STAFF,
]

// ---------------------------------------------------------------------------
// Role hierarchy — higher number = more privileges
// ---------------------------------------------------------------------------
export const ROLE_HIERARCHY: Record<RoleType, number> = {
  super_admin: 100,
  owner: 50,
  receptionist: 20,
  staff: 10,
}

// ---------------------------------------------------------------------------
// Role display metadata
// ---------------------------------------------------------------------------
export const ROLE_LABELS: Record<RoleType, string> = {
  super_admin: 'Super Admin',
  owner: 'Owner',
  receptionist: 'Receptionist',
  staff: 'Staff',
}

export const ROLE_COLORS: Record<RoleType, string> = {
  super_admin: 'bg-rose-100 text-rose-700',
  owner: 'bg-purple-100 text-purple-700',
  receptionist: 'bg-teal-100 text-teal-700',
  staff: 'bg-amber-100 text-amber-700',
}

export const ROLE_BADGE_COLORS: Record<RoleType, string> = {
  super_admin: 'bg-rose-100 text-rose-700 text-[10px]',
  owner: 'bg-purple-100 text-purple-700 text-[10px]',
  receptionist: 'bg-teal-100 text-teal-700 text-[10px]',
  staff: 'bg-amber-100 text-amber-700 text-[10px]',
}

// ---------------------------------------------------------------------------
// Navigation access — minimum role required to see each section
// ---------------------------------------------------------------------------
export const NAV_ACCESS: Record<string, RoleType> = {
  dashboard: Role.STAFF,
  appointments: Role.STAFF,
  stylists: Role.STAFF,
  customers: Role.RECEPTIONIST,
  services: Role.STAFF,
  financials: Role.OWNER,
  settings: Role.OWNER,
}

// ---------------------------------------------------------------------------
// Permission definitions — maps each permission key to its minimum role
// ---------------------------------------------------------------------------
export const PERMISSIONS = {
  // Dashboard
  dashboard_view: Role.STAFF,
  dashboard_analytics: Role.RECEPTIONIST,

  // Appointments
  appointments_view: Role.STAFF,
  appointments_create: Role.RECEPTIONIST,
  appointments_update: Role.RECEPTIONIST,
  appointments_delete: Role.OWNER,
  appointments_change_status: Role.RECEPTIONIST,

  // Stylists
  stylists_view: Role.STAFF,
  stylists_create: Role.OWNER,
  stylists_update: Role.OWNER,
  stylists_delete: Role.SUPER_ADMIN,

  // Customers
  customers_view: Role.RECEPTIONIST,
  customers_create: Role.RECEPTIONIST,
  customers_update: Role.RECEPTIONIST,
  customers_delete: Role.OWNER,

  // Services
  services_view: Role.STAFF,
  services_create: Role.OWNER,
  services_update: Role.OWNER,
  services_delete: Role.SUPER_ADMIN,

  // Inventory
  inventory_view: Role.STAFF,
  inventory_create: Role.OWNER,
  inventory_update: Role.OWNER,
  inventory_delete: Role.SUPER_ADMIN,

  // Financials
  financials_view: Role.OWNER,
  financials_export: Role.OWNER,

  // Expenses
  expenses_view: Role.OWNER,
  expenses_create: Role.OWNER,
  expenses_update: Role.OWNER,
  expenses_delete: Role.SUPER_ADMIN,

  // Settings
  settings_view: Role.OWNER,
  settings_locations_manage: Role.SUPER_ADMIN,
  settings_users_manage: Role.SUPER_ADMIN,
  settings_general: Role.OWNER,
} as const

export type Permission = keyof typeof PERMISSIONS

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

/**
 * Check if a role has a given permission (hierarchical check).
 * Returns true if the user's role level is >= the required level.
 */
export function hasPermission(role: string, permission: Permission): boolean {
  const requiredRole = PERMISSIONS[permission]
  const userLevel = ROLE_HIERARCHY[role as RoleType] ?? 0
  const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 0
  return userLevel >= requiredLevel
}

/**
 * Check if a role meets the minimum required role for a navigation section.
 */
export function canAccessNav(role: string, navId: string): boolean {
  const requiredRole = NAV_ACCESS[navId] ?? Role.STAFF
  const userLevel = ROLE_HIERARCHY[role as RoleType] ?? 0
  const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 0
  return userLevel >= requiredLevel
}

/**
 * Check if a user with a given role can create/invite another user with a target role.
 * Only super_admin can create super_admin users.
 * No one can create a user with a role higher than their own.
 */
export function canAssignRole(actorRole: string, targetRole: string): boolean {
  const actorLevel = ROLE_HIERARCHY[actorRole as RoleType] ?? 0
  const targetLevel = ROLE_HIERARCHY[targetRole as RoleType] ?? 0
  return actorLevel >= targetLevel
}

/**
 * Check if a given string is a valid role.
 */
export function isValidRole(role: string): role is RoleType {
  return ROLES.includes(role as RoleType)
}

/**
 * Get roles that a given actor role is allowed to assign.
 */
export function getAssignableRoles(actorRole: string): RoleType[] {
  return ROLES.filter((r) => canAssignRole(actorRole, r))
}
