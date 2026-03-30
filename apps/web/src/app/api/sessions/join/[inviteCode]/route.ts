import { NextRequest, NextResponse } from 'next/server'
import { joinSession } from '@/application/use-cases'
import { joinSessionSchema } from '@/infrastructure/validation/schemas'
import { deps } from '@/lib/deps'
import { handleApiError } from '@/lib/api-error'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/infrastructure/auth/auth-options'

export async function POST(
  request: NextRequest,
  { params }: { params: { inviteCode: string } },
) {
  try {
    const { inviteCode } = params
    const body = await request.json()
    const data = joinSessionSchema.parse(body)
    const auth = await getServerSession(authOptions)

    const result = await joinSession(deps, {
      inviteCode,
      displayName: data.displayName,
      userId: auth?.user?.id ?? null,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
