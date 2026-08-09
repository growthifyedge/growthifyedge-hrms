import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearPasswordRecovery,
  isPasswordRecoveryActive,
  markPasswordRecovery,
  subscribePasswordRecovery,
} from './passwordRecovery'

describe('password recovery gate', () => {
  beforeEach(() => {
    clearPasswordRecovery()
  })

  it('is inactive by default (direct visits never unlock the form)', () => {
    expect(isPasswordRecoveryActive()).toBe(false)
  })

  it('activates only when explicitly marked and can be cleared', () => {
    markPasswordRecovery()
    expect(isPasswordRecoveryActive()).toBe(true)
    clearPasswordRecovery()
    expect(isPasswordRecoveryActive()).toBe(false)
  })

  it('notifies subscribers of changes and supports unsubscribe', () => {
    const seen: boolean[] = []
    const unsubscribe = subscribePasswordRecovery((active) => seen.push(active))
    markPasswordRecovery()
    clearPasswordRecovery()
    unsubscribe()
    markPasswordRecovery()
    expect(seen).toEqual([true, false])
  })

  it('handles multiple subscribers independently', () => {
    const a = vi.fn()
    const b = vi.fn()
    const offA = subscribePasswordRecovery(a)
    subscribePasswordRecovery(b)
    markPasswordRecovery()
    offA()
    clearPasswordRecovery()
    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(2)
  })
})
