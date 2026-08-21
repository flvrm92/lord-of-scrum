import type { APIRequestContext } from '@playwright/test'
import type {
  ParticipantDto,
  RoundDto,
  ScaleDto,
  SessionDto,
  SessionSummaryDto,
} from '@/application/dtos'

/** Ids seeded by `prisma/seed.ts`. */
export const SCALE = {
  fibonacci: 'default-fibonacci',
  tshirt: 'default-tshirt',
  powers: 'default-powers',
  sequencial: 'default-sequencial',
} as const

/**
 * Typed wrappers over the route handlers.
 *
 * Tests use these to build state (a session with two players mid-round) in a
 * couple of calls instead of driving the UI through every prior step, so each
 * spec only clicks through the flow it is actually asserting.
 */
export class Api {
  constructor(private readonly request: APIRequestContext) {}

  private async json<T>(res: Awaited<ReturnType<APIRequestContext['post']>>, what: string): Promise<T> {
    if (!res.ok()) {
      throw new Error(`${what} failed: ${res.status()} ${await res.text()}`)
    }
    return (await res.json()) as T
  }

  async getScales(): Promise<ScaleDto[]> {
    const res = await this.request.get('/api/estimation-scales')
    return this.json<ScaleDto[]>(res, 'getScales')
  }

  async createSession(opts: {
    name: string
    hostDisplayName: string
    scaleId?: string
  }): Promise<SessionDto> {
    const res = await this.request.post('/api/sessions', {
      data: {
        name: opts.name,
        scaleId: opts.scaleId ?? SCALE.fibonacci,
        hostDisplayName: opts.hostDisplayName,
      },
    })
    return this.json<SessionDto>(res, 'createSession')
  }

  async joinSession(
    inviteCode: string,
    displayName: string,
  ): Promise<{ session: SessionDto; participant: ParticipantDto }> {
    const res = await this.request.post(`/api/sessions/join/${inviteCode}`, {
      data: { displayName },
    })
    return this.json<{ session: SessionDto; participant: ParticipantDto }>(res, 'joinSession')
  }

  async startRound(sessionId: string, topic: string, participantId: string): Promise<RoundDto> {
    const res = await this.request.post(`/api/sessions/${sessionId}/rounds`, {
      data: { topic, participantId },
    })
    return this.json<RoundDto>(res, 'startRound')
  }

  async castVote(
    sessionId: string,
    roundId: string,
    participantId: string,
    value: string,
  ): Promise<void> {
    const res = await this.request.post(`/api/sessions/${sessionId}/rounds/${roundId}/votes`, {
      data: { participantId, value },
    })
    await this.json(res, `castVote(${value})`)
  }

  async reveal(sessionId: string, roundId: string, participantId: string): Promise<void> {
    const res = await this.request.post(`/api/sessions/${sessionId}/rounds/${roundId}/reveal`, {
      data: { participantId },
    })
    await this.json(res, 'reveal')
  }

  async resetRound(sessionId: string, roundId: string, participantId: string): Promise<void> {
    const res = await this.request.post(`/api/sessions/${sessionId}/rounds/${roundId}/reset`, {
      data: { participantId },
    })
    await this.json(res, 'resetRound')
  }

  async getSession(sessionId: string, participantId?: string): Promise<SessionDto> {
    const qs = participantId ? `?participantId=${encodeURIComponent(participantId)}` : ''
    const res = await this.request.get(`/api/sessions/${sessionId}${qs}`)
    return this.json<SessionDto>(res, 'getSession')
  }

  async getSummary(sessionId: string): Promise<SessionSummaryDto> {
    const res = await this.request.get(`/api/sessions/${sessionId}/summary`)
    return this.json<SessionSummaryDto>(res, 'getSummary')
  }

  /** Raw access for the specs that assert error envelopes and status codes. */
  raw(): APIRequestContext {
    return this.request
  }
}

/**
 * Runs a full round end to end at the API level and returns the round.
 * Used by specs that need *finished* rounds as a precondition (Chronicles).
 */
export async function playRound(
  api: Api,
  session: SessionDto,
  votes: Array<{ participant: ParticipantDto; value: string }>,
  topic: string,
  host: ParticipantDto,
  opts: { reveal?: boolean } = {},
): Promise<RoundDto> {
  const round = await api.startRound(session.id, topic, host.id)
  for (const { participant, value } of votes) {
    await api.castVote(session.id, round.id, participant.id, value)
  }
  if (opts.reveal !== false) {
    await api.reveal(session.id, round.id, host.id)
  }
  return round
}
