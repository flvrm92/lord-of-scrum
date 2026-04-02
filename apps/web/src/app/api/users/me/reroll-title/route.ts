import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/infrastructure/auth/auth-options'
import { rerollTitle } from '@/application/use-cases'
import { deps } from '@/lib/deps'
import { handleApiError } from '@/lib/api-error'

export async function POST() {
  try {
    const auth = await getServerSession(authOptions)
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const newTitle = await rerollTitle(deps, { userId: auth.user.id })
    return NextResponse.json({ lotrTitle: newTitle })
  } catch (error) {
    return handleApiError(error)
  }
}
