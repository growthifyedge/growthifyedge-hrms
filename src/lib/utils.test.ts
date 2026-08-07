import { describe, expect, it } from 'vitest'
import { getErrorMessage, isUniqueViolation } from './utils'

describe('getErrorMessage', () => {
  it('reads Error instances', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('boom')
  })

  it('reads plain objects with a message (PostgrestError shape)', () => {
    expect(getErrorMessage({ message: 'duplicate key', code: '23505' })).toBe('duplicate key')
  })

  it('stringifies other values', () => {
    expect(getErrorMessage('plain string')).toBe('plain string')
  })
})

describe('isUniqueViolation', () => {
  it('detects the Postgres 23505 code on plain objects', () => {
    expect(
      isUniqueViolation({
        code: '23505',
        message:
          'duplicate key value violates unique constraint "employees_organization_id_employee_code_key"',
        details: null,
        hint: null,
      }),
    ).toBe(true)
  })

  it('detects unique violations from message text alone', () => {
    expect(isUniqueViolation(new Error('duplicate key value violates unique constraint "x"'))).toBe(true)
  })

  it('rejects unrelated errors', () => {
    expect(isUniqueViolation(new Error('network timeout'))).toBe(false)
    expect(isUniqueViolation({ code: '42501', message: 'RLS violation' })).toBe(false)
  })
})
