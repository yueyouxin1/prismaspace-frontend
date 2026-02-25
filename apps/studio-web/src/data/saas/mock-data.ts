import type {
  BillingAccount,
  EntitlementBalance,
  Membership,
  PermissionManifest,
  PlanDefinition,
  ProjectItem,
  TeamMember,
  TeamSummary,
  TemplateItem,
  UserProfile,
  WorkspaceSummary,
} from '@app/types/saas'

export const marketingTemplates: TemplateItem[] = [
  {
    id: 'tpl-saas-copilot',
    name: 'SaaS Copilot',
    category: 'Customer Support',
    tags: ['chat', 'knowledge-base', 'support'],
    recommended: true,
    description: '快速搭建带 FAQ 与工单分流的 AI 客服入口。',
  },
  {
    id: 'tpl-growth-landing',
    name: 'Growth Landing',
    category: 'Marketing',
    tags: ['landing', 'seo', 'analytics'],
    recommended: true,
    description: '面向增长场景的模板市场首页，内置 CTA 漏斗。',
  },
  {
    id: 'tpl-agent-workflow',
    name: 'Agent Workflow',
    category: 'Automation',
    tags: ['workflow', 'agent', 'ops'],
    recommended: false,
    description: '通过节点编排实现自动化审批与通知链路。',
  },
  {
    id: 'tpl-team-knowledge',
    name: 'Team Knowledge Hub',
    category: 'Knowledge',
    tags: ['rag', 'docs', 'search'],
    recommended: false,
    description: '为团队内部知识检索构建标准化问答入口。',
  },
]

export const plans: PlanDefinition[] = [
  {
    id: 'free',
    name: 'Free',
    monthlyPrice: 0,
    highlights: ['1 workspace', '基础模板市场', '每月 20k tokens'],
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 29,
    highlights: ['5 workspaces', '高级模板与部署', '每月 300k tokens'],
  },
  {
    id: 'team',
    name: 'Team',
    monthlyPrice: 99,
    highlights: ['无限成员协作', '权限与计费中心', '每月 2M tokens'],
  },
]

export const defaultUser: UserProfile = {
  id: 'usr_01HXYZ12',
  email: 'builder@prismaspace.dev',
  phone: '+1-415-555-0136',
  displayName: 'Product Builder',
  locale: 'zh-CN',
  theme: 'system',
}

export const defaultTeams: TeamSummary[] = [
  { id: 'team_personal', name: 'Personal Space', role: 'owner' },
  { id: 'team_studio', name: 'Studio Labs', role: 'admin' },
]

export const defaultWorkspaces: WorkspaceSummary[] = [
  { id: 'ws_personal_dev', name: 'Personal Dev', teamId: 'team_personal', environment: 'dev' },
  { id: 'ws_studio_prod', name: 'Studio Production', teamId: 'team_studio', environment: 'prod' },
]

export const defaultMembership: Membership = {
  plan: 'pro',
  status: 'active',
  renewAt: '2026-03-18T00:00:00Z',
}

export const defaultEntitlement: EntitlementBalance = {
  monthlyQuota: 300000,
  usedQuota: 126500,
  tokenBalance: 173500,
}

export const defaultBilling: BillingAccount = {
  id: 'bill_001',
  ownerType: 'team',
  ownerId: 'team_studio',
  currency: 'USD',
  nextInvoiceAmount: 99,
  paymentMethod: 'Visa •••• 4242',
}

export const defaultProjects: ProjectItem[] = [
  {
    id: 'proj_001',
    name: 'Growth Assistant',
    templateName: 'SaaS Copilot',
    updatedAt: '2026-02-19T13:20:00Z',
    status: 'running',
  },
  {
    id: 'proj_002',
    name: 'Knowledge Search',
    templateName: 'Team Knowledge Hub',
    updatedAt: '2026-02-17T02:15:00Z',
    status: 'draft',
  },
  {
    id: 'proj_003',
    name: 'Onboarding Flow',
    templateName: 'Growth Landing',
    updatedAt: '2026-02-16T08:40:00Z',
    status: 'failed',
  },
]

export const defaultMembers: TeamMember[] = [
  {
    id: 'mem_001',
    name: 'Nora Li',
    email: 'nora@studio.dev',
    role: 'owner',
    joinedAt: '2025-12-01T10:00:00Z',
  },
  {
    id: 'mem_002',
    name: 'Alex Kim',
    email: 'alex@studio.dev',
    role: 'admin',
    joinedAt: '2026-01-08T09:30:00Z',
  },
  {
    id: 'mem_003',
    name: 'Chris Wang',
    email: 'chris@studio.dev',
    role: 'member',
    joinedAt: '2026-01-22T17:40:00Z',
  },
]

export const defaultPermissions: PermissionManifest = {
  version: '2026.02.20',
  actions: [
    'workspace.read',
    'workspace.write',
    'project.create',
    'project.delete',
    'member.invite',
    'billing.view',
    'billing.manage',
  ],
}
