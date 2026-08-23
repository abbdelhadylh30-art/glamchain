import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { logPasswordChange, logUnauthorizedAccess } from '@/lib/audit'
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit'
import { changePasswordSchema, formatZodError } from '@/lib/validations'

/**
 * POST /api/auth/change-password
 *
 * Dedicated endpoint for changing the current user's password.
 * Requires the current password to be verified before the change is allowed.
 *
 * Rate limited to 5 attempts per minute per user to prevent brute-force attacks.
 */
export async function POST(request: Request) {
  // Step 1: Authenticate — must be logged in
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Step 2: Rate limit — 5 password change attempts per minute per user
  const clientIp = getClientIp(request)
  const rateLimitKey = `password-change:${session.user.id}:${clientIp}`
  const { allowed, remaining, resetTime } = await checkRateLimit(
    rateLimitKey,
    RATE_LIMITS.PASSWORD_CHANGE.limit,
    RATE_LIMITS.PASSWORD_CHANGE.windowMs
  )

  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many password change attempts. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((resetTime - Date.now()) / 1000)),
          'X-RateLimit-Remaining': '0',
        },
      }
    )
  }

  // Step 3: Parse and validate request body
  try {
    const body = await request.json()

    // Validate input with Zod
    const result = changePasswordSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: formatZodError(result.error) },
        { status: 400 }
      )
    }

    const { currentPassword, newPassword } = result.data

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: 'New password must be different from current password' },
        { status: 400 }
      )
    }

    // Step 4: Verify current password
    const user = await db.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const bcrypt = await import('bcryptjs')
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    )

    if (!isCurrentPasswordValid) {
      // Log the failed attempt
      logUnauthorizedAccess({
        userId: session.user.id,
        userEmail: session.user.email,
        userRole: session.user.role,
        resource: 'auth',
        method: 'POST',
        path: '/api/auth/change-password',
        statusCode: 401,
        ipAddress: clientIp,
        reason: 'incorrect_current_password',
      })

      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      )
    }

    // Step 5: Hash and save the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await db.user.update({
      where: { id: session.user.id },
      data: { password: hashedPassword },
    })

    // Step 6: Audit log the successful password change
    await logPasswordChange({
      userId: session.user.id,
      userEmail: session.user.email!,
      userRole: session.user.role,
      changedByUserId: session.user.id,
      changedByRole: session.user.role,
      isSelfChange: true,
      ipAddress: clientIp,
    })

    return NextResponse.json(
      {
        message: 'Password changed successfully',
        remaining,
      },
      {
        headers: {
          'X-RateLimit-Remaining': String(remaining),
        },
      }
    )
  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json(
      { error: 'Failed to change password' },
      { status: 500 }
    )
  }
}
