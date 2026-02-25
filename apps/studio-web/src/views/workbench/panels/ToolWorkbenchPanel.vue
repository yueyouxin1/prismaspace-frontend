<script setup lang="ts">
import { ref } from 'vue'
import { useMutation } from '@tanstack/vue-query'
import { executionApi } from '@app/services/api/execution-client'
import { emitBusinessError } from '@app/services/http/error-gateway'
import { ToolWorkbenchScaffold } from '@repo/workbench-tool'
import { Button } from '@repo/ui-shadcn/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@repo/ui-shadcn/components/ui/card'
import { Textarea } from '@repo/ui-shadcn/components/ui/textarea'

const props = defineProps<{
  resourceName: string
  workspaceInstanceUuid?: string | null
  latestPublishedInstanceUuid?: string | null
}>()

const payloadText = ref('{\n  "inputs": {}\n}')
const resultText = ref('')

const runMutation = useMutation({
  mutationFn: async () => {
    if (!props.workspaceInstanceUuid) {
      throw new Error('No workspace instance uuid found.')
    }

    const payload = JSON.parse(payloadText.value) as Record<string, unknown>
    return executionApi.executeInstance(props.workspaceInstanceUuid, payload)
  },
  onSuccess: (result) => {
    resultText.value = JSON.stringify(result, null, 2)
  },
  onError: (error) => {
    emitBusinessError(error)
  },
})
</script>

<template>
  <ToolWorkbenchScaffold
    :resource-name="resourceName"
    :workspace-instance-uuid="workspaceInstanceUuid"
    :latest-published-instance-uuid="latestPublishedInstanceUuid"
  >
    <Card>
      <CardHeader>
        <CardTitle class="text-base">Execute Tool</CardTitle>
      </CardHeader>
      <CardContent class="space-y-3">
        <Textarea v-model="payloadText" class="min-h-32 font-mono text-xs" />
        <Button :disabled="runMutation.isPending.value" @click="runMutation.mutate()">
          {{ runMutation.isPending.value ? 'Executing...' : 'Run via /execute' }}
        </Button>
        <pre class="max-h-80 overflow-auto rounded-md border bg-muted/30 p-3 text-xs">{{ resultText || 'No execution result yet.' }}</pre>
      </CardContent>
    </Card>
  </ToolWorkbenchScaffold>
</template>
