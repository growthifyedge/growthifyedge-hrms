import { useEffect, useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { TextAreaField } from '../../components/ui/form'
import { useToast } from '../../contexts/ToastContext'
import { useReviewLeaveRequest } from '../../hooks/useLeave'
import { getErrorMessage } from '../../lib/utils'
import { formatDate } from '../../lib/format'
import { fullName } from '../../lib/format'
import type { LeaveRequestWithRelations } from '../../types/db'

interface ReviewLeaveModalProps {
  request: LeaveRequestWithRelations | null
  decision: 'approved' | 'rejected'
  onClose: () => void
}

/** Confirms an approve/reject decision; the secure RPC does the write. */
export function ReviewLeaveModal({ request, decision, onClose }: ReviewLeaveModalProps) {
  const { toast } = useToast()
  const review = useReviewLeaveRequest()
  const [note, setNote] = useState('')

  useEffect(() => {
    if (request) setNote('')
  }, [request])

  if (!request) return null
  const approving = decision === 'approved'

  async function onConfirm() {
    if (!request) return
    try {
      await review.mutateAsync({ requestId: request.id, decision, note: note || undefined })
      toast('success', approving ? 'Leave request approved.' : 'Leave request rejected.')
      onClose()
    } catch (err) {
      const message = getErrorMessage(err)
      toast(
        'error',
        /not permitted|own leave|pending/i.test(message)
          ? message.replace(/^.*?:\s*/, '')
          : 'Could not update the leave request. Please try again.',
      )
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={approving ? 'Approve leave request' : 'Reject leave request'}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={approving ? 'primary' : 'danger'}
            onClick={() => void onConfirm()}
            loading={review.isPending}
          >
            {approving ? 'Approve' : 'Reject'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          {request.employee ? fullName(request.employee) : 'This employee'} ·{' '}
          {request.leave_type?.name ?? 'Leave'} · {formatDate(request.start_date)} –{' '}
          {formatDate(request.end_date)} ({request.days_requested}{' '}
          day{request.days_requested === 1 ? '' : 's'})
        </p>
        <TextAreaField
          label="Review note (optional)"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={approving ? 'e.g. Enjoy the break.' : 'e.g. Team coverage is too thin that week.'}
        />
      </div>
    </Modal>
  )
}
