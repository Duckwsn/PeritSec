import { apiRequest, type Account, type AccountRole, type ApiResult, type OnboardingStatus } from './auth'
import type { ExpertiseId, ExpertiseLevel } from './progression'

export interface AdminAccountCounts {
  lessons: number
  exercises: number
  labs: number
  cases: number
  activity: number
  backups: number
}

export interface AdminAccount {
  id: string
  username: string
  displayName: string
  expertise: ExpertiseId
  initialExpertise: ExpertiseId
  role: AccountRole
  onboardingStatus: OnboardingStatus
  onboardingStartedAt: string | null
  onboardingCompletedAt: string | null
  createdAt: string
  updatedAt: string
  effectiveExpertise: ExpertiseLevel
  hasProgress: boolean
  progressUpdatedAt: string | null
  counts: AdminAccountCounts
}

export interface AdminContentSummary {
  total: number
  lessons: number
  labs: number
  cases: number
  tracks: number
}

export interface AdminOverview {
  ok: true
  app: string
  schemaVersion: number
  dataDir: string
  viewer: { id: string; username: string; role: AccountRole }
  accountCount: number
  adminCount: number
  accounts: AdminAccount[]
  content: AdminContentSummary
  generatedAt: string
}

export interface AdminRoleResult {
  ok: true
  account: AdminAccount
}

export interface AdminElevateResult {
  ok: true
  alreadyAdmin: boolean
  account: Account
}

export function fetchAdminOverview(): Promise<ApiResult<AdminOverview>> {
  return apiRequest<AdminOverview>('/api/admin/overview')
}

export function elevateToAdmin(): Promise<ApiResult<AdminElevateResult>> {
  return apiRequest<AdminElevateResult>('/api/admin/elevate', { method: 'POST' })
}

export function updateAccountRole(
  accountId: string,
  role: AccountRole,
): Promise<ApiResult<AdminRoleResult>> {
  return apiRequest<AdminRoleResult>(
    `/api/admin/accounts/${encodeURIComponent(accountId)}/role`,
    {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    },
  )
}
