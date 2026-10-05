import { describe, it, expect } from 'vitest'
import { buildJoinIntentUrl, readJoinIntent } from '@/lib/join-intent'
import { generateInviteCode } from '@/domain/rules'

describe('buildJoinIntentUrl', () => {
  it('points at the main page carrying the seal', () => {
    expect(buildJoinIntentUrl('ABCD2345')).toBe('/?join=ABCD2345')
  })

  it('normalises the seal it carries', () => {
    expect(buildJoinIntentUrl('  abcd2345 ')).toBe('/?join=ABCD2345')
  })
})

describe('readJoinIntent', () => {
  it('round-trips a built URL', () => {
    const seal = generateInviteCode()
    const query = buildJoinIntentUrl(seal).replace('/', '')

    expect(readJoinIntent(query)).toBe(seal)
  })

  it('reads a seal with or without the leading question mark', () => {
    expect(readJoinIntent('?join=ABCD2345')).toBe('ABCD2345')
    expect(readJoinIntent('join=ABCD2345')).toBe('ABCD2345')
  })

  it('normalises a lowercase seal', () => {
    expect(readJoinIntent('?join=abcd2345')).toBe('ABCD2345')
  })

  it('reads the seal alongside other parameters', () => {
    expect(readJoinIntent('?foo=1&join=ABCD2345&bar=2')).toBe('ABCD2345')
  })

  it('yields no intent when the parameter is absent', () => {
    expect(readJoinIntent('')).toBeNull()
    expect(readJoinIntent('?')).toBeNull()
    expect(readJoinIntent('?other=ABCD2345')).toBeNull()
  })

  it('yields no intent for an empty parameter', () => {
    expect(readJoinIntent('?join=')).toBeNull()
    expect(readJoinIntent('?join=%20%20')).toBeNull()
  })

  it('yields no intent for a truncated seal', () => {
    // A chat client clipping the link must not prefill a seal that cannot work.
    expect(readJoinIntent('?join=ABCD23')).toBeNull()
  })

  it('yields no intent for an over-long seal', () => {
    expect(readJoinIntent('?join=ABCD23456789')).toBeNull()
  })

  it('yields no intent for characters outside the charset', () => {
    expect(readJoinIntent('?join=ABCD234O')).toBeNull()
    expect(readJoinIntent('?join=%3Cscript%3E')).toBeNull()
    expect(readJoinIntent('?join=ABCD-234')).toBeNull()
  })
})
