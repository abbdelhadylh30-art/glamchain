'use client'

import { useSession } from 'next-auth/react'
import { hasPermission, canAccessNav, canAssignRole, getAssignableRoles } from '@/lib/roles'
import type { Permission, RoleType } from '@/lib/roles'

/**
 * React hook for client-side permission checks.
 *
 * Uses the current NextAuth session to determine the user's role,
 * then provides helper functions for checking permissions.
 *
 * NOTE: Client-side permission checks are for UI convenience only
 * (hiding/disabling buttons). All real enforcement happens server-side
 * via the authorize() function in each API route handler.
 */
export function usePermissions() {
  const { data: session } = useSession()
  const userRole = (session?.user?.role ?? 'staff') as RoleType

  return {
    /** Current user's role */
    userRole,

    /** Check if the current user has a specific permission */
    can: (permission: Permission) => hasPermission(userRole, permission),

    /** Check if the current user can access a navigation section */
    canAccessNav: (navId: string) => canAccessNav(userRole, navId),

    /** Check if the current user can assign a given role to another user */
    canAssignRole: (targetRole: string) => canAssignRole(userRole, targetRole),

    /** Get the list of roles the current user is allowed to assign */
    assignableRoles: getAssignableRoles(userRole),

    /** Check if the current user is a super admin */
    isSuperAdmin: userRole === 'super_admin',

    /** Check if the current user is at least an owner */
    isOwnerOrAbove: hasPermission(userRole, 'settings_view'),
  }
}
