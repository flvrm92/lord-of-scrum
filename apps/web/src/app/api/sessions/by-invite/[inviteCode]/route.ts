import { NextRequest, NextResponse } from 'next/server'
import { getSessionByInviteCode } from '@/application/use-cases'
import { deps } from '@/lib/deps'
import { handleApiError } from '@/lib/api-error'

export async function GET(
  request: NextRequest,
  { params }: { params: { inviteCode: string } },
) {
  try {
    const { inviteCode } = params
    const participantId = request.nextUrl.searchParams.get('participantId')
    const session = await getSessionByInviteCode(deps, inviteCode, participantId)
    return NextResponse.json(session)
  } catch (error) {
    return handleApiError(error)
  }
}