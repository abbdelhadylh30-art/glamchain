import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

/**
 * Handle Prisma errors with appropriate HTTP status codes.
 * Returns a NextResponse with the correct status code and message.
 */
export function handleApiError(error: unknown, context: string = 'operation') {
  console.error(`${context} error:`, error)

  // Prisma-specific errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2025':
        return NextResponse.json(
          { error: 'Record not found' },
          { status: 404 }
        )
      case 'P2002':
        return NextResponse.json(
          { error: 'A record with this value already exists' },
          { status: 409 }
        )
      case 'P2003':
        return NextResponse.json(
          { error: 'Related record not found' },
          { status: 400 }
        )
      case 'P2014':
        return NextResponse.json(
          { error: 'Required relation violation' },
          { status: 400 }
        )
    }
  }

  // Generic server error
  return NextResponse.json(
    { error: `Failed to ${context}` },
    { status: 500 }
  )
}
