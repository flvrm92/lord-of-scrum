import { NextRequest, NextResponse } from 'next/server'
import { getSessionHistory } from '@/application/use-cases'
import { deps } from '@/lib/deps'
import { handleApiError } from '@/lib/api-error'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params
    const history = await getSessionHistory(deps, id)
    return NextResponse.json(history)
  } catch (error) {
    return handleApiError(error)
  }
}
