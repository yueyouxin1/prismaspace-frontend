<script setup lang="ts">
import { computed, watch } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { Card, CardContent, CardHeader, CardTitle } from '@prismaspace/ui-shadcn/components/ui/card'
import { Skeleton } from '@prismaspace/ui-shadcn/components/ui/skeleton'
import { prismaspaceQueryKeys } from '@prismaspace/resources-core'
import { defaultResourceWorkbenchRegistry } from '../registry'
import type { ResourceWorkbenchCommonProps, ResourceWorkbenchRegistry } from '../types'

const props = withDefaults(defineProps<ResourceWorkbenchCommonProps & {
  registry?: ResourceWorkbenchRegistry
}>(), {
  projectUuid: null,
  workspaceInstanceUuid: null,
  latestPublishedInstanceUuid: null,
  panel: 'editor',
  registry: () => defaultResourceWorkbenchRegistry,
})

const workspaceResourcesQuery = useQuery({
  queryKey: computed(() => [...prismaspaceQueryKeys.workspaceResources(props.workspaceUuid), 'resource-host']),
  enabled: computed(() => Boolean(props.workspaceUuid)),
  queryFn: async () => props.client.resource.listWorkspaceResources(props.workspaceUuid),
})

const resourceQuery = useQuery({
  queryKey: computed(() => prismaspaceQueryKeys.resourceDetail(props.resourceUuid)),
  enabled: computed(() => Boolean(props.resourceUuid)),
  queryFn: async () => props.client.resource.getResource(props.resourceUuid),
})

const resourceInWorkspace = computed(() => {
  return workspaceResourcesQuery.data.value?.find((resource) => resource.uuid === props.resourceUuid) ?? null
})

const resolvedWorkspaceInstanceUuid = computed(() => {
  return props.workspaceInstanceUuid
    ?? resourceQuery.data.value?.workspace_instance_uuid
    ?? resourceInWorkspace.value?.workspace_instance_uuid
    ?? null
})

const resolvedLatestPublishedInstanceUuid = computed(() => {
  return props.latestPublishedInstanceUuid
    ?? resourceQuery.data.value?.latest_published_instance_uuid
    ?? null
})

const workbenchComponent = computed(() => {
  const resourceType = resourceQuery.data.value?.resource_type
  if (!resourceType) {
    return null
  }
  return props.registry[resourceType] ?? null
})

const componentProps = computed(() => {
  if (!resourceQuery.data.value) {
    return null
  }
  return {
    client: props.client,
    workspaceUuid: props.workspaceUuid,
    resourceUuid: props.resourceUuid,
    projectUuid: props.projectUuid,
    panel: props.panel,
    workspaceInstanceUuid: resolvedWorkspaceInstanceUuid.value,
    latestPublishedInstanceUuid: resolvedLatestPublishedInstanceUuid.value,
    onBack: props.onBack,
    onError: props.onError,
  }
})

const loading = computed(() => workspaceResourcesQuery.isLoading.value || resourceQuery.isLoading.value)
const missing = computed(() => !loading.value && (!resourceInWorkspace.value || resourceQuery.isError.value))

watch(
  () => workspaceResourcesQuery.error.value,
  (error) => {
    if (error) {
      props.onError?.(error)
    }
  },
)

watch(
  () => resourceQuery.error.value,
  (error) => {
    if (error) {
      props.onError?.(error)
    }
  },
)
</script>

<template>
  <div class="flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden bg-background">
    <div class="flex h-full min-h-0 w-full flex-col overflow-hidden">
      <template v-if="loading">
        <div class="space-y-4 p-4 md:p-6">
          <Skeleton class="h-24 w-full" />
          <Skeleton class="h-52 w-full" />
        </div>
      </template>

      <div v-else-if="missing" class="p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Resource Not Available</CardTitle>
          </CardHeader>
          <CardContent class="text-sm text-muted-foreground">
            The requested resource is not available in the current workspace.
          </CardContent>
        </Card>
      </div>

      <component
        :is="workbenchComponent"
        v-else-if="workbenchComponent && componentProps"
        class="min-h-0 flex-1 overflow-hidden"
        v-bind="componentProps"
      />

      <div v-else class="p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Unsupported Resource Type</CardTitle>
          </CardHeader>
          <CardContent class="text-sm text-muted-foreground">
            No workbench is registered for this resource type.
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>
