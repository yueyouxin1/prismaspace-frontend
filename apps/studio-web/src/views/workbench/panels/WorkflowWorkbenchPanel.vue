<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMutation, useQuery } from '@tanstack/vue-query'
import { workflowApi } from '@app/services/api/workflow-client'
import { emitBusinessError } from '@app/services/http/error-gateway'
import { platformQueryKeys } from '@app/services/api/query-keys'
import { WorkflowWorkbenchScaffold } from '@repo/workbench-workflow'
import { Button } from '@repo/ui-shadcn/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@repo/ui-shadcn/components/ui/card'

const props = defineProps<{
  resourceName: string
  workspaceInstanceUuid?: string | null
  latestPublishedInstanceUuid?: string | null
}>()

const executionResult = ref('')
const validationResult = ref('')

const nodeDefsQuery = useQuery({
  queryKey: platformQueryKeys.workflowNodeDefs,
  queryFn: async () => workflowApi.listNodeDefinitions(),
})

const validateMutation = useMutation({
  mutationFn: async () => {
    if (!props.workspaceInstanceUuid) {
      throw new Error('No workspace instance uuid found.')
    }
    return workflowApi.validate(props.workspaceInstanceUuid)
  },
  onSuccess: (result) => {
    validationResult.value = JSON.stringify(result, null, 2)
  },
  onError: (error) => emitBusinessError(error),
})

const executeMutation = useMutation({
  mutationFn: async () => {
    if (!props.workspaceInstanceUuid) {
      throw new Error('No workspace instance uuid found.')
    }
    return workflowApi.execute(props.workspaceInstanceUuid, {
      inputs: {},
    })
  },
  onSuccess: (result) => {
    executionResult.value = JSON.stringify(result, null, 2)
  },
  onError: (error) => emitBusinessError(error),
})

const nodeCount = computed(() => nodeDefsQuery.data.value?.length ?? 0)
</script>

<template>
  <WorkflowWorkbenchScaffold
    :resource-name="resourceName"
    :workspace-instance-uuid="workspaceInstanceUuid"
    :latest-published-instance-uuid="latestPublishedInstanceUuid"
  >
    <div class="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle class="text-base">Validation</CardTitle>
        </CardHeader>
        <CardContent class="space-y-3">
          <p class="text-sm text-muted-foreground">Available node definitions: {{ nodeCount }}</p>
          <Button :disabled="validateMutation.isPending.value" @click="validateMutation.mutate()">
            {{ validateMutation.isPending.value ? 'Validating...' : 'Validate Workflow' }}
          </Button>
          <pre class="max-h-64 overflow-auto rounded-md border bg-muted/30 p-3 text-xs">{{ validationResult || 'No validation result yet.' }}</pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="text-base">Execution</CardTitle>
        </CardHeader>
        <CardContent class="space-y-3">
          <Button :disabled="executeMutation.isPending.value" @click="executeMutation.mutate()">
            {{ executeMutation.isPending.value ? 'Executing...' : 'Run Workflow' }}
          </Button>
          <pre class="max-h-64 overflow-auto rounded-md border bg-muted/30 p-3 text-xs">{{ executionResult || 'No execution result yet.' }}</pre>
        </CardContent>
      </Card>
    </div>
  </WorkflowWorkbenchScaffold>
</template>
