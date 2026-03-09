<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { useI18n } from 'vue-i18n'
import type { PrismaspaceClient } from '@prismaspace/sdk'
import { prismaspaceQueryKeys } from '@prismaspace/resources-core'
import {
  toToolInstanceDraft,
} from './adapters/tool-schema-adapter'
import ToolIdeWorkbench from './components/ToolIdeWorkbench.vue'
import type {
  ToolExecuteRequest,
  ToolIdeSaveRequest,
  ToolPublishRequest,
  ToolRunFeedback,
} from './types/tool-ide'
import { Button } from '@prismaspace/ui-shadcn/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@prismaspace/ui-shadcn/components/ui/card'
import { Skeleton } from '@prismaspace/ui-shadcn/components/ui/skeleton'

const props = defineProps<{
  client: PrismaspaceClient
  workspaceUuid: string
  resourceUuid: string
  workspaceInstanceUuid?: string | null
  latestPublishedInstanceUuid?: string | null
  onBack?: () => void
  onError?: (error: unknown) => void
}>()

const queryClient = useQueryClient()
const { t } = useI18n()

const workspaceUuid = computed(() => props.workspaceUuid)
const resourceUuid = computed(() => props.resourceUuid)
const instanceUuid = computed(() => props.workspaceInstanceUuid ?? null)

const runFeedback = ref<ToolRunFeedback | null>(null)
const hasUnsavedChanges = ref(false)
const lastSavedAt = ref<string | null>(null)

const resourceDetailQuery = useQuery({
  queryKey: computed(() => prismaspaceQueryKeys.toolResourceDetail(workspaceUuid.value, resourceUuid.value)),
  enabled: computed(() => Boolean(workspaceUuid.value && resourceUuid.value)),
  queryFn: async () => props.client.resource.getResource(resourceUuid.value),
})

const toolInstanceQuery = useQuery({
  queryKey: computed(() => prismaspaceQueryKeys.toolInstance(workspaceUuid.value, instanceUuid.value)),
  enabled: computed(() => Boolean(workspaceUuid.value && instanceUuid.value)),
  queryFn: async () => props.client.tool.getToolInstance(instanceUuid.value as string),
})

const ideSeed = computed(() => {
  const resource = resourceDetailQuery.data.value
  const instance = toolInstanceQuery.data.value
  if (!resource || !instance) {
    return null
  }
  return {
    resource: {
      name: resource.name,
      description: resource.description ?? '',
    },
    instance: toToolInstanceDraft(instance),
  }
})

const invalidateWorkbenchQueries = async (): Promise<void> => {
  const invalidations: Promise<unknown>[] = [
    queryClient.invalidateQueries({
      queryKey: prismaspaceQueryKeys.toolResourceDetail(workspaceUuid.value, resourceUuid.value),
    }),
    queryClient.invalidateQueries({
      queryKey: prismaspaceQueryKeys.resourceDetail(resourceUuid.value),
    }),
    queryClient.invalidateQueries({
      queryKey: prismaspaceQueryKeys.workspaceResources(workspaceUuid.value),
    }),
    queryClient.invalidateQueries({
      queryKey: prismaspaceQueryKeys.resourceInstances(resourceUuid.value),
    }),
  ]
  if (instanceUuid.value) {
    invalidations.push(
      queryClient.invalidateQueries({
        queryKey: prismaspaceQueryKeys.toolInstance(workspaceUuid.value, instanceUuid.value),
      }),
    )
  }
  await Promise.all(invalidations)
}

const saveMutation = useMutation({
  mutationFn: async (request: ToolIdeSaveRequest) => {
    const payload = request.payload
    if (!resourceUuid.value || !instanceUuid.value) {
      throw new Error(t('platform.workbench.errors.missingResourceOrWorkspaceInstance'))
    }

    const actions: Promise<unknown>[] = []
    if (payload.hasResourceChanges) {
      actions.push(
        props.client.resource.updateResource(resourceUuid.value, {
          name: payload.resource.name,
          description: payload.resource.description || undefined,
        }),
      )
    }
    if (payload.hasInstanceChanges) {
      actions.push(
        props.client.tool.updateToolInstance(instanceUuid.value, {
          url: payload.instance.url || null,
          method: payload.instance.method,
          inputs_schema: payload.instance.inputsSchema as never,
          outputs_schema: payload.instance.outputsSchema as never,
        }),
      )
    }

    if (!actions.length) {
      return request
    }

    await Promise.all(actions)
    return request
  },
  onSuccess: async (request) => {
    hasUnsavedChanges.value = false
    lastSavedAt.value = new Date().toISOString()

    await invalidateWorkbenchQueries()
  },
  onError: (error) => {
    props.onError?.(error)
  },
})

const runMutation = useMutation({
  mutationFn: async (payload: ToolExecuteRequest['run']) => {
    if (!instanceUuid.value) {
      throw new Error(t('platform.workbench.errors.noWorkspaceInstance'))
    }
    const started = performance.now()
    const response = await props.client.tool.executeToolInstance(instanceUuid.value, {
      inputs: payload.inputs,
      meta: payload.returnRawResponse
        ? {
            return_raw_response: true,
          }
        : undefined,
    })
    const durationMs = Math.max(1, Math.round(performance.now() - started))
    return { response, durationMs }
  },
  onSuccess: ({ response, durationMs }) => {
    runFeedback.value = {
      success: response.success !== false,
      durationMs,
      payload: response.data,
      errorMessage: response.error_message ?? undefined,
      at: new Date().toISOString(),
    }
  },
  onError: (error) => {
    runFeedback.value = {
      success: false,
      durationMs: 0,
      errorMessage: error instanceof Error ? error.message : t('platform.workbench.tool.executeFailed'),
      at: new Date().toISOString(),
    }
    props.onError?.(error)
  },
})

const buildPublishVersionTag = (): string => {
  const now = new Date()
  const pad = (value: number, length = 2): string => String(value).padStart(length, '0')
  return `v${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}${pad(now.getMilliseconds(), 3)}`
}

const publishMutation = useMutation({
  mutationFn: async () => {
    if (!instanceUuid.value) {
      throw new Error(t('platform.workbench.errors.noWorkspaceInstance'))
    }
    return props.client.resource.publishInstance(instanceUuid.value, {
      version_tag: buildPublishVersionTag(),
    })
  },
  onSuccess: async () => {
    await invalidateWorkbenchQueries()
  },
  onError: (error) => {
    props.onError?.(error)
  },
})

const loading = computed(() => {
  return resourceDetailQuery.isLoading.value || toolInstanceQuery.isLoading.value
})

const onBeforeUnload = (event: BeforeUnloadEvent): void => {
  if (!hasUnsavedChanges.value) {
    return
  }
  event.preventDefault()
  event.returnValue = ''
}

watch(
  hasUnsavedChanges,
  (dirty) => {
    if (dirty) {
      window.addEventListener('beforeunload', onBeforeUnload)
      return
    }
    window.removeEventListener('beforeunload', onBeforeUnload)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', onBeforeUnload)
})

const refreshToolData = async (): Promise<void> => {
  await Promise.all([resourceDetailQuery.refetch(), toolInstanceQuery.refetch()])
}

const handleBack = async (): Promise<void> => {
  if (hasUnsavedChanges.value) {
    const confirmed = window.confirm(t('platform.workbench.tool.confirmBack'))
    if (!confirmed) {
      return
    }
  }
  props.onBack?.()
}

const handleSave = async (request: ToolIdeSaveRequest): Promise<void> => {
  await saveMutation.mutateAsync(request)
}

const handleExecute = async (request: ToolExecuteRequest): Promise<void> => {
  try {
    await saveMutation.mutateAsync({
      payload: request.save,
      trigger: 'execute',
    })
  } catch {
    return
  }
  await runMutation.mutateAsync(request.run)
}

const handlePublish = async (request: ToolPublishRequest): Promise<void> => {
  try {
    await saveMutation.mutateAsync({
      payload: request.save,
      trigger: 'publish',
    })
  } catch {
    return
  }
  await publishMutation.mutateAsync()
}
</script>

<template>
  <div class="space-y-4">
      <Card v-if="!instanceUuid">
      <CardHeader>
        <CardTitle>{{ t('platform.workbench.tool.instanceUnavailable') }}</CardTitle>
      </CardHeader>
      <CardContent class="space-y-3 text-sm text-muted-foreground">
        <p>{{ t('platform.workbench.tool.instanceMissingHint') }}</p>
        <Button variant="outline" @click="refreshToolData">{{ t('common.refresh') }}</Button>
      </CardContent>
    </Card>

    <template v-else>
      <div v-if="loading" class="space-y-3">
        <Skeleton class="h-28 w-full" />
        <Skeleton class="h-48 w-full" />
        <Skeleton class="h-48 w-full" />
      </div>

      <Card v-else-if="resourceDetailQuery.isError.value || toolInstanceQuery.isError.value">
        <CardHeader>
          <CardTitle>{{ t('platform.workbench.tool.loadFailed') }}</CardTitle>
        </CardHeader>
        <CardContent class="space-y-3 text-sm text-muted-foreground">
          <p>{{ t('platform.workbench.tool.loadFailedHint') }}</p>
          <Button variant="outline" @click="refreshToolData">{{ t('common.retry') }}</Button>
        </CardContent>
      </Card>

      <ToolIdeWorkbench
        v-else
        :seed="ideSeed"
        :resource-description="resourceDetailQuery.data.value?.description ?? ''"
        :loading="loading"
        :saving="saveMutation.isPending.value"
        :running="runMutation.isPending.value"
        :publishing="publishMutation.isPending.value"
        :workspace-instance-uuid="workspaceInstanceUuid"
        :latest-published-instance-uuid="latestPublishedInstanceUuid"
        :updated-at="lastSavedAt ?? resourceDetailQuery.data.value?.updated_at ?? null"
        :saved-at="lastSavedAt"
        :run-feedback="runFeedback"
        @back="handleBack"
        @dirty-change="hasUnsavedChanges = $event"
        @save="handleSave"
        @execute="handleExecute"
        @publish="handlePublish"
      />
    </template>
  </div>
</template>
