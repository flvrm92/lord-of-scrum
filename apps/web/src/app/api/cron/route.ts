import { NextRequest, NextResponse } from 'next/server'
import { cleanupStaleSessions } from '@/application/use-cases'
import { deps } from '@/lib/deps'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const count = await cleanupStaleSessions(deps)
    return NextResponse.json({ cleaned: count })
  } catch (error) {
    console.error('Cron cleanup error:', error)
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
  }
}
