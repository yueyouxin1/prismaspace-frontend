<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useMutation, useQuery } from '@tanstack/vue-query'
import { knowledgeApi } from '@app/services/api/knowledge-client'
import { emitBusinessError } from '@app/services/http/error-gateway'
import { platformQueryKeys } from '@app/services/api/query-keys'
import type {
  DocumentProcessingStatus,
  DocumentRead,
  KnowledgeBaseExecutionRequest,
  KnowledgeBaseInstanceConfigRead,
  KnowledgeGroupedSearchResultRead,
} from '@app/services/api/contracts'
import {
  KnowledgeBaseIdeWorkbench,
  type KnowledgeDocumentStatus,
  type KnowledgeInstanceConfig,
  type KnowledgeSearchRequest,
  type KnowledgeTaskProgress,
} from '@repo/workbench-knowledge'
import type { SseConnection } from '@repo/common'

const props = defineProps<{
  resourceName: string
  workspaceInstanceUuid?: string | null
  latestPublishedInstanceUuid?: string | null
}>()

const page = ref(1)
const limit = ref(20)
const keyword = ref('')
const statusFilter = ref<KnowledgeDocumentStatus | 'all'>('all')
const selectedDocumentUuid = ref<string | null>(null)
const taskProgressMap = ref<Record<string, KnowledgeTaskProgress>>({})
const searchResult = ref<KnowledgeGroupedSearchResultRead | null>(null)
const searchErrorMessage = ref<string | null>(null)

const workspaceInstanceUuid = computed(() => props.workspaceInstanceUuid ?? null)

const taskConnections = new Map<string, SseConnection>()
let refreshTimer: ReturnType<typeof setTimeout> | null = null

const isTrackingStatus = (status: string): boolean => {
  const normalized = status.toLowerCase()
  return normalized === 'pending' || normalized === 'uploading' || normalized === 'processing'
}

const isFinalStatus = (status: string): boolean => {
  const normalized = status.toLowerCase()
  return normalized === 'completed' || normalized === 'failed'
}

const scheduleDocumentsRefresh = (): void => {
  if (refreshTimer) {
    return
  }
  refreshTimer = setTimeout(() => {
    refreshTimer = null
    void documentsQuery.refetch()
  }, 700)
}

const closeTaskConnection = (taskId: string): void => {
  const connection = taskConnections.get(taskId)
  if (!connection) {
    return
  }
  connection.close()
  taskConnections.delete(taskId)
}

const closeAllTaskConnections = (): void => {
  taskConnections.forEach((connection) => {
    connection.close()
  })
  taskConnections.clear()
}

const subscribeTaskProgress = async (taskId: string): Promise<void> => {
  if (!taskId || taskConnections.has(taskId)) {
    return
  }

  try {
    const connection = await knowledgeApi.subscribeTaskProgress(taskId, {
      onProgress: (progress) => {
        taskProgressMap.value = {
          ...taskProgressMap.value,
          [taskId]: progress,
        }
        if (isFinalStatus(progress.status)) {
          closeTaskConnection(taskId)
        }
        scheduleDocumentsRefresh()
      },
      onServerError: (message) => {
        taskProgressMap.value = {
          ...taskProgressMap.value,
          [taskId]: {
            status: 'failed',
            message: 'Task stream failed',
            progress: 0,
            total: 0,
            error: message,
          },
        }
        closeTaskConnection(taskId)
      },
      onError: (error) => {
        emitBusinessError(error)
      },
    })
    taskConnections.set(taskId, connection)
  } catch (error) {
    emitBusinessError(error)
  }
}

const ensureTaskTracked = (document: DocumentRead): void => {
  if (!isTrackingStatus(document.status)) {
    return
  }
  void subscribeTaskProgress(document.uuid)
}

const documentsQuery = useQuery({
  queryKey: computed(() =>
    platformQueryKeys.knowledgeDocuments(
      workspaceInstanceUuid.value ?? 'none',
      page.value,
      limit.value,
      statusFilter.value,
      keyword.value.trim(),
    )),
  enabled: computed(() => Boolean(workspaceInstanceUuid.value)),
  queryFn: async () => knowledgeApi.listDocuments(workspaceInstanceUuid.value as string, page.value, limit.value, {
    status: statusFilter.value === 'all' ? undefined : (statusFilter.value as DocumentProcessingStatus),
    keyword: keyword.value.trim() || undefined,
  }),
})

const instanceQuery = useQuery({
  queryKey: computed(() => platformQueryKeys.knowledgeInstance(workspaceInstanceUuid.value ?? 'none')),
  enabled: computed(() => Boolean(workspaceInstanceUuid.value)),
  queryFn: async () => knowledgeApi.getInstance(workspaceInstanceUuid.value as string),
})

const documents = computed(() => documentsQuery.data.value?.items ?? [])

watch(
  documents,
  (items) => {
    items.forEach((document) => {
      ensureTaskTracked(document)
    })

    if (!items.length) {
      selectedDocumentUuid.value = null
      return
    }

    if (!selectedDocumentUuid.value || !items.some(document => document.uuid === selectedDocumentUuid.value)) {
      selectedDocumentUuid.value = items[0]?.uuid ?? null
    }
  },
  { immediate: true },
)

watch(
  [statusFilter, keyword, limit],
  () => {
    page.value = 1
  },
)

watch(
  workspaceInstanceUuid,
  () => {
    closeAllTaskConnections()
    taskProgressMap.value = {}
    selectedDocumentUuid.value = null
    searchResult.value = null
    searchErrorMessage.value = null
    page.value = 1
  },
)

onBeforeUnmount(() => {
  closeAllTaskConnections()
  if (refreshTimer) {
    clearTimeout(refreshTimer)
    refreshTimer = null
  }
})

const addDocumentMutation = useMutation({
  mutationFn: async (payload: { sourceUri: string; fileName?: string }) => {
    if (!workspaceInstanceUuid.value) {
      throw new Error('No workspace instance uuid found.')
    }
    return knowledgeApi.addDocument(workspaceInstanceUuid.value, {
      source_uri: payload.sourceUri,
      file_name: payload.fileName,
    })
  },
  onSuccess: async (document) => {
    ensureTaskTracked(document)
    await Promise.all([documentsQuery.refetch(), instanceQuery.refetch()])
  },
  onError: (error) => emitBusinessError(error),
})

const updateDocumentMutation = useMutation({
  mutationFn: async (payload: { documentUuid: string; fileName?: string; sourceUri?: string }) => {
    if (!workspaceInstanceUuid.value) {
      throw new Error('No workspace instance uuid found.')
    }
    return knowledgeApi.updateDocument(workspaceInstanceUuid.value, payload.documentUuid, {
      file_name: payload.fileName,
      source_uri: payload.sourceUri,
    })
  },
  onSuccess: async (document) => {
    ensureTaskTracked(document)
    await documentsQuery.refetch()
  },
  onError: (error) => emitBusinessError(error),
})

const removeDocumentMutation = useMutation({
  mutationFn: async (documentUuid: string) => {
    if (!workspaceInstanceUuid.value) {
      throw new Error('No workspace instance uuid found.')
    }
    await knowledgeApi.removeDocument(workspaceInstanceUuid.value, documentUuid)
  },
  onSuccess: async () => {
    await Promise.all([documentsQuery.refetch(), instanceQuery.refetch()])
  },
  onError: (error) => emitBusinessError(error),
})

const removeDocumentsMutation = useMutation({
  mutationFn: async (documentUuids: string[]) => {
    if (!workspaceInstanceUuid.value) {
      throw new Error('No workspace instance uuid found.')
    }
    await Promise.all(documentUuids.map(documentUuid => knowledgeApi.removeDocument(workspaceInstanceUuid.value as string, documentUuid)))
  },
  onSuccess: async () => {
    await Promise.all([documentsQuery.refetch(), instanceQuery.refetch()])
  },
  onError: (error) => emitBusinessError(error),
})

const saveConfigMutation = useMutation({
  mutationFn: async (config: KnowledgeBaseInstanceConfigRead) => {
    if (!workspaceInstanceUuid.value) {
      throw new Error('No workspace instance uuid found.')
    }
    return knowledgeApi.updateInstance(workspaceInstanceUuid.value, { config })
  },
  onSuccess: async () => {
    await instanceQuery.refetch()
  },
  onError: (error) => emitBusinessError(error),
})

const executeSearchMutation = useMutation({
  mutationFn: async (payload: KnowledgeSearchRequest) => {
    if (!workspaceInstanceUuid.value) {
      throw new Error('No workspace instance uuid found.')
    }
    const request: KnowledgeBaseExecutionRequest = {
      inputs: {
        query: payload.query,
        config: payload.config,
      },
    }
    return knowledgeApi.execute(workspaceInstanceUuid.value, request)
  },
  onSuccess: (response) => {
    searchResult.value = response.data
    searchErrorMessage.value = null
  },
  onError: (error) => {
    searchErrorMessage.value = error instanceof Error ? error.message : 'Knowledge retrieval execution failed.'
    emitBusinessError(error)
  },
})

const handleAddDocument = async (payload: { sourceUri: string; fileName?: string }): Promise<void> => {
  await addDocumentMutation.mutateAsync(payload)
}

const handleRenameDocument = async (payload: { documentUuid: string; fileName: string }): Promise<void> => {
  await updateDocumentMutation.mutateAsync({
    documentUuid: payload.documentUuid,
    fileName: payload.fileName,
  })
}

const handleReplaceDocument = async (payload: { documentUuid: string; sourceUri: string; fileName?: string }): Promise<void> => {
  await updateDocumentMutation.mutateAsync({
    documentUuid: payload.documentUuid,
    sourceUri: payload.sourceUri,
    fileName: payload.fileName,
  })
}

const handleRemoveDocument = async (documentUuid: string): Promise<void> => {
  await removeDocumentMutation.mutateAsync(documentUuid)
}

const handleRemoveDocuments = async (documentUuids: string[]): Promise<void> => {
  await removeDocumentsMutation.mutateAsync(documentUuids)
}

const handleSaveConfig = async (config: KnowledgeInstanceConfig): Promise<void> => {
  await saveConfigMutation.mutateAsync(config)
}

const handleRunSearch = async (payload: KnowledgeSearchRequest): Promise<void> => {
  await executeSearchMutation.mutateAsync(payload)
}

const summary = computed(() => {
  const items = documents.value
  return {
    total: instanceQuery.data.value?.document_count ?? documentsQuery.data.value?.total ?? items.length,
    processing: items.filter(item => isTrackingStatus(item.status)).length,
    failed: items.filter(item => String(item.status).toLowerCase() === 'failed').length,
  }
})

const documentMutating = computed(() => {
  return addDocumentMutation.isPending.value
    || updateDocumentMutation.isPending.value
    || removeDocumentMutation.isPending.value
    || removeDocumentsMutation.isPending.value
})

const handleRefreshDocuments = async (): Promise<void> => {
  await Promise.all([documentsQuery.refetch(), instanceQuery.refetch()])
}
</script>

<template>
  <KnowledgeBaseIdeWorkbench
    :resource-name="resourceName"
    :workspace-instance-uuid="workspaceInstanceUuid"
    :latest-published-instance-uuid="latestPublishedInstanceUuid"
    :summary="summary"
    :status-filter="statusFilter"
    :keyword="keyword"
    :documents="documents"
    :total="documentsQuery.data.value?.total ?? 0"
    :page="page"
    :limit="limit"
    :loading-documents="documentsQuery.isLoading.value"
    :document-mutating="documentMutating"
    :selected-document-uuid="selectedDocumentUuid"
    :task-progress-map="taskProgressMap"
    :config="instanceQuery.data.value?.config ?? null"
    :loading-config="instanceQuery.isLoading.value"
    :saving-config="saveConfigMutation.isPending.value"
    :running-search="executeSearchMutation.isPending.value"
    :search-result="searchResult"
    :search-error-message="searchErrorMessage"
    @refresh-documents="handleRefreshDocuments"
    @add-document="handleAddDocument"
    @update:status-filter="statusFilter = $event"
    @update:keyword="keyword = $event"
    @select-document="selectedDocumentUuid = $event"
    @rename-document="handleRenameDocument"
    @replace-document="handleReplaceDocument"
    @remove-document="handleRemoveDocument"
    @remove-documents="handleRemoveDocuments"
    @update:page="page = $event"
    @update:limit="limit = $event"
    @save-config="handleSaveConfig"
    @run-search="handleRunSearch"
  />
</template>
