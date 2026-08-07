import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DocumentStatusBadge, EmployeeStatusBadge, RecordStatusBadge } from './StatusBadge'

describe('EmployeeStatusBadge', () => {
  it('renders friendly labels for each status', () => {
    render(<EmployeeStatusBadge status="on_leave" />)
    expect(screen.getByText('On Leave')).toBeInTheDocument()
  })

  it('renders future hire label', () => {
    render(<EmployeeStatusBadge status="future_hire" />)
    expect(screen.getByText('Future Hire')).toBeInTheDocument()
  })
})

describe('DocumentStatusBadge', () => {
  it('renders document statuses verbatim', () => {
    render(<DocumentStatusBadge status="Expiring Soon" />)
    expect(screen.getByText('Expiring Soon')).toBeInTheDocument()
  })
})

describe('RecordStatusBadge', () => {
  it('renders active and inactive', () => {
    const { rerender } = render(<RecordStatusBadge status="active" />)
    expect(screen.getByText('Active')).toBeInTheDocument()
    rerender(<RecordStatusBadge status="inactive" />)
    expect(screen.getByText('Inactive')).toBeInTheDocument()
  })
})
