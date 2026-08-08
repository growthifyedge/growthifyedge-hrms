import { describe, expect, it } from 'vitest'
import { NAV_ITEMS, navItemsForRole } from './navigation'

describe('navItemsForRole', () => {
  it('gives HR admins every module including Settings', () => {
    const labels = navItemsForRole('hr_admin').map((i) => i.label)
    expect(labels).toContain('Dashboard')
    expect(labels).toContain('People')
    expect(labels).toContain('Settings')
  })

  it('hides Settings, Payroll and Analytics from managers', () => {
    const labels = navItemsForRole('manager').map((i) => i.label)
    expect(labels).toContain('Dashboard')
    expect(labels).toContain('People')
    expect(labels).not.toContain('Settings')
    expect(labels).not.toContain('Payroll')
    expect(labels).not.toContain('Analytics')
  })

  it('hides People and Settings from employees', () => {
    const labels = navItemsForRole('employee').map((i) => i.label)
    expect(labels).not.toContain('People')
    expect(labels).not.toContain('Settings')
  })

  it('returns nothing when there is no role', () => {
    expect(navItemsForRole(null)).toEqual([])
    expect(navItemsForRole(undefined)).toEqual([])
  })

  it('only enables shipped destinations (Waves 1–5)', () => {
    const enabled = NAV_ITEMS.filter((i) => i.enabled).map((i) => i.label)
    expect(enabled.sort()).toEqual(
      ['Dashboard', 'Payroll', 'People', 'Performance', 'Recruitment', 'Settings', 'Time & Leave'].sort(),
    )
  })

  it('keeps Payroll hidden from managers and employees', () => {
    expect(navItemsForRole('manager').map((i) => i.label)).not.toContain('Payroll')
    expect(navItemsForRole('employee').map((i) => i.label)).not.toContain('Payroll')
  })
})
