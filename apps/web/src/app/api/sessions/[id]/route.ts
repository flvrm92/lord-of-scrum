import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/application/use-cases'
import { deps } from '@/lib/deps'
import { handleApiError } from '@/lib/api-error'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params
    const session = await getSession(deps, id)
    return NextResponse.json(session)
  } catch (error) {
    return handleApiError(error)
  }
}
