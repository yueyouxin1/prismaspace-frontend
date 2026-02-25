import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { entitlementApi } from '@app/services/api/entitlement-client'
import { platformQueryKeys } from '@app/services/api/query-keys'
import { projectApi } from '@app/services/api/project-client'
import { resourceApi } from '@app/services/api/resource-client'
import { usePlatformStore } from '@app/stores/platform'
import type { EntitlementBalanceRead, ProjectRead, ResourceRead } from '@app/services/api/contracts'

const parseNumeric = (value: number | string | undefined): number => {
  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

const toSortedByUpdatedAt = <T extends { updated_at: string }>(items: T[]): T[] => {
  return [...items].sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
}

export const useDashboardData = () => {
  const store = usePlatformStore()

  const workspaceUuid = computed(() => store.currentWorkspace?.uuid ?? null)
  const entitlementOwnerKey = computed(() => {
    const workspace = store.currentWorkspace
    if (!workspace) {
      return 'none'
    }
    return workspace.owner.type === 'team' ? `team:${workspace.owner.uuid}` : 'me'
  })

  const projectsQuery = useQuery({
    queryKey: computed(() => platformQueryKeys.workspaceProjects(workspaceUuid.value)),
    enabled: computed(() => Boolean(workspaceUuid.value)),
    queryFn: async () => projectApi.listWorkspaceProjects(workspaceUuid.value as string),
  })

  const resourcesQuery = useQuery({
    queryKey: computed(() => platformQueryKeys.workspaceResources(workspaceUuid.value)),
    enabled: computed(() => Boolean(workspaceUuid.value)),
    queryFn: async () => resourceApi.listWorkspaceResources(workspaceUuid.value as string),
  })

  const entitlementQuery = useQuery({
    queryKey: computed(() => platformQueryKeys.entitlements(entitlementOwnerKey.value)),
    enabled: computed(() => entitlementOwnerKey.value !== 'none'),
    queryFn: async (): Promise<EntitlementBalanceRead[]> => {
      const workspace = store.currentWorkspace
      if (!workspace) {
        return []
      }

      if (workspace.owner.type === 'team') {
        return entitlementApi.listTeamEntitlements(workspace.owner.uuid)
      }

      return entitlementApi.listMyEntitlements()
    },
  })

  const projects = computed<ProjectRead[]>(() => projectsQuery.data.value ?? [])
  const resources = computed<ResourceRead[]>(() => resourcesQuery.data.value ?? [])
  const entitlements = computed<EntitlementBalanceRead[]>(() => entitlementQuery.data.value ?? [])

  const recentProjects = computed(() => toSortedByUpdatedAt(projects.value).slice(0, 6))
  const recentResources = computed(() => toSortedByUpdatedAt(resources.value).slice(0, 6))

  const quotaSummary = computed(() => {
    return entitlements.value.reduce(
      (acc, item) => {
        acc.granted += parseNumeric(item.granted_quota)
        acc.consumed += parseNumeric(item.consumed_usage)
        return acc
      },
      { granted: 0, consumed: 0 },
    )
  })

  const metrics = computed(() => ({
    workspaceCount: store.workspaces.length,
    projectCount: projects.value.length,
    resourceCount: resources.value.length,
    quotaGranted: quotaSummary.value.granted,
    quotaConsumed: quotaSummary.value.consumed,
    quotaRemaining: Math.max(quotaSummary.value.granted - quotaSummary.value.consumed, 0),
  }))

  const isLoading = computed(
    () => projectsQuery.isLoading.value || resourcesQuery.isLoading.value || entitlementQuery.isLoading.value,
  )

  return {
    projects,
    resources,
    entitlements,
    recentProjects,
    recentResources,
    metrics,
    isLoading,
    projectsQuery,
    resourcesQuery,
    entitlementQuery,
  }
}

