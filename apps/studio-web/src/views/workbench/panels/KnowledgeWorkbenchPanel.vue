<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMutation, useQuery } from '@tanstack/vue-query'
import { knowledgeApi } from '@app/services/api/knowledge-client'
import { emitBusinessError } from '@app/services/http/error-gateway'
import { platformQueryKeys } from '@app/services/api/query-keys'
import { KnowledgeWorkbenchScaffold } from '@repo/workbench-knowledge'
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

const sourceUri = ref('')
const fileName = ref('')

const documentsQuery = useQuery({
  queryKey: computed(() => platformQueryKeys.knowledgeDocuments(props.workspaceInstanceUuid ?? 'none', 1, 20)),
  enabled: computed(() => Boolean(props.workspaceInstanceUuid)),
  queryFn: async () => knowledgeApi.listDocuments(props.workspaceInstanceUuid as string, 1, 20),
})

const addDocumentMutation = useMutation({
  mutationFn: async () => {
    if (!props.workspaceInstanceUuid) {
      throw new Error('No workspace instance uuid found.')
    }
    return knowledgeApi.addDocument(props.workspaceInstanceUuid, {
      source_uri: sourceUri.value,
      file_name: fileName.value || undefined,
    })
  },
  onSuccess: async () => {
    sourceUri.value = ''
    fileName.value = ''
    await documentsQuery.refetch()
  },
  onError: (error) => emitBusinessError(error),
})

const removeDocumentMutation = useMutation({
  mutationFn: async (documentUuid: string) => {
    if (!props.workspaceInstanceUuid) {
      throw new Error('No workspace instance uuid found.')
    }
    await knowledgeApi.removeDocument(props.workspaceInstanceUuid, documentUuid)
  },
  onSuccess: async () => {
    await documentsQuery.refetch()
  },
  onError: (error) => emitBusinessError(error),
})
</script>

<template>
  <KnowledgeWorkbenchScaffold
    :resource-name="resourceName"
    :workspace-instance-uuid="workspaceInstanceUuid"
    :latest-published-instance-uuid="latestPublishedInstanceUuid"
  >
    <div class="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle class="text-base">Add Document</CardTitle>
        </CardHeader>
        <CardContent class="space-y-3">
          <Input v-model="sourceUri" placeholder="Document source URI" />
          <Input v-model="fileName" placeholder="File name (optional)" />
          <Button :disabled="addDocumentMutation.isPending.value || !sourceUri" @click="addDocumentMutation.mutate()">
            {{ addDocumentMutation.isPending.value ? 'Submitting...' : 'Submit for Processing' }}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="text-base">Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <p v-if="documentsQuery.isLoading.value" class="text-sm text-muted-foreground">Loading documents...</p>
          <ul v-else-if="documentsQuery.data.value?.items?.length" class="space-y-2 text-sm">
            <li
              v-for="document in documentsQuery.data.value.items"
              :key="document.uuid"
              class="flex items-center justify-between gap-3 rounded-md border p-2"
            >
              <div class="min-w-0">
                <p class="truncate font-medium">{{ document.file_name }}</p>
                <p class="truncate text-xs text-muted-foreground">{{ document.status }}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                :disabled="removeDocumentMutation.isPending.value"
                @click="removeDocumentMutation.mutate(document.uuid)"
              >
                Remove
              </Button>
            </li>
          </ul>
          <p v-else class="text-sm text-muted-foreground">No documents yet.</p>
        </CardContent>
      </Card>
    </div>
  </KnowledgeWorkbenchScaffold>
</template>
