import { NextRequest, NextResponse } from 'next/server'
import { archiveSession } from '@/application/use-cases'
import { hostActionSchema } from '@/infrastructure/validation/schemas'
import { deps } from '@/lib/deps'
import { handleApiError } from '@/lib/api-error'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params
    const body = await request.json()
    const data = hostActionSchema.parse(body)
    await archiveSession(deps, {
      sessionId: id,
      participantId: data.participantId,
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleApiError(error)
  }
}
