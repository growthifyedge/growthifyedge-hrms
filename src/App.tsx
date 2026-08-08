import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { checkEnv } from './lib/env'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { CurrencyProvider } from './contexts/CurrencyContext'
import { ToastProvider } from './contexts/ToastContext'
import { AppShell } from './components/layout/AppShell'
import { AccessDenied } from './components/ui/states'
import { EnvSetupScreen } from './features/setup/EnvSetupScreen'
import { LoginPage } from './features/auth/LoginPage'
import type { Role } from './types/db'

const DashboardPage = lazy(() =>
  import('./features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })),
)
const PeoplePage = lazy(() =>
  import('./features/people/PeoplePage').then((m) => ({ default: m.PeoplePage })),
)
const EmployeeProfilePage = lazy(() =>
  import('./features/people/profile/EmployeeProfilePage').then((m) => ({
    default: m.EmployeeProfilePage,
  })),
)
const TimeLeavePage = lazy(() =>
  import('./features/timeleave/TimeLeavePage').then((m) => ({ default: m.TimeLeavePage })),
)
const RecruitmentPage = lazy(() =>
  import('./features/recruitment/RecruitmentPage').then((m) => ({ default: m.RecruitmentPage })),
)
const SettingsPage = lazy(() =>
  import('./features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)
const NotFoundPage = lazy(() =>
  import('./features/misc/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100" role="status" aria-label="Loading">
      <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-300 border-t-accent-600" />
    </div>
  )
}

/** Requires an authenticated session (and optionally one of the given roles). */
function Protected({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { loading, session, profile } = useAuth()
  if (loading) return <FullPageSpinner />
  if (!session) return <Navigate to="/login" replace />
  if (roles && profile && !roles.includes(profile.role)) {
    return (
      <AppShell>
        <AccessDenied />
      </AppShell>
    )
  }
  return (
    <AppShell>
      <Suspense fallback={<FullPageSpinner />}>{children}</Suspense>
    </AppShell>
  )
}

function LoginRoute() {
  const { loading, session } = useAuth()
  if (loading) return <FullPageSpinner />
  if (session) return <Navigate to="/dashboard" replace />
  return <LoginPage />
}

function RootRedirect() {
  const { loading, session } = useAuth()
  if (loading) return <FullPageSpinner />
  return <Navigate to={session ? '/dashboard' : '/login'} replace />
}

export default function App() {
  const envCheck = checkEnv()
  if (!envCheck.ok) {
    return <EnvSetupScreen missing={envCheck.missing} />
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <CurrencyProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<RootRedirect />} />
                <Route path="/login" element={<LoginRoute />} />
                <Route
                  path="/dashboard"
                  element={
                    <Protected>
                      <DashboardPage />
                    </Protected>
                  }
                />
                <Route
                  path="/people"
                  element={
                    <Protected roles={['hr_admin', 'manager']}>
                      <PeoplePage />
                    </Protected>
                  }
                />
                <Route
                  path="/people/:employeeId"
                  element={
                    <Protected roles={['hr_admin', 'manager']}>
                      <EmployeeProfilePage />
                    </Protected>
                  }
                />
                <Route
                  path="/time-leave"
                  element={
                    <Protected>
                      <TimeLeavePage />
                    </Protected>
                  }
                />
                <Route
                  path="/recruitment"
                  element={
                    <Protected roles={['hr_admin', 'manager']}>
                      <RecruitmentPage />
                    </Protected>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <Protected roles={['hr_admin']}>
                      <SettingsPage />
                    </Protected>
                  }
                />
                <Route
                  path="*"
                  element={
                    <Protected>
                      <NotFoundPage />
                    </Protected>
                  }
                />
              </Routes>
            </BrowserRouter>
          </CurrencyProvider>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  )
}
