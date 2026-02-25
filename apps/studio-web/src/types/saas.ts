export type HttpBusinessStatus = 400 | 401 | 402 | 403 | 404 | 409 | 422 | 429 | 500 | 502 | 503 | 504

export interface ApiBusinessError {
  status: HttpBusinessStatus
  code: string
  message: string
  actionText?: string
}

export interface UserProfile {
  id: string
  email: string
  phone?: string
  displayName: string
  avatarUrl?: string
  locale: 'zh-CN' | 'en-US'
  theme: 'light' | 'dark' | 'system'
}

export interface SessionPayload {
  accessToken: string
  refreshToken: string
  expiresAt: string
  user: UserProfile
}

export interface TeamSummary {
  id: string
  name: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
}

export interface WorkspaceSummary {
  id: string
  name: string
  teamId: string
  environment: 'dev' | 'staging' | 'prod'
}

export interface Membership {
  plan: 'free' | 'pro' | 'team'
  status: 'active' | 'trialing' | 'past_due' | 'canceled'
  renewAt: string
}

export interface EntitlementBalance {
  monthlyQuota: number
  usedQuota: number
  tokenBalance: number
}

export interface BillingAccount {
  id: string
  ownerType: 'user' | 'team'
  ownerId: string
  currency: 'USD' | 'CNY'
  nextInvoiceAmount: number
  paymentMethod: string
}

export interface TemplateItem {
  id: string
  name: string
  category: string
  tags: string[]
  recommended: boolean
  description: string
}

export interface ProjectItem {
  id: string
  name: string
  templateName: string
  updatedAt: string
  status: 'draft' | 'running' | 'failed'
}

export interface TeamMember {
  id: string
  name: string
  email: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  joinedAt: string
}

export interface PermissionManifest {
  version: string
  actions: string[]
}

export interface PlanDefinition {
  id: 'free' | 'pro' | 'team'
  name: string
  monthlyPrice: number
  highlights: string[]
}

export interface MockPageScenario<TSuccess> {
  success: TSuccess
  failure: ApiBusinessError
  boundary: TSuccess
}
