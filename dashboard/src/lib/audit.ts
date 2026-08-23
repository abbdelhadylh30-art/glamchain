/**
 * Audit Logging Utility
 *
 * Provides a structured way to log security-relevant events
 * such as unauthorized access attempts, password changes,
 * user management actions, etc.
 */

import { db } from '@/lib/db'

export interface AuditLogEntry {
  userId?: string
  userEmail?: string
  userRole?: string
  action: string
  resource?: string
  method?: string
  path?: string
  statusCode?: number
  ipAddress?: string
  userAgent?: string
  details?: string
}

/**
 * Write an audit log entry to the database.
 * Uses a non-blocking pattern — failures are logged to console
 * but never throw, so they don't break the main request flow.
 */
export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: entry.userId,
        userEmail: entry.userEmail,
        userRole: entry.userRole,
        action: entry.action,
        resource: entry.resource,
        method: entry.method,
        path: entry.path,
        statusCode: entry.statusCode,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        details: entry.details,
      },
    })
  } catch (error) {
    // Audit logging should never break the main flow
    console.error('[AuditLog] Failed to write audit log:', error)
  }
}

/**
 * Log an unauthorized access attempt (401 or 403).
 */
export async function logUnauthorizedAccess(params: {
  userId?: string
  userEmail?: string
  userRole?: string
  resource: string
  method: string
  path: string
  statusCode: number
  ipAddress?: string
  userAgent?: string
  reason?: string
}): Promise<void> {
  await writeAuditLog({
    userId: params.userId,
    userEmail: params.userEmail,
    userRole: params.userRole,
    action: 'unauthorized_access',
    resource: params.resource,
    method: params.method,
    path: params.path,
    statusCode: params.statusCode,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    details: params.reason ? JSON.stringify({ reason: params.reason }) : undefined,
  })
}

/**
 * Log a password change event.
 */
export async function logPasswordChange(params: {
  userId: string
  userEmail: string
  userRole: string
  changedByUserId: string
  changedByRole: string
  isSelfChange: boolean
  ipAddress?: string
  userAgent?: string
}): Promise<void> {
  await writeAuditLog({
    userId: params.changedByUserId,
    userEmail: params.userEmail,
    userRole: params.changedByRole,
    action: params.isSelfChange ? 'password_change_self' : 'password_change_admin_reset',
    resource: 'auth',
    method: 'PUT',
    path: '/api/auth/change-password',
    statusCode: 200,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    details: JSON.stringify({
      targetUserId: params.userId,
      isSelfChange: params.isSelfChange,
    }),
  })
}

/**
 * Log a user management action (create, update, deactivate).
 */
export async function logUserManagement(params: {
  actorId: string
  actorEmail: string
  actorRole: string
  action: 'user_created' | 'user_updated' | 'user_deactivated' | 'user_activated' | 'user_role_changed'
  targetUserId: string
  targetUserEmail: string
  targetUserRole: string
  details?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}): Promise<void> {
  await writeAuditLog({
    userId: params.actorId,
    userEmail: params.actorEmail,
    userRole: params.actorRole,
    action: params.action,
    resource: 'settings',
    method: 'POST',
    path: '/api/settings',
    statusCode: 200,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    details: JSON.stringify({
      targetUserId: params.targetUserId,
      targetUserEmail: params.targetUserEmail,
      targetUserRole: params.targetUserRole,
      ...params.details,
    }),
  })
}
