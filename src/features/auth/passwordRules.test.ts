import { describe, expect, it } from 'vitest'
import { validateNewPassword } from './passwordRules'

describe('validateNewPassword', () => {
  it('accepts a reasonable password', () => {
    expect(validateNewPassword('Sunrise42', 'Sunrise42')).toBeNull()
  })

  it('rejects short passwords', () => {
    expect(validateNewPassword('Ab1', 'Ab1')).toMatch(/8 characters/)
  })

  it('requires a letter and a number', () => {
    expect(validateNewPassword('12345678', '12345678')).toMatch(/letter and one number/)
    expect(validateNewPassword('abcdefgh', 'abcdefgh')).toMatch(/letter and one number/)
  })

  it('requires matching confirmation', () => {
    expect(validateNewPassword('Sunrise42', 'Sunrise43')).toMatch(/do not match/)
  })
})
