import { z } from 'zod'

export const createSessionSchema = z.object({
  name: z.string().min(1).max(100),
  scaleId: z.string().min(1),
  hostDisplayName: z.string().min(1).max(30),
})

export const joinSessionSchema = z.object({
  displayName: z.string().min(1).max(30),
})

export const submitVoteSchema = z.object({
  participantId: z.string().min(1),
  value: z.string().min(1),
})

export const startRoundSchema = z.object({
  topic: z.string().min(1).max(200),
  participantId: z.string().min(1),
})

export const hostActionSchema = z.object({
  participantId: z.string().min(1),
})

export const removeParticipantSchema = z.object({
  requesterId: z.string().min(1),
})
