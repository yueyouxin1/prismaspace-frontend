<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import ResourceWorkbenchShell from '@app/components/workbench/ResourceWorkbenchShell.vue'
import AgentWorkbenchPanel from '@app/views/workbench/panels/AgentWorkbenchPanel.vue'
import KnowledgeWorkbenchPanel from '@app/views/workbench/panels/KnowledgeWorkbenchPanel.vue'
import TenantDbWorkbenchPanel from '@app/views/workbench/panels/TenantDbWorkbenchPanel.vue'
import ToolWorkbenchPanel from '@app/views/workbench/panels/ToolWorkbenchPanel.vue'
import UiAppWorkbenchPanel from '@app/views/workbench/panels/UiAppWorkbenchPanel.vue'
import WorkflowWorkbenchPanel from '@app/views/workbench/panels/WorkflowWorkbenchPanel.vue'
import { platformQueryKeys } from '@app/services/api/query-keys'
import { resourceApi } from '@app/services/api/resource-client'
import { usePlatformStore } from '@app/stores/platform'
import { emitBusinessError } from '@app/services/http/error-gateway'
import { Badge } from '@repo/ui-shadcn/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@repo/ui-shadcn/components/ui/card'
import { Skeleton } from '@repo/ui-shadcn/components/ui/skeleton'

const SUPPORTED_PANELS = ['editor', 'run', 'versions', 'refs'] as const

const route = useRoute()
const router = useRouter()
const store = usePlatformStore()
const { locale } = useI18n()

const workspaceUuidParam = computed(() => String(route.params.workspaceUuid ?? ''))
const resourceUuid = computed(() => String(route.params.resourceUuid ?? ''))
const panelParam = computed(() => String(route.params.panel ?? 'editor'))
const activePanel = computed(() => (SUPPORTED_PANELS.includes(panelParam.value as (typeof SUPPORTED_PANELS)[number]) ? panelParam.value : 'editor'))

const workspaceExists = computed(() => store.workspaces.some((workspace) => workspace.uuid === workspaceUuidParam.value))
const canonicalResolving = ref(false)
const resolveTried = ref(false)
const notFoundReason = ref('')

onMounted(async () => {
  await store.loadPlatformContext()
})

watch(
  panelParam,
  async (panel) => {
    if (!SUPPORTED_PANELS.includes(panel as (typeof SUPPORTED_PANELS)[number])) {
      await router.replace(`/studio/workspaces/${workspaceUuidParam.value}/resources/${resourceUuid.value}/editor`)
    }
  },
  { immediate: true },
)

watch(
  [workspaceUuidParam, () => store.workspaces.length],
  ([workspaceUuid]) => {
    const selected = store.currentWorkspace?.uuid
    if (workspaceUuid && selected !== workspaceUuid && store.workspaces.some((workspace) => workspace.uuid === workspaceUuid)) {
      store.switchWorkspace(workspaceUuid)
    }
  },
  { immediate: true },
)

const workspaceResourcesQuery = useQuery({
  queryKey: computed(() => [...platformQueryKeys.workspaceResources(workspaceUuidParam.value), 'workbench-route-check']),
  enabled: computed(() => Boolean(workspaceUuidParam.value && workspaceExists.value)),
  queryFn: async () => resourceApi.listWorkspaceResources(workspaceUuidParam.value),
})

const resourceQuery = useQuery({
  queryKey: computed(() => platformQueryKeys.resourceDetail(resourceUuid.value)),
  enabled: computed(() => Boolean(resourceUuid.value && workspaceExists.value)),
  queryFn: async () => resourceApi.getResource(resourceUuid.value),
})

const instancesQuery = useQuery({
  queryKey: computed(() => platformQueryKeys.resourceInstances(resourceUuid.value)),
  enabled: computed(() => Boolean(resourceUuid.value && workspaceExists.value)),
  queryFn: async () => resourceApi.listResourceInstances(resourceUuid.value),
})

const resourceInWorkspace = computed(() => {
  return workspaceResourcesQuery.data.value?.find((resource) => resource.uuid === resourceUuid.value) ?? null
})

const resolveCanonicalWorkspace = async (): Promise<void> => {
  if (canonicalResolving.value || resolveTried.value || !resourceUuid.value) {
    return
  }

  resolveTried.value = true
  canonicalResolving.value = true

  try {
    for (const workspace of store.workspaces) {
      if (workspace.uuid === workspaceUuidParam.value) {
        continue
      }

      const resources = await resourceApi.listWorkspaceResources(workspace.uuid)
      const matched = resources.some((resource) => resource.uuid === resourceUuid.value)
      if (matched) {
        await router.replace(`/studio/workspaces/${workspace.uuid}/resources/${resourceUuid.value}/${activePanel.value}`)
        return
      }
    }

    notFoundReason.value = 'resource_not_found_in_accessible_workspaces'
  } catch (error) {
    emitBusinessError(error)
  } finally {
    canonicalResolving.value = false
  }
}

watch(
  [() => workspaceResourcesQuery.isLoading.value, () => workspaceResourcesQuery.data.value, () => resourceQuery.isSuccess.value],
  async ([loading, resources, resourceReady]) => {
    if (loading || !resourceReady || !resources) {
      return
    }

    if (!resources.some((resource) => resource.uuid === resourceUuid.value)) {
      await resolveCanonicalWorkspace()
    }
  },
  { immediate: true },
)

watch(
  workspaceUuidParam,
  () => {
    resolveTried.value = false
    notFoundReason.value = ''
  },
)

const panelLinks = computed(() => {
  const base = `/studio/workspaces/${workspaceUuidParam.value}/resources/${resourceUuid.value}`
  return [
    { key: 'editor', label: 'Editor', to: `${base}/editor` },
    { key: 'run', label: 'Run', to: `${base}/run` },
    { key: 'versions', label: 'Versions', to: `${base}/versions` },
    { key: 'refs', label: 'Refs', to: `${base}/refs` },
  ]
})

const workbenchComponent = computed(() => {
  const type = resourceQuery.data.value?.resource_type
  if (!type) {
    return null
  }

  if (type === 'uiapp') {
    return UiAppWorkbenchPanel
  }
  if (type === 'agent') {
    return AgentWorkbenchPanel
  }
  if (type === 'workflow') {
    return WorkflowWorkbenchPanel
  }
  if (type === 'knowledge') {
    return KnowledgeWorkbenchPanel
  }
  if (type === 'tenantdb') {
    return TenantDbWorkbenchPanel
  }
  if (type === 'tool') {
    return ToolWorkbenchPanel
  }
  return null
})

const workbenchProps = computed(() => {
  const data = resourceQuery.data.value
  if (!data) {
    return null
  }

  const workspaceInstanceUuidFromSummary = resourceInWorkspace.value?.workspace_instance_uuid ?? null
  const workspaceInstanceUuidFromDetail = data.workspace_instance_uuid ?? null

  return {
    resourceName: data.name,
    workspaceInstanceUuid: workspaceInstanceUuidFromDetail || workspaceInstanceUuidFromSummary,
    latestPublishedInstanceUuid: data.latest_published_instance_uuid,
    workspaceInstance: data.workspace_instance,
  }
})

const formatDate = (value: string): string => {
  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

const goBack = async (): Promise<void> => {
  await router.push('/resources')
}

const refreshAll = async (): Promise<void> => {
  await Promise.all([
    store.loadPlatformContext(),
    workspaceResourcesQuery.refetch(),
    resourceQuery.refetch(),
    instancesQuery.refetch(),
  ])
}

const loading = computed(() => {
  return (
    store.loading ||
    workspaceResourcesQuery.isLoading.value ||
    resourceQuery.isLoading.value ||
    instancesQuery.isLoading.value ||
    canonicalResolving.value
  )
})

const shouldShowMissing = computed(() => {
  if (!workspaceUuidParam.value || !resourceUuid.value) {
    return true
  }
  if (!workspaceExists.value) {
    return true
  }
  if (notFoundReason.value) {
    return true
  }
  if (resourceQuery.isError.value) {
    return true
  }
  if (!loading.value && workspaceResourcesQuery.data.value && !resourceInWorkspace.value && resolveTried.value) {
    return true
  }
  return false
})
</script>

<template>
  <ResourceWorkbenchShell
    :resource-name="resourceQuery.data.value?.name ?? 'Resource Workbench'"
    :resource-type="resourceQuery.data.value?.resource_type ?? '-'"
    :workspace-label="store.currentWorkspace?.name ?? workspaceUuidParam"
    :loading="loading"
    :panels="panelLinks"
    :active-panel="activePanel"
    @back="goBack"
    @refresh="refreshAll"
  >
    <template #left>
      <Card>
        <CardHeader>
          <CardTitle class="text-sm">Versions</CardTitle>
        </CardHeader>
        <CardContent class="space-y-2">
          <template v-if="instancesQuery.isLoading.value">
            <Skeleton class="h-9 w-full" />
            <Skeleton class="h-9 w-full" />
            <Skeleton class="h-9 w-full" />
          </template>
          <template v-else>
            <div
              v-for="instance in instancesQuery.data.value ?? []"
              :key="instance.uuid"
              class="rounded-md border px-2 py-1.5"
            >
              <p class="truncate text-xs font-medium">{{ instance.version_tag }}</p>
              <div class="mt-1 flex items-center justify-between gap-2">
                <Badge variant="outline" class="text-[10px]">{{ instance.status }}</Badge>
                <span class="text-[10px] text-muted-foreground">{{ formatDate(instance.created_at) }}</span>
              </div>
            </div>
            <p v-if="!(instancesQuery.data.value ?? []).length" class="text-xs text-muted-foreground">No versions found.</p>
          </template>
        </CardContent>
      </Card>
    </template>

    <template v-if="loading">
      <div class="space-y-3">
        <Skeleton class="h-24 w-full" />
        <Skeleton class="h-52 w-full" />
      </div>
    </template>

    <template v-else-if="shouldShowMissing">
      <Card>
        <CardHeader>
          <CardTitle>Resource Not Available</CardTitle>
        </CardHeader>
        <CardContent class="space-y-2 text-sm text-muted-foreground">
          <p v-if="!workspaceExists">Workspace does not exist or is inaccessible.</p>
          <p v-else-if="notFoundReason">Resource is not found under current accessible workspaces.</p>
          <p v-else-if="resourceQuery.isError.value">Failed to load resource detail. Please refresh and retry.</p>
          <p v-else>Resource is unavailable for this route.</p>
        </CardContent>
      </Card>
    </template>

    <template v-else-if="workbenchComponent && workbenchProps">
      <component :is="workbenchComponent" v-bind="workbenchProps" />
    </template>

    <template v-else>
      <Card>
        <CardHeader>
          <CardTitle>Unsupported Resource Type</CardTitle>
        </CardHeader>
        <CardContent class="text-sm text-muted-foreground">
          The resource type <code>{{ resourceQuery.data.value?.resource_type }}</code> is not supported by current workbench packages.
        </CardContent>
      </Card>
    </template>

    <template #right>
      <Card>
        <CardHeader>
          <CardTitle class="text-sm">Resource Metadata</CardTitle>
        </CardHeader>
        <CardContent class="space-y-2 text-xs">
          <div>
            <p class="text-muted-foreground">Resource UUID</p>
            <p class="break-all font-mono">{{ resourceUuid }}</p>
          </div>
          <div>
            <p class="text-muted-foreground">Workspace UUID</p>
            <p class="break-all font-mono">{{ workspaceUuidParam }}</p>
          </div>
          <div>
            <p class="text-muted-foreground">Updated At</p>
            <p>{{ resourceQuery.data.value?.updated_at ? formatDate(resourceQuery.data.value.updated_at) : '-' }}</p>
          </div>
          <div>
            <p class="text-muted-foreground">Creator</p>
            <p>{{ resourceQuery.data.value?.creator?.nick_name || resourceQuery.data.value?.creator?.uuid || '-' }}</p>
          </div>
        </CardContent>
      </Card>
    </template>

    <template #footer>
      <div class="flex items-center justify-between">
        <span>Immersive workbench mode enabled.</span>
        <span>
          {{ resourceQuery.data.value?.latest_published_instance_uuid ? 'Published version available' : 'Draft only' }}
        </span>
      </div>
    </template>
  </ResourceWorkbenchShell>
</template>
