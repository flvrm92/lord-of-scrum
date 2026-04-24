import { NextResponse } from 'next/server'
import Ably from 'ably'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const key = process.env.ABLY_API_KEY
    if (!key) {
      return NextResponse.json(
        { error: { code: 'ABLY_NOT_CONFIGURED', message: 'Ably is not configured' } },
        { status: 503 },
      )
    }
    const client = new Ably.Rest(key)
    const tokenRequest = await client.auth.createTokenRequest({
      capability: { 'session:*': ['subscribe'] },
      ttl: 3600000,
    })
    return NextResponse.json(tokenRequest, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('Ably auth error:', error)
    return NextResponse.json(
      { error: { code: 'ABLY_AUTH_ERROR', message: 'Failed to create token' } },
      { status: 500 },
    )
  }
}
