// ---------- Input DTOs ----------

export interface CreateSessionInput {
  name: string
  scaleId: string
  hostDisplayName: string
  userId: string | null
}

export interface JoinSessionInput {
  inviteCode: string
  displayName: string
  userId: string | null
}

export interface SubmitVoteInput {
  roundId: string
  participantId: string
  value: string
}

export interface StartRoundInput {
  sessionId: string
  topic: string
  participantId: string
}

export interface RevealRoundInput {
  roundId: string
  participantId: string
}

export interface ResetRoundInput {
  roundId: string
  participantId: string
}

export interface ArchiveSessionInput {
  sessionId: string
  participantId: string
}

export interface RerollTitleInput {
  userId: string
}

export interface RemoveParticipantInput {
  sessionId: string
  participantId: string
  requesterId: string
}

// ---------- Output DTOs ----------

export interface SessionDto {
  id: string
  name: string
  inviteCode: string
  status: string
  scale: ScaleDto
  participants: ParticipantDto[]
  currentRound: RoundDto | null
  createdAt: string
}

export interface ParticipantDto {
  id: string
  displayName: string
  isHost: boolean
  isActive: boolean
  lotrTitle: string | null
}

export interface RoundDto {
  id: string
  topic: string | null
  status: string
  votes: VoteDto[]
  orderIndex: number
}

export interface VoteDto {
  participantId: string
  displayName: string
  value: string | null // null when round is VOTING (hidden)
}

export interface ScaleDto {
  id: string
  name: string
  values: ScaleValueDto[]
}

export interface ScaleValueDto {
  label: string
  numericValue: number | null
  sortOrder: number
}
