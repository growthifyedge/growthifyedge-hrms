import { describe, expect, it } from 'vitest'
import {
  FACE_DEMO_MARKER,
  FACE_DEMO_NOTE,
  FACE_DEMO_SEQUENCE,
  isFaceTerminalRecord,
  pickDemoEmployees,
  stripDemoMarker,
} from './faceDemo'

describe('face demo marker', () => {
  it('identifies simulator records by the notes marker', () => {
    expect(isFaceTerminalRecord(FACE_DEMO_NOTE)).toBe(true)
    expect(isFaceTerminalRecord('Manual note')).toBe(false)
    expect(isFaceTerminalRecord(null)).toBe(false)
    expect(isFaceTerminalRecord('')).toBe(false)
  })

  it('never exposes the raw marker string', () => {
    expect(stripDemoMarker(FACE_DEMO_NOTE)).not.toContain(FACE_DEMO_MARKER)
    expect(stripDemoMarker(FACE_DEMO_NOTE)).toBe('Main Entrance Face Terminal')
    expect(stripDemoMarker('Manual note')).toBe('Manual note')
    expect(stripDemoMarker(null)).toBe('')
  })
})

describe('demo sequence', () => {
  it('is check-in only with a realistic present/late mix', () => {
    expect(FACE_DEMO_SEQUENCE).toHaveLength(5)
    expect(FACE_DEMO_SEQUENCE.every((s) => /^\d{2}:\d{2}$/.test(s.check_in))).toBe(true)
    expect(FACE_DEMO_SEQUENCE.filter((s) => s.status === 'present')).toHaveLength(3)
    expect(FACE_DEMO_SEQUENCE.filter((s) => s.status === 'late')).toHaveLength(2)
  })
})

describe('pickDemoEmployees', () => {
  const employees = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) => ({ id }))

  it('never selects employees who already have attendance on the date', () => {
    const picks = pickDemoEmployees(employees, new Set(['a', 'c']))
    expect(picks.map((p) => p.id)).toEqual(['b', 'd', 'e', 'f', 'g'])
  })

  it('returns fewer (or zero) when not enough employees are free', () => {
    expect(pickDemoEmployees(employees, new Set(['a', 'b', 'c', 'd', 'e', 'f']))).toHaveLength(1)
    expect(
      pickDemoEmployees(employees, new Set(employees.map((e) => e.id))),
    ).toHaveLength(0)
  })

  it('caps the selection at the sequence length', () => {
    expect(pickDemoEmployees(employees, new Set())).toHaveLength(5)
  })
})
