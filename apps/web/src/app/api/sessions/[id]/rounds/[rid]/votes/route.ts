import { NextRequest, NextResponse } from 'next/server'
import { submitVote } from '@/application/use-cases'
import { submitVoteSchema } from '@/infrastructure/validation/schemas'
import { deps } from '@/lib/deps'
import { handleApiError } from '@/lib/api-error'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; rid: string } },
) {
  try {
    const { rid } = params
    const body = await request.json()
    const data = submitVoteSchema.parse(body)
    await submitVote(deps, {
      roundId: rid,
      participantId: data.participantId,
      value: data.value,
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleApiError(error)
  }
}
