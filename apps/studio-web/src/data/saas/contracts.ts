import type {
  ApiBusinessError,
  BillingAccount,
  EntitlementBalance,
  Membership,
  MockPageScenario,
  PermissionManifest,
  SessionPayload,
  TeamMember,
  TeamSummary,
  UserProfile,
  WorkspaceSummary,
} from '@app/types/saas'
import {
  defaultBilling,
  defaultEntitlement,
  defaultMembers,
  defaultMembership,
  defaultPermissions,
  defaultTeams,
  defaultUser,
  defaultWorkspaces,
} from '@app/data/saas/mock-data'

export interface AuthContracts {
  signIn: {
    request: { account: string; password: string }
    response: SessionPayload
  }
  signUp: {
    request: { email: string; password: string; agreePolicy: boolean }
    response: { userId: string; requiresEmailVerification: boolean }
  }
  forgotPassword: {
    request: { email: string }
    response: { cooldownSeconds: number }
  }
  refreshToken: {
    request: { refreshToken: string }
    response: { accessToken: string; expiresAt: string }
  }
}

export interface UserContracts {
  profile: UserProfile
  session: SessionPayload
  preference: Pick<UserProfile, 'locale' | 'theme'>
}

export interface SubscriptionContracts {
  membership: Membership
  entitlement: EntitlementBalance
}

export interface BillingContracts {
  billingAccount: BillingAccount
  invoices: Array<{ id: string; amount: number; status: 'paid' | 'pending' | 'failed' }>
  paymentRecords: Array<{ id: string; amount: number; at: string }>
}

export interface TeamContracts {
  teams: TeamSummary[]
  workspaces: WorkspaceSummary[]
  members: TeamMember[]
  permissionManifest: PermissionManifest
}

export const errorCodeContract: Array<{ status: number; semantics: string }> = [
  { status: 401, semantics: '会话失效或未登录，需重新认证' },
  { status: 402, semantics: '额度或支付状态不足，需充值或升级' },
  { status: 403, semantics: '权限不足，禁止当前操作' },
  { status: 409, semantics: '资源冲突，建议用户刷新并重试' },
  { status: 422, semantics: '请求参数校验失败，需展示字段级错误' },
  { status: 429, semantics: '请求频率超限，提示稍后重试' },
]

const quotaError: ApiBusinessError = {
  status: 402,
  code: 'quota_exhausted',
  message: '当前工作空间额度不足，请升级套餐后继续。',
  actionText: '升级套餐',
}

const forbiddenError: ApiBusinessError = {
  status: 403,
  code: 'permission_denied',
  message: '当前角色无法执行该操作，请联系团队管理员授权。',
  actionText: '查看权限说明',
}

const throttledError: ApiBusinessError = {
  status: 429,
  code: 'too_many_requests',
  message: '请求过于频繁，请在 30 秒后重试。',
}

export const dashboardScenarios: MockPageScenario<{ membership: Membership; entitlement: EntitlementBalance }> = {
  success: {
    membership: defaultMembership,
    entitlement: defaultEntitlement,
  },
  failure: quotaError,
  boundary: {
    membership: { ...defaultMembership, status: 'trialing', renewAt: '2026-02-25T00:00:00Z' },
    entitlement: { ...defaultEntitlement, usedQuota: defaultEntitlement.monthlyQuota - 1 },
  },
}

export const projectsScenarios: MockPageScenario<{ total: number; pageSize: number }> = {
  success: { total: 37, pageSize: 10 },
  failure: throttledError,
  boundary: { total: 0, pageSize: 10 },
}

export const checkoutScenarios: MockPageScenario<{ orderId: string; amount: number; currency: string }> = {
  success: { orderId: 'ord_20260220_0001', amount: 99, currency: 'USD' },
  failure: forbiddenError,
  boundary: { orderId: 'ord_20260220_0002', amount: 0, currency: 'USD' },
}

export const teamScenarios: MockPageScenario<{ teamCount: number; memberCount: number }> = {
  success: { teamCount: defaultTeams.length, memberCount: defaultMembers.length },
  failure: forbiddenError,
  boundary: { teamCount: 1, memberCount: 1 },
}

export const contractExamples: {
  auth: AuthContracts
  user: UserContracts
  subscription: SubscriptionContracts
  billing: BillingContracts
  team: TeamContracts
} = {
  auth: {
    signIn: {
      request: { account: 'builder@prismaspace.dev', password: 'StrongPass!2026' },
      response: {
        accessToken: 'access_token_sample',
        refreshToken: 'refresh_token_sample',
        expiresAt: '2026-02-20T23:00:00Z',
        user: defaultUser,
      },
    },
    signUp: {
      request: { email: 'new.user@prismaspace.dev', password: 'StrongPass!2026', agreePolicy: true },
      response: { userId: 'usr_new_001', requiresEmailVerification: true },
    },
    forgotPassword: {
      request: { email: 'builder@prismaspace.dev' },
      response: { cooldownSeconds: 60 },
    },
    refreshToken: {
      request: { refreshToken: 'refresh_token_sample' },
      response: { accessToken: 'access_token_refreshed', expiresAt: '2026-02-21T01:00:00Z' },
    },
  },
  user: {
    profile: defaultUser,
    session: {
      accessToken: 'access_token_sample',
      refreshToken: 'refresh_token_sample',
      expiresAt: '2026-02-20T23:00:00Z',
      user: defaultUser,
    },
    preference: {
      locale: defaultUser.locale,
      theme: defaultUser.theme,
    },
  },
  subscription: {
    membership: defaultMembership,
    entitlement: defaultEntitlement,
  },
  billing: {
    billingAccount: defaultBilling,
    invoices: [
      { id: 'inv_001', amount: 99, status: 'paid' },
      { id: 'inv_002', amount: 99, status: 'pending' },
    ],
    paymentRecords: [
      { id: 'pay_001', amount: 99, at: '2026-01-20T00:00:00Z' },
      { id: 'pay_002', amount: 99, at: '2025-12-20T00:00:00Z' },
    ],
  },
  team: {
    teams: defaultTeams,
    workspaces: defaultWorkspaces,
    members: defaultMembers,
    permissionManifest: defaultPermissions,
  },
}
