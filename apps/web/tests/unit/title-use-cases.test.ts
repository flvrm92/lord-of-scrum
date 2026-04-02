import { describe, it, expect, vi, beforeEach } from 'vitest'
import { assignTitle, rerollTitle } from '@/application/use-cases'
import type { UseCaseDeps } from '@/application/use-cases'
import { LOTR_TITLES } from '@/domain/rules'

function makeDeps(overrides: Partial<UseCaseDeps['userRepo']> = {}): UseCaseDeps {
  return {
    sessionRepo: {} as UseCaseDeps['sessionRepo'],
    participantRepo: {} as UseCaseDeps['participantRepo'],
    roundRepo: {} as UseCaseDeps['roundRepo'],
    voteRepo: {} as UseCaseDeps['voteRepo'],
    scaleRepo: {} as UseCaseDeps['scaleRepo'],
    eventPublisher: {} as UseCaseDeps['eventPublisher'],
    userRepo: {
      findById: vi.fn(),
      updateTitle: vi.fn(),
      ...overrides,
    },
  }
}

describe('assignTitle use case', () => {
  it('assigns a random title when user has no title', async () => {
    const updateTitle = vi.fn()
    const deps = makeDeps({
      findById: vi.fn().mockResolvedValue({ id: 'u1', lotrTitle: null }),
      updateTitle,
    })
    const title = await assignTitle(deps, 'u1')
    expect(typeof title).toBe('string')
    expect(LOTR_TITLES).toContain(title)
    expect(updateTitle).toHaveBeenCalledWith('u1', title)
  })

  it('does NOT reassign if user already has a title', async () => {
    const updateTitle = vi.fn()
    const deps = makeDeps({
      findById: vi.fn().mockResolvedValue({ id: 'u1', lotrTitle: 'King of Gondor' }),
      updateTitle,
    })
    const title = await assignTitle(deps, 'u1')
    expect(title).toBe('King of Gondor')
    expect(updateTitle).not.toHaveBeenCalled()
  })

  it('returns null if user not found', async () => {
    const deps = makeDeps({ findById: vi.fn().mockResolvedValue(null) })
    const title = await assignTitle(deps, 'u-missing')
    expect(title).toBeNull()
  })
})

describe('rerollTitle use case', () => {
  it('returns a different title than the current one', async () => {
    const currentTitle = 'King of Gondor'
    const updateTitle = vi.fn()
    const deps = makeDeps({
      findById: vi.fn().mockResolvedValue({ id: 'u1', lotrTitle: currentTitle }),
      updateTitle,
    })
    const newTitle = await rerollTitle(deps, { userId: 'u1' })
    expect(newTitle).not.toBe(currentTitle)
    expect(LOTR_TITLES).toContain(newTitle)
    expect(updateTitle).toHaveBeenCalledWith('u1', newTitle)
  })

  it('assigns and persists the new title', async () => {
    const updateTitle = vi.fn()
    const deps = makeDeps({
      findById: vi.fn().mockResolvedValue({ id: 'u1', lotrTitle: null }),
      updateTitle,
    })
    const newTitle = await rerollTitle(deps, { userId: 'u1' })
    expect(typeof newTitle).toBe('string')
    expect(updateTitle).toHaveBeenCalledWith('u1', newTitle)
  })
})
