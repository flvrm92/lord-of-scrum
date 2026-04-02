import { prisma } from './client'
import type { SessionRepository, ParticipantRepository, RoundRepository, VoteRepository, ScaleRepository, UserRepository } from '@/application/ports'

export const sessionRepository: SessionRepository = {
  async findById(id) {
    return prisma.session.findUnique({
      where: { id },
      include: { scale: { include: { values: true } } },
    })
  },

  async findByInviteCode(code) {
    return prisma.session.findUnique({
      where: { inviteCode: code },
      include: { scale: { include: { values: true } } },
    })
  },

  async create(data) {
    return prisma.session.create({ data })
  },

  async archive(id) {
    return prisma.session.update({
      where: { id },
      data: { status: 'ARCHIVED', archivedAt: new Date() },
    })
  },

  async findActiveOlderThan(date) {
    return prisma.session.findMany({
      where: { status: 'ACTIVE', updatedAt: { lt: date } },
    })
  },

  async deleteMany(ids) {
    await prisma.session.deleteMany({ where: { id: { in: ids } } })
  },
}

export const participantRepository: ParticipantRepository = {
  async findById(id) {
    return prisma.participant.findUnique({ where: { id } })
  },

  async findBySessionId(sessionId) {
    const rows = await prisma.participant.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { lotrTitle: true } } },
    })
    return rows.map((p) => ({ ...p, lotrTitle: p.user?.lotrTitle ?? null }))
  },

  async findBySessionAndName(sessionId, displayName) {
    return prisma.participant.findUnique({
      where: { sessionId_displayName: { sessionId, displayName } },
    })
  },

  async create(data) {
    return prisma.participant.create({ data })
  },

  async updateActive(id, isActive) {
    return prisma.participant.update({ where: { id }, data: { isActive } })
  },

  async delete(id) {
    await prisma.participant.delete({ where: { id } })
  },
}

export const roundRepository: RoundRepository = {
  async findById(id) {
    return prisma.round.findUnique({ where: { id } })
  },

  async findBySessionId(sessionId) {
    return prisma.round.findMany({ where: { sessionId }, orderBy: { orderIndex: 'asc' } })
  },

  async create(data) {
    return prisma.round.create({ data })
  },

  async reveal(id) {
    return prisma.round.update({
      where: { id },
      data: { status: 'REVEALED', revealedAt: new Date() },
    })
  },

  async resetToVoting(id) {
    return prisma.round.update({
      where: { id },
      data: { status: 'VOTING', revealedAt: null },
    })
  },

  async getMaxOrderIndex(sessionId) {
    const result = await prisma.round.aggregate({
      where: { sessionId },
      _max: { orderIndex: true },
    })
    return result._max.orderIndex ?? -1
  },
}

export const voteRepository: VoteRepository = {
  async findByRoundId(roundId) {
    return prisma.vote.findMany({ where: { roundId } })
  },

  async upsert(data) {
    return prisma.vote.upsert({
      where: {
        roundId_participantId: { roundId: data.roundId, participantId: data.participantId },
      },
      update: { value: data.value },
      create: data,
    })
  },

  async deleteByRoundId(roundId) {
    await prisma.vote.deleteMany({ where: { roundId } })
  },
}

export const scaleRepository: ScaleRepository = {
  async findAll() {
    return prisma.estimationScale.findMany({
      include: { values: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { name: 'asc' },
    })
  },

  async findById(id) {
    return prisma.estimationScale.findUnique({
      where: { id },
      include: { values: { orderBy: { sortOrder: 'asc' } } },
    })
  },
}

export const userRepository: UserRepository = {
  async findById(id) {
    return prisma.user.findUnique({
      where: { id },
      select: { id: true, lotrTitle: true },
    })
  },

  async updateTitle(id, title) {
    await prisma.user.update({
      where: { id },
      data: { lotrTitle: title },
    })
  },
}
