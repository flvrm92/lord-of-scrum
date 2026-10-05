import { describe, it, expect, beforeEach } from 'vitest'
import { readIdentity, writeIdentity, clearIdentity } from '@/lib/participant-identity'
import type { ParticipantDto } from '@/application/dtos'

const legolas: ParticipantDto = {
  id: 'p1',
  displayName: 'Legolas',
  isHost: false,
  isActive: true,
  lotrTitle: null,
}

describe('participant identity store', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('reads back an identity it wrote', () => {
    writeIdentity('s1', legolas)

    expect(readIdentity('s1')).toEqual(legolas)
  })

  it('keeps each council separate', () => {
    const gimli: ParticipantDto = { ...legolas, id: 'p2', displayName: 'Gimli' }
    writeIdentity('s1', legolas)
    writeIdentity('s2', gimli)

    expect(readIdentity('s1')).toEqual(legolas)
    expect(readIdentity('s2')).toEqual(gimli)
  })

  it('reads no identity when nothing was stored', () => {
    expect(readIdentity('s1')).toBeNull()
  })

  it('reads no identity from a non-JSON value instead of throwing', () => {
    localStorage.setItem('participant:s1', 'not json at all')

    expect(() => readIdentity('s1')).not.toThrow()
    expect(readIdentity('s1')).toBeNull()
  })

  it('reads no identity from JSON of the wrong shape', () => {
    localStorage.setItem('participant:s1', JSON.stringify({ displayName: 'Legolas' }))

    expect(readIdentity('s1')).toBeNull()
  })

  it('reads no identity when the stored id is not a usable string', () => {
    localStorage.setItem('participant:s1', JSON.stringify({ id: 42 }))
    expect(readIdentity('s1')).toBeNull()

    localStorage.setItem('participant:s2', JSON.stringify({ id: '' }))
    expect(readIdentity('s2')).toBeNull()
  })

  it('reads no identity from a JSON value that is not an object', () => {
    localStorage.setItem('participant:s1', JSON.stringify('p1'))
    expect(readIdentity('s1')).toBeNull()

    localStorage.setItem('participant:s2', JSON.stringify(null))
    expect(readIdentity('s2')).toBeNull()
  })

  it('clears an identity', () => {
    writeIdentity('s1', legolas)
    clearIdentity('s1')

    expect(readIdentity('s1')).toBeNull()
  })

  it('writes under the key the e2e fixtures seed', () => {
    // Asserted deliberately: `e2e/fixtures/council.ts` seeds this key directly,
    // so the format is a contract rather than an implementation detail.
    writeIdentity('s1', legolas)

    expect(localStorage.getItem('participant:s1')).toBe(JSON.stringify(legolas))
  })
})
