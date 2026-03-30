import { NextResponse } from 'next/server'
import { DomainError } from '@/domain/errors'
import { ZodError } from 'zod'

interface ErrorBody {
  error: { code: string; message: string }
}

const DOMAIN_STATUS_MAP: Record<string, number> = {
  SESSION_NOT_FOUND: 404,
  PARTICIPANT_NOT_FOUND: 404,
  ROUND_NOT_FOUND: 404,
  SESSION_NOT_ACTIVE: 409,
  ROUND_NOT_VOTING: 409,
  DUPLICATE_DISPLAY_NAME: 409,
  DUPLICATE_VOTE: 409,
  NOT_HOST: 403,
  INVALID_VOTE_VALUE: 422,
  INVALID_DISPLAY_NAME: 422,
}

export function handleApiError(error: unknown): NextResponse<ErrorBody> {
  if (error instanceof DomainError) {
    const status = DOMAIN_STATUS_MAP[error.code] ?? 400
    return NextResponse.json({ error: { code: error.code, message: error.message } }, { status })
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: error.errors.map((e) => e.message).join(', ') } },
      { status: 422 },
    )
  }

  console.error('Unhandled API error:', error)
  return NextResponse.json(
    { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
    { status: 500 },
  )
}
