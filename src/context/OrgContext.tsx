import React, { createContext, useContext, useState, useEffect } from 'react'

export interface Organization {
  id: number
  name: string
  slug: string
  created_at?: string
}

interface OrgContextType {
  currentOrg: Organization
  organizations: Organization[]
  setOrganizationId: (id: number) => void
  refreshOrganizations: () => Promise<void>
  isLoading: boolean
}

const DEFAULT_ORG: Organization = {
  id: 1,
  name: 'Tech Satu Solusi',
  slug: 'tech-satu-solusi',
}

const OrgContext = createContext<OrgContextType>({
  currentOrg: DEFAULT_ORG,
  organizations: [DEFAULT_ORG],
  setOrganizationId: () => {},
  refreshOrganizations: async () => {},
  isLoading: false,
})

const STORAGE_KEY = 'talenthub_active_org_id'

export const OrgProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [organizations, setOrganizations] = useState<Organization[]>([DEFAULT_ORG])
  const [activeOrgId, setActiveOrgId] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = parseInt(saved, 10)
      if (!isNaN(parsed) && parsed > 0) return parsed
    }
    return 1
  })
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const fetchOrganizations = async () => {
    try {
      const res = await fetch('/api/organizations')
      const data: unknown = await res.json()
      const list: Organization[] = Array.isArray(data)
        ? (data as Organization[])
        : data !== null &&
            typeof data === 'object' &&
            'id' in data &&
            typeof (data as { id: unknown }).id === 'number'
          ? [data as Organization]
          : []
      if (list.length > 0) {
        setOrganizations(list)
      }
    } catch (err) {
      console.error('Failed to load organizations', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch organizations from API
  useEffect(() => {
    fetchOrganizations()
  }, [])

  const handleSetOrgId = (id: number) => {
    setActiveOrgId(id)
    localStorage.setItem(STORAGE_KEY, id.toString())
    // Dispatch a storage or custom event if needed so other components react or trigger reload
    window.dispatchEvent(new CustomEvent('organizationChanged', { detail: { orgId: id } }))
  }

  const currentOrg = organizations.find(o => o.id === activeOrgId) || organizations[0] || DEFAULT_ORG

  return (
    <OrgContext.Provider value={{
      currentOrg,
      organizations,
      setOrganizationId: handleSetOrgId,
      refreshOrganizations: fetchOrganizations,
      isLoading
    }}>
      {children}
    </OrgContext.Provider>
  )
}

export const useOrg = () => useContext(OrgContext)

/**
 * Helper to fetch with the active organization id attached
 */
export function getActiveOrgId(): number {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    const parsed = parseInt(saved, 10)
    if (!isNaN(parsed) && parsed > 0) return parsed
  }
  return 1
}

export async function orgFetch(url: string, init?: RequestInit): Promise<Response> {
  // The session cookie identifies the tenant; the active organization id is
  // only a client-side display preference and must not be trusted by the API.
  return fetch(url, { ...init })
}
