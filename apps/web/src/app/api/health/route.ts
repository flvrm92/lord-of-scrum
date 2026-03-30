import { NextResponse } from 'next/server'
import { prisma } from '@/infrastructure/db/client'

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: { database: 'connected' },
    })
  } catch {
    return NextResponse.json(
      { status: 'unhealthy', timestamp: new Date().toISOString(), services: { database: 'disconnected' } },
      { status: 503 },
    )
  }
}
