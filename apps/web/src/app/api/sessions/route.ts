import { NextRequest, NextResponse } from 'next/server'
import { createSession } from '@/application/use-cases'
import { createSessionSchema } from '@/infrastructure/validation/schemas'
import { deps } from '@/lib/deps'
import { handleApiError } from '@/lib/api-error'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/infrastructure/auth/auth-options'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = createSessionSchema.parse(body)
    const auth = await getServerSession(authOptions)

    const session = await createSession(deps, {
      name: data.name,
      scaleId: data.scaleId,
      hostDisplayName: data.hostDisplayName,
      userId: auth?.user?.id ?? null,
    })

    return NextResponse.json(session, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
