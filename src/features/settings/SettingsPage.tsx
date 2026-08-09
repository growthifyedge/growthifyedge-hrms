import { useState } from 'react'
import { PageHeader } from '../../components/layout/AppShell'
import { Tabs } from '../../components/ui/Tabs'
import { OrganizationSettings } from './OrganizationSettings'
import { DepartmentsSettings } from './DepartmentsSettings'
import { DesignationsSettings } from './DesignationsSettings'
import { LocationsSettings } from './LocationsSettings'
import { ExchangeRatesSettings } from './ExchangeRatesSettings'
import { SecuritySettings } from './SecuritySettings'

const TABS = [
  { key: 'organization', label: 'Organization' },
  { key: 'departments', label: 'Departments' },
  { key: 'designations', label: 'Designations' },
  { key: 'locations', label: 'Work Locations' },
  { key: 'rates', label: 'Exchange Rates' },
  { key: 'security', label: 'Security' },
]

export function SettingsPage() {
  const [tab, setTab] = useState('organization')
  return (
    <div>
      <PageHeader title="Settings" subtitle="Organization structure and configuration" />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      <div className="mt-5">
        {tab === 'organization' && <OrganizationSettings />}
        {tab === 'departments' && <DepartmentsSettings />}
        {tab === 'designations' && <DesignationsSettings />}
        {tab === 'locations' && <LocationsSettings />}
        {tab === 'rates' && <ExchangeRatesSettings />}
        {tab === 'security' && <SecuritySettings />}
      </div>
    </div>
  )
}
