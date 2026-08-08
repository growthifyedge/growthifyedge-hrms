import { useState } from 'react'
import { Plus, UserRoundPlus } from 'lucide-react'
import { PageHeader } from '../../components/layout/AppShell'
import { Tabs } from '../../components/ui/Tabs'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../contexts/AuthContext'
import { JobsTab } from './JobsTab'
import { CandidatesTab } from './CandidatesTab'
import { OnboardingTab } from './OnboardingTab'
import { JobFormDrawer } from './JobFormDrawer'
import { AddCandidateDrawer } from './AddCandidateDrawer'
import { CandidateDrawer } from './CandidateDrawer'
import { HireDrawer } from './HireDrawer'
import { useCandidates } from '../../hooks/useRecruitment'
import type { CandidateWithRelations, JobOpeningWithRelations } from '../../types/db'

const TABS = [
  { key: 'jobs', label: 'Jobs' },
  { key: 'candidates', label: 'Candidates' },
  { key: 'onboarding', label: 'Onboarding' },
]

export function RecruitmentPage() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'hr_admin'
  const [tab, setTab] = useState('jobs')

  const [jobDrawerOpen, setJobDrawerOpen] = useState(false)
  const [editJob, setEditJob] = useState<JobOpeningWithRelations | null>(null)
  const [addCandidateOpen, setAddCandidateOpen] = useState(false)
  const [openCandidateId, setOpenCandidateId] = useState<string | null>(null)
  const [hireCandidateId, setHireCandidateId] = useState<string | null>(null)

  // Drawers read from the live cache so stage moves refresh in place.
  const candidates = useCandidates()
  const openCandidate = (candidates.data ?? []).find((c) => c.id === openCandidateId) ?? null
  const hireCandidate = (candidates.data ?? []).find((c) => c.id === hireCandidateId) ?? null

  return (
    <div>
      <PageHeader
        title="Recruitment"
        subtitle={
          isAdmin
            ? 'Job openings, candidate pipeline and onboarding'
            : 'Openings and candidates for your roles'
        }
        actions={
          isAdmin ? (
            tab === 'candidates' ? (
              <Button onClick={() => setAddCandidateOpen(true)}>
                <UserRoundPlus className="h-4 w-4" aria-hidden /> Add Candidate
              </Button>
            ) : tab === 'jobs' ? (
              <Button onClick={() => { setEditJob(null); setJobDrawerOpen(true) }}>
                <Plus className="h-4 w-4" aria-hidden /> New Job
              </Button>
            ) : undefined
          ) : undefined
        }
      />

      <div className="mb-5">
        <Tabs tabs={TABS} active={tab} onChange={setTab} />
      </div>

      {tab === 'jobs' && (
        <JobsTab
          onEdit={(job) => {
            setEditJob(job)
            setJobDrawerOpen(true)
          }}
        />
      )}
      {tab === 'candidates' && <CandidatesTab onOpenCandidate={(c) => setOpenCandidateId(c.id)} />}
      {tab === 'onboarding' && <OnboardingTab />}

      {isAdmin && (
        <>
          <JobFormDrawer
            open={jobDrawerOpen}
            onClose={() => setJobDrawerOpen(false)}
            job={editJob}
          />
          <AddCandidateDrawer open={addCandidateOpen} onClose={() => setAddCandidateOpen(false)} />
          <HireDrawer
            candidate={hireCandidate}
            onClose={() => setHireCandidateId(null)}
          />
        </>
      )}

      <CandidateDrawer
        candidate={openCandidate}
        canManage={!!isAdmin}
        onClose={() => setOpenCandidateId(null)}
        onHire={(c: CandidateWithRelations) => {
          setOpenCandidateId(null)
          setHireCandidateId(c.id)
        }}
      />
    </div>
  )
}
