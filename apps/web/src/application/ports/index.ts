import type { Session, Participant, Round, Vote, EstimationScale, ScaleValue, User } from '@/domain/entities'

// ---------- Repository Ports ----------

export interface SessionRepository {
  findById(id: string): Promise<(Session & { scale: EstimationScale & { values: ScaleValue[] } }) | null>
  findByInviteCode(code: string): Promise<(Session & { scale: EstimationScale & { values: ScaleValue[] } }) | null>
  create(data: {
    name: string
    inviteCode: string
    scaleId: string
    facilitatorId: string | null
  }): Promise<Session>
  archive(id: string): Promise<Session>
  findActiveOlderThan(date: Date): Promise<Session[]>
  deleteMany(ids: string[]): Promise<void>
}

export interface ParticipantRepository {
  findById(id: string): Promise<Participant | null>
  findBySessionId(sessionId: string): Promise<(Participant & { lotrTitle: string | null })[]>
  findBySessionAndName(sessionId: string, displayName: string): Promise<Participant | null>
  create(data: {
    sessionId: string
    userId: string | null
    displayName: string
  }): Promise<Participant>
  updateActive(id: string, isActive: boolean): Promise<Participant>
  delete(id: string): Promise<void>
}

export interface RoundRepository {
  findById(id: string): Promise<Round | null>
  findBySessionId(sessionId: string): Promise<Round[]>
  create(data: { sessionId: string; topic: string; orderIndex: number }): Promise<Round>
  reveal(id: string): Promise<Round>
  resetToVoting(id: string): Promise<Round>
  getMaxOrderIndex(sessionId: string): Promise<number>
}

export interface VoteRepository {
  findByRoundId(roundId: string): Promise<Vote[]>
  upsert(data: { roundId: string; participantId: string; value: string }): Promise<Vote>
  deleteByRoundId(roundId: string): Promise<void>
}

export interface ScaleRepository {
  findAll(): Promise<(EstimationScale & { values: ScaleValue[] })[]>
  findById(id: string): Promise<(EstimationScale & { values: ScaleValue[] }) | null>
}

export interface UserRepository {
  findById(id: string): Promise<Pick<User, 'id' | 'lotrTitle'> | null>
  updateTitle(id: string, title: string): Promise<void>
}

// ---------- Event Publisher Port ----------

export interface SessionEventPublisher {
  participantJoined(sessionId: string, participant: Participant): Promise<void>
  participantLeft(sessionId: string, participantId: string): Promise<void>
  voteSubmitted(sessionId: string, roundId: string, participantId: string): Promise<void>
  roundStarted(sessionId: string, round: Round): Promise<void>
  roundRevealed(sessionId: string, round: Round, votes: Vote[]): Promise<void>
  roundReset(sessionId: string, roundId: string): Promise<void>
  sessionArchived(sessionId: string): Promise<void>
}
