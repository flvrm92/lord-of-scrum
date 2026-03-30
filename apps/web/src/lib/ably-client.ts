import Ably from 'ably'

let ablyClient: Ably.Realtime | null = null

export function getAblyClient(): Ably.Realtime {
  if (!ablyClient) {
    ablyClient = new Ably.Realtime({
      authUrl: '/api/ably',
      authMethod: 'GET',
    })
  }
  return ablyClient
}

export function closeAblyClient(): void {
  if (ablyClient) {
    ablyClient.close()
    ablyClient = null
  }
}
