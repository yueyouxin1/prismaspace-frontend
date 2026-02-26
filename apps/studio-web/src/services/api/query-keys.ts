export const workspaceScopedQueryKey = (
  workspaceUuid: string | null | undefined,
  ...segments: Array<string | number>
) => ['workspace', workspaceUuid ?? 'none', ...segments] as const

export const platformQueryKeys = {
  me: ['identity', 'me'] as const,
  teams: ['teams'] as const,
  workspaces: ['workspaces'] as const,
  resourceTypes: ['resource-types'] as const,
  productsPublic: ['products', 'public'] as const,
  entitlements: (owner: string) => ['entitlements', owner] as const,
  workspaceProjects: (workspaceUuid: string | null | undefined) => workspaceScopedQueryKey(workspaceUuid, 'projects'),
  workspaceResources: (workspaceUuid: string | null | undefined) => workspaceScopedQueryKey(workspaceUuid, 'resources'),
  resourceDetail: (resourceUuid: string) => ['resource', resourceUuid] as const,
  resourceInstances: (resourceUuid: string) => ['resource', resourceUuid, 'instances'] as const,
  toolResourceDetail: (workspaceUuid: string | null | undefined, resourceUuid: string | null | undefined) =>
    workspaceScopedQueryKey(workspaceUuid, 'tool', 'resource', resourceUuid ?? 'none'),
  toolInstance: (workspaceUuid: string | null | undefined, instanceUuid: string | null | undefined) =>
    workspaceScopedQueryKey(workspaceUuid, 'tool', 'instance', instanceUuid ?? 'none'),
  knowledgeDocuments: (
    instanceUuid: string,
    page: number,
    limit: number,
    statusFilter = 'all',
    keyword = '',
  ) => ['knowledge', instanceUuid, 'documents', page, limit, statusFilter, keyword] as const,
  knowledgeTaskProgress: (taskId: string) => ['knowledge', 'task-progress', taskId] as const,
  knowledgeSearchResult: (instanceUuid: string, querySignature: string) =>
    ['knowledge', instanceUuid, 'search', querySignature] as const,
  knowledgeInstance: (instanceUuid: string) => ['knowledge', instanceUuid, 'instance'] as const,
  tenantTables: (instanceUuid: string) => ['tenantdb', instanceUuid, 'tables'] as const,
  tenantTableDetail: (instanceUuid: string, tableUuid: string) =>
    ['tenantdb', instanceUuid, 'tables', tableUuid] as const,
  tenantTableRows: (instanceUuid: string, tableUuid: string, querySignature: string) =>
    ['tenantdb', instanceUuid, tableUuid, 'rows', querySignature] as const,
  workflowNodeDefs: ['workflow', 'nodes'] as const,
  chatSessions: (agentInstanceUuid: string, page: number, limit: number) =>
    ['chat', 'sessions', agentInstanceUuid, page, limit] as const,
  chatMessages: (sessionUuid: string, cursor: number, limit: number) =>
    ['chat', 'messages', sessionUuid, cursor, limit] as const,
  serviceModuleTypes: ['service-module-types'] as const,
  serviceModuleProviders: ['service-module-providers'] as const,
  serviceModulesAvailable: (workspaceUuid: string | null | undefined, moduleType: string) =>
    workspaceScopedQueryKey(workspaceUuid, 'service-modules', 'available', moduleType),
}
