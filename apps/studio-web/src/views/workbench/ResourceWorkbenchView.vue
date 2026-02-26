<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useRoute, useRouter } from 'vue-router'
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
import { provideResourceWorkbenchContext } from '@app/views/workbench/workbench-context'
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

const workspaceUuidParam = computed(() => String(route.params.workspaceUuid ?? ''))
const resourceUuid = computed(() => String(route.params.resourceUuid ?? ''))
const projectUuidParam = computed(() => {
  const raw = route.query.projectUuid
  const value = Array.isArray(raw) ? raw[0] : raw
  return typeof value === 'string' && value ? value : null
})
const panelParam = computed(() => String(route.params.panel ?? 'editor'))
const activePanel = computed(() => {
  return SUPPORTED_PANELS.includes(panelParam.value as (typeof SUPPORTED_PANELS)[number]) ? panelParam.value : 'editor'
})

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

const resourceInWorkspace = computed(() => {
  return workspaceResourcesQuery.data.value?.find((resource) => resource.uuid === resourceUuid.value) ?? null
})

const workspaceInstanceUuid = computed(() => {
  return resourceQuery.data.value?.workspace_instance_uuid ?? resourceInWorkspace.value?.workspace_instance_uuid ?? null
})

const latestPublishedInstanceUuid = computed(() => {
  return resourceQuery.data.value?.latest_published_instance_uuid ?? null
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
  return {
    resourceName: data.name,
    workspaceInstanceUuid: workspaceInstanceUuid.value,
    latestPublishedInstanceUuid: latestPublishedInstanceUuid.value,
    workspaceInstance: data.workspace_instance,
  }
})

const refreshAll = async (): Promise<void> => {
  await Promise.all([
    store.loadPlatformContext(),
    workspaceResourcesQuery.refetch(),
    resourceQuery.refetch(),
  ])
}

provideResourceWorkbenchContext({
  workspaceUuid: workspaceUuidParam,
  projectUuid: projectUuidParam,
  resourceUuid,
  panel: activePanel,
  resource: computed(() => resourceQuery.data.value ?? null),
  workspaceInstanceUuid,
  latestPublishedInstanceUuid,
  workspaceInstance: computed(() => resourceQuery.data.value?.workspace_instance ?? null),
  refresh: refreshAll,
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

const loading = computed(() => {
  return store.loading || workspaceResourcesQuery.isLoading.value || resourceQuery.isLoading.value || canonicalResolving.value
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
  <div class="min-h-screen bg-background p-4 md:p-6">
    <div class="mx-auto max-w-[1600px] space-y-4">
      <template v-if="loading">
        <Skeleton class="h-24 w-full" />
        <Skeleton class="h-52 w-full" />
      </template>

      <Card v-else-if="shouldShowMissing">
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

      <component
        :is="workbenchComponent"
        v-else-if="workbenchComponent && workbenchProps"
        v-bind="workbenchProps"
      />

      <Card v-else>
        <CardHeader>
          <CardTitle>Unsupported Resource Type</CardTitle>
        </CardHeader>
        <CardContent class="text-sm text-muted-foreground">
          The resource type <code>{{ resourceQuery.data.value?.resource_type }}</code> is not supported by current workbench packages.
        </CardContent>
      </Card>
    </div>
  </div>
</template>
