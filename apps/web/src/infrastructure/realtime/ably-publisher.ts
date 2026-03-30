import Ably from 'ably'
import type { SessionEventPublisher } from '@/application/ports'
import type { Participant, Round, Vote } from '@/domain/entities'

function getAblyClient(): Ably.Rest | null {
  const key = process.env.ABLY_API_KEY
  if (!key) return null
  return new Ably.Rest(key)
}

async function publish(sessionId: string, event: string, data: unknown) {
  const client = getAblyClient()
  if (!client) return
  const channel = client.channels.get(`session:${sessionId}`)
  await channel.publish(event, data)
}

export const ablyPublisher: SessionEventPublisher = {
  async participantJoined(sessionId, participant) {
    await publish(sessionId, 'participant:joined', {
      id: participant.id,
      displayName: participant.displayName,
      isActive: participant.isActive,
    })
  },

  async participantLeft(sessionId, participantId) {
    await publish(sessionId, 'participant:left', { participantId })
  },

  async voteSubmitted(sessionId, roundId, participantId) {
    await publish(sessionId, 'vote:submitted', { roundId, participantId })
  },

  async roundStarted(sessionId, round) {
    await publish(sessionId, 'round:started', {
      id: round.id,
      topic: round.topic,
      status: round.status,
      orderIndex: round.orderIndex,
    })
  },

  async roundRevealed(sessionId, round, votes) {
    await publish(sessionId, 'round:revealed', {
      id: round.id,
      topic: round.topic,
      status: round.status,
      votes: votes.map((v) => ({ participantId: v.participantId, value: v.value })),
    })
  },

  async roundReset(sessionId, roundId) {
    await publish(sessionId, 'round:reset', { roundId })
  },

  async sessionArchived(sessionId) {
    await publish(sessionId, 'session:archived', { sessionId })
  },
}
