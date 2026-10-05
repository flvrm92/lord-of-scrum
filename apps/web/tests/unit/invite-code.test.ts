import { describe, it, expect } from 'vitest'
import { normalise, isWellFormed } from '@/lib/invite-code'
import { generateInviteCode, INVITE_CODE_CHARS, INVITE_CODE_LENGTH } from '@/domain/rules'

describe('normalise', () => {
  it('upper-cases', () => {
    expect(normalise('abcd2345')).toBe('ABCD2345')
  })

  it('trims surrounding whitespace', () => {
    expect(normalise('  ABCD2345  ')).toBe('ABCD2345')
  })

  it('trims and upper-cases together', () => {
    expect(normalise(' abcd2345\n')).toBe('ABCD2345')
  })

  it('leaves an already-normalised seal alone', () => {
    expect(normalise('ABCD2345')).toBe('ABCD2345')
  })

  it('does not reject or strip characters — that is not its job', () => {
    expect(normalise('o0il1234')).toBe('O0IL1234')
  })
})

describe('isWellFormed', () => {
  it('accepts a generated seal', () => {
    for (let i = 0; i < 50; i++) {
      expect(isWellFormed(generateInviteCode())).toBe(true)
    }
  })

  it('accepts every character the generator can emit', () => {
    const chunk = INVITE_CODE_CHARS.slice(0, INVITE_CODE_LENGTH)

    expect(isWellFormed(chunk)).toBe(true)
  })

  it('normalises before checking, so a lowercase seal is well-formed', () => {
    expect(isWellFormed('abcd2345')).toBe(true)
    expect(isWellFormed('  abcd2345  ')).toBe(true)
  })

  it('rejects a seal that is too short', () => {
    expect(isWellFormed('ABCD234')).toBe(false)
  })

  it('rejects a seal that is too long', () => {
    expect(isWellFormed('ABCD23456')).toBe(false)
  })

  it('rejects an empty seal', () => {
    expect(isWellFormed('')).toBe(false)
    expect(isWellFormed('   ')).toBe(false)
  })

  it('rejects the look-alike characters the generator drops', () => {
    for (const lookAlike of ['0', 'O', '1', 'I']) {
      expect(INVITE_CODE_CHARS.includes(lookAlike)).toBe(false)
    }

    expect(isWellFormed('ABCD234O')).toBe(false)
    expect(isWellFormed('ABCD2340')).toBe(false)
    expect(isWellFormed('ABCD234I')).toBe(false)
    expect(isWellFormed('ABCD2341')).toBe(false)
  })

  it('rejects characters outside the charset', () => {
    expect(isWellFormed('ABCD-234')).toBe(false)
    expect(isWellFormed('ABCD 234')).toBe(false)
    expect(isWellFormed('ABCD_234')).toBe(false)
  })
})
