<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMutation, useQuery } from '@tanstack/vue-query'
import { agentApi } from '@app/services/api/agent-client'
import { chatApi } from '@app/services/api/chat-client'
import { emitBusinessError } from '@app/services/http/error-gateway'
import { platformQueryKeys } from '@app/services/api/query-keys'
import { AgentWorkbenchScaffold } from '@repo/workbench-agent'
import { Button } from '@repo/ui-shadcn/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@repo/ui-shadcn/components/ui/card'
import { Input } from '@repo/ui-shadcn/components/ui/input'

const props = defineProps<{
  resourceName: string
  workspaceInstanceUuid?: string | null
  latestPublishedInstanceUuid?: string | null
}>()

const inputQuery = ref('Hello, please introduce yourself briefly.')
const executionResult = ref('')

const runMutation = useMutation({
  mutationFn: async () => {
    if (!props.workspaceInstanceUuid) {
      throw new Error('No workspace instance uuid found.')
    }

    return agentApi.execute(props.workspaceInstanceUuid, {
      inputs: {
        input_query: inputQuery.value,
      },
    })
  },
  onSuccess: (result) => {
    executionResult.value = JSON.stringify(result, null, 2)
  },
  onError: (error) => {
    emitBusinessError(error)
  },
})

const sessionsQuery = useQuery({
  queryKey: computed(() => platformQueryKeys.chatSessions(props.workspaceInstanceUuid ?? 'none', 1, 5)),
  enabled: computed(() => Boolean(props.workspaceInstanceUuid)),
  queryFn: async () => chatApi.listSessions(props.workspaceInstanceUuid as string, 1, 5),
})

const runAgent = async (): Promise<void> => {
  await runMutation.mutateAsync()
}
</script>

<template>
  <AgentWorkbenchScaffold
    :resource-name="resourceName"
    :workspace-instance-uuid="workspaceInstanceUuid"
    :latest-published-instance-uuid="latestPublishedInstanceUuid"
  >
    <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Card>
        <CardHeader>
          <CardTitle class="text-base">Quick Run</CardTitle>
        </CardHeader>
        <CardContent class="space-y-3">
          <Input v-model="inputQuery" placeholder="Ask this agent..." />
          <Button :disabled="runMutation.isPending.value" @click="runAgent">
            {{ runMutation.isPending.value ? 'Running...' : 'Execute Agent' }}
          </Button>
          <pre class="max-h-80 overflow-auto rounded-md border bg-muted/30 p-3 text-xs">{{ executionResult || 'No execution result yet.' }}</pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="text-base">Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <p v-if="sessionsQuery.isLoading.value" class="text-sm text-muted-foreground">Loading sessions...</p>
          <ul v-else-if="sessionsQuery.data.value?.length" class="space-y-2 text-sm">
            <li v-for="session in sessionsQuery.data.value" :key="session.uuid" class="rounded-md border p-2">
              <p class="font-medium">{{ session.title || session.uuid }}</p>
              <p class="text-xs text-muted-foreground">Messages: {{ session.message_count }}</p>
            </li>
          </ul>
          <p v-else class="text-sm text-muted-foreground">No sessions yet.</p>
        </CardContent>
      </Card>
    </div>
  </AgentWorkbenchScaffold>
</template>
