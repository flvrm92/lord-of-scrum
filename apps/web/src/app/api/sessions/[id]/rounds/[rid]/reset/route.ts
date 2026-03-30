import { NextRequest, NextResponse } from 'next/server'
import { resetRound } from '@/application/use-cases'
import { hostActionSchema } from '@/infrastructure/validation/schemas'
import { deps } from '@/lib/deps'
import { handleApiError } from '@/lib/api-error'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; rid: string } },
) {
  try {
    const { rid } = params
    const body = await request.json()
    const data = hostActionSchema.parse(body)
    const round = await resetRound(deps, {
      roundId: rid,
      participantId: data.participantId,
    })
    return NextResponse.json(round)
  } catch (error) {
    return handleApiError(error)
  }
}
