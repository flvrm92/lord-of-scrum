import { NextRequest, NextResponse } from 'next/server'
import { getSessionSummary } from '@/application/use-cases'
import { deps } from '@/lib/deps'
import { handleApiError } from '@/lib/api-error'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const summary = await getSessionSummary(deps, params.id)
    return NextResponse.json(summary)
  } catch (error) {
    return handleApiError(error)
  }
}