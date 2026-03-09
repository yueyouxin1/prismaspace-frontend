<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMutation, useQuery } from '@tanstack/vue-query'
import { useI18n } from 'vue-i18n'
import type { PrismaspaceClient } from '@prismaspace/sdk'
import { prismaspaceQueryKeys } from '@prismaspace/resources-core'
import WorkflowWorkbenchScaffold from './WorkflowWorkbenchScaffold.vue'
import { Button } from '@prismaspace/ui-shadcn/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@prismaspace/ui-shadcn/components/ui/card'

const props = defineProps<{
  client: PrismaspaceClient
  workspaceUuid: string
  resourceUuid: string
  workspaceInstanceUuid?: string | null
  latestPublishedInstanceUuid?: string | null
  onBack?: () => void
  onError?: (error: unknown) => void
}>()
const { t } = useI18n()

const executionResult = ref('')
const validationResult = ref('')

const resourceDetailQuery = useQuery({
  queryKey: computed(() => prismaspaceQueryKeys.resourceDetail(props.resourceUuid)),
  enabled: computed(() => Boolean(props.resourceUuid)),
  queryFn: async () => props.client.resource.getResource(props.resourceUuid),
})

const nodeDefsQuery = useQuery({
  queryKey: prismaspaceQueryKeys.workflowNodeDefs,
  queryFn: async () => props.client.workflow.listNodeDefinitions(),
})

const validateMutation = useMutation({
  mutationFn: async () => {
    if (!props.workspaceInstanceUuid) {
      throw new Error(t('platform.workbench.errors.noWorkspaceInstance'))
    }
    return props.client.workflow.validate(props.workspaceInstanceUuid)
  },
  onSuccess: (result) => {
    validationResult.value = JSON.stringify(result, null, 2)
  },
  onError: (error) => props.onError?.(error),
})

const executeMutation = useMutation({
  mutationFn: async () => {
    if (!props.workspaceInstanceUuid) {
      throw new Error(t('platform.workbench.errors.noWorkspaceInstance'))
    }
    return props.client.workflow.execute(props.workspaceInstanceUuid, {
      inputs: {},
    })
  },
  onSuccess: (result) => {
    executionResult.value = JSON.stringify(result, null, 2)
  },
  onError: (error) => props.onError?.(error),
})

const buildPublishVersionTag = (): string => {
  const now = new Date()
  const pad = (value: number, length = 2): string => String(value).padStart(length, '0')
  return `v${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}${pad(now.getMilliseconds(), 3)}`
}

const publishMutation = useMutation({
  mutationFn: async () => {
    if (!props.workspaceInstanceUuid) {
      throw new Error(t('platform.workbench.errors.noWorkspaceInstance'))
    }
    return props.client.resource.publishInstance(props.workspaceInstanceUuid, {
      version_tag: buildPublishVersionTag(),
    })
  },
  onError: (error) => props.onError?.(error),
})

const nodeCount = computed(() => nodeDefsQuery.data.value?.length ?? 0)

const handleHeaderRun = (): void => {
  if (executeMutation.isPending.value) {
    return
  }
  executeMutation.mutate()
}

const handleHeaderPublish = (): void => {
  if (publishMutation.isPending.value) {
    return
  }
  publishMutation.mutate()
}
</script>

<template>
  <WorkflowWorkbenchScaffold
    :resource-name="resourceDetailQuery.data.value?.name ?? ''"
    :resource-description="resourceDetailQuery.data.value?.description ?? ''"
    :updated-at="resourceDetailQuery.data.value?.updated_at ?? null"
    :workspace-instance-uuid="workspaceInstanceUuid"
    :latest-published-instance-uuid="latestPublishedInstanceUuid"
    :save-disabled="true"
    :running="executeMutation.isPending.value"
    :publishing="publishMutation.isPending.value"
    @back="props.onBack?.()"
    @run="handleHeaderRun"
    @publish="handleHeaderPublish"
  >
    <div class="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle class="text-base">{{ t('platform.workbench.workflow.validation') }}</CardTitle>
        </CardHeader>
        <CardContent class="space-y-3">
          <p class="text-sm text-muted-foreground">{{ t('platform.workbench.workflow.nodeDefs', { count: nodeCount }) }}</p>
          <Button :disabled="validateMutation.isPending.value" @click="validateMutation.mutate()">
            {{ validateMutation.isPending.value ? t('platform.workbench.workflow.validating') : t('platform.workbench.workflow.validate') }}
          </Button>
          <pre class="max-h-64 overflow-auto rounded-md border bg-muted/30 p-3 text-xs">{{ validationResult || t('platform.workbench.workflow.noValidationResult') }}</pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="text-base">{{ t('platform.workbench.workflow.execution') }}</CardTitle>
        </CardHeader>
        <CardContent class="space-y-3">
          <Button :disabled="executeMutation.isPending.value" @click="executeMutation.mutate()">
            {{ executeMutation.isPending.value ? t('platform.workbench.workflow.executing') : t('platform.workbench.workflow.run') }}
          </Button>
          <pre class="max-h-64 overflow-auto rounded-md border bg-muted/30 p-3 text-xs">{{ executionResult || t('platform.workbench.workflow.noExecutionResult') }}</pre>
        </CardContent>
      </Card>
    </div>
  </WorkflowWorkbenchScaffold>
</template>
