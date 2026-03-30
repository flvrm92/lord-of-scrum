// Domain Types — aligned with Prisma schema

export type SessionStatus = 'ACTIVE' | 'ARCHIVED'
export type RoundStatus = 'VOTING' | 'REVEALED'

export interface Session {
  id: string
  name: string
  inviteCode: string
  status: SessionStatus
  facilitatorId: string | null
  scaleId: string
  archivedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface Participant {
  id: string
  sessionId: string
  userId: string | null
  displayName: string
  isActive: boolean
  createdAt: Date
}

export interface Round {
  id: string
  sessionId: string
  topic: string | null
  status: RoundStatus
  orderIndex: number
  revealedAt: Date | null
  createdAt: Date
}

export interface Vote {
  id: string
  roundId: string
  participantId: string
  value: string
  createdAt: Date
}

export interface EstimationScale {
  id: string
  name: string
  isDefault: boolean
  createdByUserId: string | null
  createdAt: Date
}

export interface ScaleValue {
  id: string
  scaleId: string
  label: string
  numericValue: number | null
  sortOrder: number
}
