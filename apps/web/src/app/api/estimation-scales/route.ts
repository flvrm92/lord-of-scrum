import { NextResponse } from 'next/server'
import { listScales } from '@/application/use-cases'
import { deps } from '@/lib/deps'
import { handleApiError } from '@/lib/api-error'

export async function GET() {
  try {
    const scales = await listScales(deps)
    return NextResponse.json(scales)
  } catch (error) {
    return handleApiError(error)
  }
}
