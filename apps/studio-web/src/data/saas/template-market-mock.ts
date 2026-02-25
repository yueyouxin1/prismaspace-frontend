export type TemplateAuthorType = 'official' | 'community'

export interface TemplateMarketMockItem {
  id: string
  title: string
  category: string
  description: string
  tags: string[]
  coverGradient: string
  author: {
    name: string
    type: TemplateAuthorType
  }
  updatedAt: string
  usageCount: number
  likeCount: number
  featured: boolean
}

// TODO(backend-gap): replace with real template APIs when backend provides
// GET /api/v1/templates/categories
// GET /api/v1/templates
// GET /api/v1/templates/{template_uuid}
// Offboarding condition: remove this file in the same iteration when template APIs are stable.
export const templateMarketMockItems: TemplateMarketMockItem[] = [
  {
    id: 'tpl-saas-copilot',
    title: 'SaaS Copilot',
    category: 'Customer Support',
    description: '快速构建带 FAQ、工单分流与会话摘要的客服入口。',
    tags: ['chat', 'faq', 'support'],
    coverGradient: 'from-cyan-500/80 to-blue-500/80',
    author: {
      name: 'PrismaSpace Official',
      type: 'official',
    },
    updatedAt: '2026-02-18T10:20:00.000Z',
    usageCount: 12834,
    likeCount: 2331,
    featured: true,
  },
  {
    id: 'tpl-growth-landing',
    title: 'Growth Landing',
    category: 'Marketing',
    description: '面向增长落地页的模板，内置线索转化埋点与 A/B 结构。',
    tags: ['landing', 'growth', 'analytics'],
    coverGradient: 'from-amber-500/80 to-orange-500/80',
    author: {
      name: 'Studio Crew',
      type: 'community',
    },
    updatedAt: '2026-02-17T08:00:00.000Z',
    usageCount: 9542,
    likeCount: 1870,
    featured: true,
  },
  {
    id: 'tpl-agent-workflow',
    title: 'Agent Workflow',
    category: 'Automation',
    description: '节点式自动化流程模板，适合审批、通知和告警联动。',
    tags: ['workflow', 'agent', 'automation'],
    coverGradient: 'from-violet-500/80 to-indigo-500/80',
    author: {
      name: 'PrismaSpace Official',
      type: 'official',
    },
    updatedAt: '2026-02-16T03:30:00.000Z',
    usageCount: 11021,
    likeCount: 2012,
    featured: true,
  },
  {
    id: 'tpl-retail-ops',
    title: 'Retail Ops Control',
    category: 'Operations',
    description: '覆盖补货、价格巡检与门店告警看板的一体化运营模板。',
    tags: ['retail', 'ops', 'dashboard'],
    coverGradient: 'from-emerald-500/80 to-teal-500/80',
    author: {
      name: 'Northwind Lab',
      type: 'community',
    },
    updatedAt: '2026-02-15T12:10:00.000Z',
    usageCount: 4320,
    likeCount: 732,
    featured: false,
  },
  {
    id: 'tpl-content-factory',
    title: 'Content Factory',
    category: 'Marketing',
    description: '从选题、草稿、审校到发布的多角色内容生产流水线。',
    tags: ['content', 'workflow', 'seo'],
    coverGradient: 'from-rose-500/80 to-pink-500/80',
    author: {
      name: 'PrismaSpace Official',
      type: 'official',
    },
    updatedAt: '2026-02-14T09:45:00.000Z',
    usageCount: 6732,
    likeCount: 1189,
    featured: false,
  },
  {
    id: 'tpl-dev-oncall',
    title: 'Dev On-call Assistant',
    category: 'Engineering',
    description: '用于错误聚合、值班轮值提醒和故障复盘记录的工程模板。',
    tags: ['incident', 'ops', 'engineering'],
    coverGradient: 'from-slate-500/80 to-zinc-500/80',
    author: {
      name: 'Latency Zero',
      type: 'community',
    },
    updatedAt: '2026-02-12T16:20:00.000Z',
    usageCount: 3890,
    likeCount: 602,
    featured: false,
  },
  {
    id: 'tpl-hiring-pipeline',
    title: 'Hiring Pipeline',
    category: 'HR',
    description: '职位发布、简历筛选、面试反馈与 offer 流程一体化模板。',
    tags: ['hr', 'pipeline', 'recruiting'],
    coverGradient: 'from-sky-500/80 to-indigo-400/80',
    author: {
      name: 'PrismaSpace Official',
      type: 'official',
    },
    updatedAt: '2026-02-11T11:00:00.000Z',
    usageCount: 5201,
    likeCount: 801,
    featured: false,
  },
  {
    id: 'tpl-finance-approval',
    title: 'Finance Approval Flow',
    category: 'Finance',
    description: '预算申请、审批留痕、超额预警与报表导出的财务流程模板。',
    tags: ['finance', 'approval', 'workflow'],
    coverGradient: 'from-lime-500/80 to-green-600/80',
    author: {
      name: 'Audit Forge',
      type: 'community',
    },
    updatedAt: '2026-02-10T05:50:00.000Z',
    usageCount: 2976,
    likeCount: 490,
    featured: false,
  },
]
