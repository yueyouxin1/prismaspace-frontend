<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { onBeforeRouteLeave, useRoute } from 'vue-router'
import { trackEvent } from '@app/services/analytics/events'
import { platformQueryKeys } from '@app/services/api/query-keys'
import { resourceApi } from '@app/services/api/resource-client'
import { toolApi } from '@app/services/api/tool-client'
import { emitBusinessError } from '@app/services/http/error-gateway'
import {
  ToolIdeWorkbench,
  toToolInstanceDraft,
  type ToolExecutePayload,
  type ToolIdeSavePayload,
  type ToolRunFeedback,
} from '@repo/workbench-tool'
import { Button } from '@repo/ui-shadcn/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@repo/ui-shadcn/components/ui/card'
import { Skeleton } from '@repo/ui-shadcn/components/ui/skeleton'

const props = defineProps<{
  resourceName: string
  workspaceInstanceUuid?: string | null
  latestPublishedInstanceUuid?: string | null
}>()

const route = useRoute()
const queryClient = useQueryClient()

const workspaceUuid = computed(() => String(route.params.workspaceUuid ?? ''))
const resourceUuid = computed(() => String(route.params.resourceUuid ?? ''))
const instanceUuid = computed(() => props.workspaceInstanceUuid ?? null)

const runFeedback = ref<ToolRunFeedback | null>(null)
const hasUnsavedChanges = ref(false)

const resourceDetailQuery = useQuery({
  queryKey: computed(() => platformQueryKeys.toolResourceDetail(workspaceUuid.value, resourceUuid.value)),
  enabled: computed(() => Boolean(workspaceUuid.value && resourceUuid.value)),
  queryFn: async () => resourceApi.getResource(resourceUuid.value),
})

const toolInstanceQuery = useQuery({
  queryKey: computed(() => platformQueryKeys.toolInstance(workspaceUuid.value, instanceUuid.value)),
  enabled: computed(() => Boolean(workspaceUuid.value && instanceUuid.value)),
  queryFn: async () => toolApi.getToolInstance(instanceUuid.value as string),
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

const saveMutation = useMutation({
  mutationFn: async (payload: ToolIdeSavePayload) => {
    if (!resourceUuid.value || !instanceUuid.value) {
      throw new Error('Missing resource or workspace instance uuid.')
    }

    const actions: Promise<unknown>[] = []
    if (payload.hasResourceChanges) {
      actions.push(
        resourceApi.updateResource(resourceUuid.value, {
          name: payload.resource.name,
          description: payload.resource.description || undefined,
        }),
      )
    }
    if (payload.hasInstanceChanges) {
      actions.push(
        toolApi.updateToolInstance(instanceUuid.value, {
          url: payload.instance.url || null,
          method: payload.instance.method,
          inputs_schema: payload.instance.inputsSchema as never,
          outputs_schema: payload.instance.outputsSchema as never,
        }),
      )
    }

    if (!actions.length) {
      return payload
    }

    await Promise.all(actions)
    return payload
  },
  onSuccess: async (payload) => {
    hasUnsavedChanges.value = false
    trackEvent('tool_saved', {
      workspace: workspaceUuid.value,
      resource: resourceUuid.value,
      resource_changed: payload.hasResourceChanges,
      instance_changed: payload.hasInstanceChanges,
    })

    const invalidations: Promise<unknown>[] = [
      queryClient.invalidateQueries({
        queryKey: platformQueryKeys.toolResourceDetail(workspaceUuid.value, resourceUuid.value),
      }),
      queryClient.invalidateQueries({
        queryKey: platformQueryKeys.resourceDetail(resourceUuid.value),
      }),
      queryClient.invalidateQueries({
        queryKey: platformQueryKeys.workspaceResources(workspaceUuid.value),
      }),
      queryClient.invalidateQueries({
        queryKey: platformQueryKeys.resourceInstances(resourceUuid.value),
      }),
    ]
    if (instanceUuid.value) {
      invalidations.push(
        queryClient.invalidateQueries({
          queryKey: platformQueryKeys.toolInstance(workspaceUuid.value, instanceUuid.value),
        }),
      )
    }
    await Promise.all(invalidations)
  },
  onError: (error) => {
    emitBusinessError(error)
  },
})

const runMutation = useMutation({
  mutationFn: async (payload: ToolExecutePayload) => {
    if (!instanceUuid.value) {
      throw new Error('Missing workspace instance uuid.')
    }
    const started = performance.now()
    const response = await toolApi.executeToolInstance(instanceUuid.value, {
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
      at: new Date().toISOString(),
    }
    trackEvent('tool_executed', {
      workspace: workspaceUuid.value,
      resource: resourceUuid.value,
      instance: instanceUuid.value ?? '',
      success: response.success !== false,
    })
  },
  onError: (error) => {
    runFeedback.value = {
      success: false,
      durationMs: 0,
      errorMessage: error instanceof Error ? error.message : 'Tool execution failed.',
      at: new Date().toISOString(),
    }
    emitBusinessError(error)
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

onBeforeRouteLeave((_to, _from, next) => {
  if (!hasUnsavedChanges.value) {
    next()
    return
  }
  const confirmed = window.confirm('工具配置尚未保存，确认离开吗？')
  if (!confirmed) {
    next(false)
    return
  }
  next()
})

const refreshToolData = async (): Promise<void> => {
  await Promise.all([resourceDetailQuery.refetch(), toolInstanceQuery.refetch()])
}

const handleSave = async (payload: ToolIdeSavePayload): Promise<void> => {
  await saveMutation.mutateAsync(payload)
}

const handleExecute = async (payload: ToolExecutePayload): Promise<void> => {
  await runMutation.mutateAsync(payload)
}
</script>

<template>
  <div class="space-y-4">
    <Card v-if="!instanceUuid">
      <CardHeader>
        <CardTitle>Tool 实例不可用</CardTitle>
      </CardHeader>
      <CardContent class="space-y-3 text-sm text-muted-foreground">
        <p>当前资源缺少 `workspace_instance_uuid`，无法进入 Tool IDE。</p>
        <Button variant="outline" @click="refreshToolData">刷新并重试</Button>
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
          <CardTitle>Tool IDE 加载失败</CardTitle>
        </CardHeader>
        <CardContent class="space-y-3 text-sm text-muted-foreground">
          <p>无法读取 Tool 资源详情或实例配置，请刷新后重试。</p>
          <Button variant="outline" @click="refreshToolData">重新加载</Button>
        </CardContent>
      </Card>

      <ToolIdeWorkbench
        v-else
        :seed="ideSeed"
        :loading="loading"
        :saving="saveMutation.isPending.value"
        :running="runMutation.isPending.value"
        :workspace-instance-uuid="workspaceInstanceUuid"
        :latest-published-instance-uuid="latestPublishedInstanceUuid"
        :run-feedback="runFeedback"
        @dirty-change="hasUnsavedChanges = $event"
        @save="handleSave"
        @execute="handleExecute"
      />
    </template>
  </div>
</template>
