import type {
  SessionRepository,
  ParticipantRepository,
  RoundRepository,
  VoteRepository,
  ScaleRepository,
  SessionEventPublisher,
} from '@/application/ports'
import type {
  CreateSessionInput,
  JoinSessionInput,
  SubmitVoteInput,
  StartRoundInput,
  RevealRoundInput,
  ResetRoundInput,
  ArchiveSessionInput,
  SessionDto,
  RoundDto,
  ScaleDto,
} from '@/application/dtos'
import { generateInviteCode, validateDisplayName, validateVoteValue, assertRoundVoting, detectDivergence } from '@/domain/rules'
import {
  SessionNotFoundError,
  SessionNotActiveError,
  DuplicateDisplayNameError,
  NotHostError,
  ParticipantNotFoundError,
  RoundNotFoundError,
} from '@/domain/errors'

// ---------- Dependencies Container ----------

export interface UseCaseDeps {
  sessionRepo: SessionRepository
  participantRepo: ParticipantRepository
  roundRepo: RoundRepository
  voteRepo: VoteRepository
  scaleRepo: ScaleRepository
  eventPublisher: SessionEventPublisher
}

// ---------- Helper: determine if participant is host ----------
// The first participant created in a session is the host (facilitator).

function isHost(participantId: string, facilitatorParticipants: { id: string }[]): boolean {
  return facilitatorParticipants.length > 0 && facilitatorParticipants[0].id === participantId
}

// ---------- Helper: map session to DTO ----------

function toSessionDto(
  session: Awaited<ReturnType<SessionRepository['findById']>>,
  participants: Awaited<ReturnType<ParticipantRepository['findBySessionId']>>,
  currentRound: Awaited<ReturnType<RoundRepository['findById']>> | null,
  votes: Awaited<ReturnType<VoteRepository['findByRoundId']>>,
): SessionDto {
  if (!session) throw new SessionNotFoundError()
  return {
    id: session.id,
    name: session.name,
    inviteCode: session.inviteCode,
    status: session.status,
    scale: {
      id: session.scale.id,
      name: session.scale.name,
      values: session.scale.values
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((v) => ({ label: v.label, numericValue: v.numericValue, sortOrder: v.sortOrder })),
    },
    participants: participants.map((p, i) => ({
      id: p.id,
      displayName: p.displayName,
      isHost: i === 0, // first participant is the host
      isActive: p.isActive,
    })),
    currentRound: currentRound
      ? {
        id: currentRound.id,
        topic: currentRound.topic,
        status: currentRound.status,
        orderIndex: currentRound.orderIndex,
        votes: votes.map((v) => {
          const participant = participants.find((p) => p.id === v.participantId)
          return {
            participantId: v.participantId,
            displayName: participant?.displayName ?? 'Unknown',
            value: currentRound.status === 'REVEALED' ? v.value : null,
          }
        }),
      }
      : null,
    createdAt: session.createdAt.toISOString(),
  }
}

// ---------- Use Cases ----------

export async function createSession(deps: UseCaseDeps, input: CreateSessionInput): Promise<SessionDto> {
  const displayName = validateDisplayName(input.hostDisplayName)
  const inviteCode = generateInviteCode()

  const session = await deps.sessionRepo.create({
    name: input.name,
    inviteCode,
    scaleId: input.scaleId,
    facilitatorId: input.userId,
  })

  const host = await deps.participantRepo.create({
    sessionId: session.id,
    userId: input.userId,
    displayName,
  })

  const fullSession = await deps.sessionRepo.findById(session.id)
  return toSessionDto(fullSession, [host], null, [])
}

export async function joinSession(deps: UseCaseDeps, input: JoinSessionInput) {
  const displayName = validateDisplayName(input.displayName)
  const session = await deps.sessionRepo.findByInviteCode(input.inviteCode)
  if (!session) throw new SessionNotFoundError()
  if (session.status !== 'ACTIVE') throw new SessionNotActiveError()

  const existing = await deps.participantRepo.findBySessionAndName(session.id, displayName)
  if (existing) throw new DuplicateDisplayNameError(displayName)

  const participant = await deps.participantRepo.create({
    sessionId: session.id,
    userId: input.userId,
    displayName,
  })

  await deps.eventPublisher.participantJoined(session.id, participant)

  const participants = await deps.participantRepo.findBySessionId(session.id)
  const rounds = await deps.roundRepo.findBySessionId(session.id)
  const currentRound = rounds.length > 0 ? rounds[rounds.length - 1] : null
  const votes = currentRound ? await deps.voteRepo.findByRoundId(currentRound.id) : []

  return {
    session: toSessionDto(session, participants, currentRound, votes),
    participant: {
      id: participant.id,
      displayName: participant.displayName,
      isHost: false,
      isActive: participant.isActive,
    },
  }
}

export async function startRound(deps: UseCaseDeps, input: StartRoundInput): Promise<RoundDto> {
  const participants = await deps.participantRepo.findBySessionId(input.sessionId)
  const participant = participants.find((p) => p.id === input.participantId)
  if (!participant) throw new ParticipantNotFoundError()
  if (!isHost(input.participantId, participants)) throw new NotHostError()

  const session = await deps.sessionRepo.findById(input.sessionId)
  if (!session) throw new SessionNotFoundError()
  if (session.status !== 'ACTIVE') throw new SessionNotActiveError()

  const maxOrder = await deps.roundRepo.getMaxOrderIndex(input.sessionId)
  const round = await deps.roundRepo.create({
    sessionId: input.sessionId,
    topic: input.topic,
    orderIndex: maxOrder + 1,
  })

  await deps.eventPublisher.roundStarted(input.sessionId, round)

  return { id: round.id, topic: round.topic, status: round.status, votes: [], orderIndex: round.orderIndex }
}

export async function submitVote(deps: UseCaseDeps, input: SubmitVoteInput): Promise<void> {
  const round = await deps.roundRepo.findById(input.roundId)
  if (!round) throw new RoundNotFoundError()
  assertRoundVoting(round.status)

  const participant = await deps.participantRepo.findById(input.participantId)
  if (!participant) throw new ParticipantNotFoundError()

  const session = await deps.sessionRepo.findById(round.sessionId)
  if (!session) throw new SessionNotFoundError()
  validateVoteValue(input.value, session.scale.values)

  await deps.voteRepo.upsert({
    roundId: input.roundId,
    participantId: input.participantId,
    value: input.value,
  })

  await deps.eventPublisher.voteSubmitted(round.sessionId, input.roundId, input.participantId)
}

export async function revealRound(deps: UseCaseDeps, input: RevealRoundInput) {
  const round = await deps.roundRepo.findById(input.roundId)
  if (!round) throw new RoundNotFoundError()
  assertRoundVoting(round.status)

  const participants = await deps.participantRepo.findBySessionId(round.sessionId)
  const participant = participants.find((p) => p.id === input.participantId)
  if (!participant) throw new ParticipantNotFoundError()
  if (!isHost(input.participantId, participants)) throw new NotHostError()

  const session = await deps.sessionRepo.findById(round.sessionId)
  if (!session) throw new SessionNotFoundError()

  const votes = await deps.voteRepo.findByRoundId(input.roundId)
  const divergence = detectDivergence(votes, session.scale.values)

  const revealed = await deps.roundRepo.reveal(input.roundId)
  await deps.eventPublisher.roundRevealed(round.sessionId, revealed, votes)

  return {
    round: {
      id: revealed.id,
      topic: revealed.topic,
      status: revealed.status,
      orderIndex: revealed.orderIndex,
      votes: votes.map((v) => {
        const p = participants.find((p) => p.id === v.participantId)
        return { participantId: v.participantId, displayName: p?.displayName ?? 'Unknown', value: v.value }
      }),
    },
    divergence,
  }
}

export async function resetRound(deps: UseCaseDeps, input: ResetRoundInput): Promise<RoundDto> {
  const round = await deps.roundRepo.findById(input.roundId)
  if (!round) throw new RoundNotFoundError()

  const participants = await deps.participantRepo.findBySessionId(round.sessionId)
  const participant = participants.find((p) => p.id === input.participantId)
  if (!participant) throw new ParticipantNotFoundError()
  if (!isHost(input.participantId, participants)) throw new NotHostError()

  await deps.voteRepo.deleteByRoundId(input.roundId)
  const reset = await deps.roundRepo.resetToVoting(input.roundId)
  await deps.eventPublisher.roundReset(round.sessionId, input.roundId)

  return { id: reset.id, topic: reset.topic, status: reset.status, votes: [], orderIndex: reset.orderIndex }
}

export async function archiveSession(deps: UseCaseDeps, input: ArchiveSessionInput): Promise<void> {
  const participants = await deps.participantRepo.findBySessionId(input.sessionId)
  const participant = participants.find((p) => p.id === input.participantId)
  if (!participant) throw new ParticipantNotFoundError()
  if (!isHost(input.participantId, participants)) throw new NotHostError()

  const session = await deps.sessionRepo.findById(input.sessionId)
  if (!session) throw new SessionNotFoundError()
  if (session.status !== 'ACTIVE') throw new SessionNotActiveError()

  await deps.sessionRepo.archive(input.sessionId)
  await deps.eventPublisher.sessionArchived(input.sessionId)
}

export async function getSession(deps: UseCaseDeps, sessionId: string): Promise<SessionDto> {
  const session = await deps.sessionRepo.findById(sessionId)
  if (!session) throw new SessionNotFoundError()

  const participants = await deps.participantRepo.findBySessionId(sessionId)
  const rounds = await deps.roundRepo.findBySessionId(sessionId)
  const currentRound = rounds.length > 0 ? rounds[rounds.length - 1] : null
  const votes = currentRound ? await deps.voteRepo.findByRoundId(currentRound.id) : []

  return toSessionDto(session, participants, currentRound, votes)
}

export async function getSessionByInviteCode(deps: UseCaseDeps, inviteCode: string): Promise<SessionDto> {
  const session = await deps.sessionRepo.findByInviteCode(inviteCode)
  if (!session) throw new SessionNotFoundError()

  const participants = await deps.participantRepo.findBySessionId(session.id)
  const rounds = await deps.roundRepo.findBySessionId(session.id)
  const currentRound = rounds.length > 0 ? rounds[rounds.length - 1] : null
  const votes = currentRound ? await deps.voteRepo.findByRoundId(currentRound.id) : []

  return toSessionDto(session, participants, currentRound, votes)
}

export async function getSessionHistory(deps: UseCaseDeps, sessionId: string) {
  const session = await deps.sessionRepo.findById(sessionId)
  if (!session) throw new SessionNotFoundError()

  const rounds = await deps.roundRepo.findBySessionId(sessionId)
  const participants = await deps.participantRepo.findBySessionId(sessionId)

  const roundDtos: RoundDto[] = await Promise.all(
    rounds.map(async (r) => {
      const votes = await deps.voteRepo.findByRoundId(r.id)
      return {
        id: r.id,
        topic: r.topic,
        status: r.status,
        orderIndex: r.orderIndex,
        votes: votes.map((v) => {
          const p = participants.find((p) => p.id === v.participantId)
          return { participantId: v.participantId, displayName: p?.displayName ?? 'Unknown', value: v.value }
        }),
      }
    }),
  )

  return { sessionName: session.name, rounds: roundDtos }
}

export async function listScales(deps: UseCaseDeps): Promise<ScaleDto[]> {
  const scales = await deps.scaleRepo.findAll()
  return scales.map((s) => ({
    id: s.id,
    name: s.name,
    values: s.values
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((v) => ({ label: v.label, numericValue: v.numericValue, sortOrder: v.sortOrder })),
  }))
}

export async function cleanupStaleSessions(deps: UseCaseDeps, maxAgeHours = 72): Promise<number> {
  const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000)
  const stale = await deps.sessionRepo.findActiveOlderThan(cutoff)
  if (stale.length === 0) return 0
  await deps.sessionRepo.deleteMany(stale.map((s) => s.id))
  return stale.length
}
