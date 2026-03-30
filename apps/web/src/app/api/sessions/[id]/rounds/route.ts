import { NextRequest, NextResponse } from 'next/server'
import { startRound } from '@/application/use-cases'
import { startRoundSchema } from '@/infrastructure/validation/schemas'
import { deps } from '@/lib/deps'
import { handleApiError } from '@/lib/api-error'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params
    const body = await request.json()
    const data = startRoundSchema.parse(body)
    const round = await startRound(deps, {
      sessionId: id,
      topic: data.topic,
      participantId: data.participantId,
    })
    return NextResponse.json(round, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
