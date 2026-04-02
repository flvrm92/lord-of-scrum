import { NextRequest, NextResponse } from 'next/server'
import { removeParticipant } from '@/application/use-cases'
import { removeParticipantSchema } from '@/infrastructure/validation/schemas'
import { deps } from '@/lib/deps'
import { handleApiError } from '@/lib/api-error'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; pid: string } },
) {
  try {
    const { id, pid } = params
    const body = await request.json()
    const data = removeParticipantSchema.parse(body)

    await removeParticipant(deps, {
      sessionId: id,
      participantId: pid,
      requesterId: data.requesterId,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleApiError(error)
  }
}
