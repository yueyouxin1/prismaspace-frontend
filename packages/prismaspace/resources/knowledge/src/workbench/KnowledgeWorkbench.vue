<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useMutation, useQuery } from '@tanstack/vue-query'
import { useI18n } from 'vue-i18n'
import type { PrismaspaceClient } from '@prismaspace/sdk'
import { prismaspaceQueryKeys } from '@prismaspace/resources-core'
import type {
  DocumentProcessingStatus,
  DocumentRead,
  KnowledgeBaseExecutionRequest,
  KnowledgeBaseInstanceConfigRead,
  KnowledgeGroupedSearchResultRead,
} from '@prismaspace/contracts'
import {
  type KnowledgeChunkUpdatePayload,
  type KnowledgeDocumentStatus,
  type KnowledgeInstanceConfig,
  type KnowledgeSearchRequest,
  type KnowledgeTaskProgress,
} from './types/knowledge-ide'
import KnowledgeBaseIdeWorkbench from './KnowledgeBaseIdeWorkbench.vue'
import { AssetPickerDialog, type AssetRead } from '@prismaspace/asset-hub'
import type { SseConnection } from '@prismaspace/common'

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
const knowledgeApi = props.client.knowledge
const resourceApi = props.client.resource
const platformQueryKeys = prismaspaceQueryKeys
const emitBusinessError = (error: unknown): void => {
  props.onError?.(error)
}
const assetHubAdapter = {
  createUploadTicket: (workspaceUuid: string, payload: Parameters<PrismaspaceClient['asset']['createUploadTicket']>[1]) =>
    props.client.asset.createUploadTicket(workspaceUuid, payload),
  confirmUpload: (payload: Parameters<PrismaspaceClient['asset']['confirmUpload']>[0]) =>
    props.client.asset.confirmUpload(payload),
  listAssets: (query: Parameters<PrismaspaceClient['asset']['listAssets']>[0]) =>
    props.client.asset.listAssets(query),
  getAsset: (assetUuid: string) => props.client.asset.getAsset(assetUuid),
  patchAsset: (assetUuid: string, payload: Parameters<PrismaspaceClient['asset']['patchAsset']>[1]) =>
    props.client.asset.patchAsset(assetUuid, payload),
  deleteAsset: (assetUuid: string) => props.client.asset.deleteAsset(assetUuid),
  createFolder: (workspaceUuid: string, payload: Parameters<PrismaspaceClient['asset']['createFolder']>[1]) =>
    props.client.asset.createFolder(workspaceUuid, payload),
  listFolders: (workspaceUuid: string, parentUuid?: string | null) =>
    props.client.asset.listFolders(workspaceUuid, parentUuid),
  listFolderTree: (workspaceUuid: string) => props.client.asset.listFolderTree(workspaceUuid),
  patchFolder: (folderUuid: string, payload: Parameters<PrismaspaceClient['asset']['patchFolder']>[1]) =>
    props.client.asset.patchFolder(folderUuid, payload),
  deleteFolder: (folderUuid: string) => props.client.asset.deleteFolder(folderUuid),
}

const page = ref(1)
const limit = ref(20)
const chunkPage = ref(1)
const chunkLimit = ref(20)
const keyword = ref('')
const statusFilter = ref<KnowledgeDocumentStatus | 'all'>('all')
const selectedDocumentUuid = ref<string | null>(null)
const taskProgressMap = ref<Record<string, KnowledgeTaskProgress>>({})
const searchResult = ref<KnowledgeGroupedSearchResultRead | null>(null)
const searchErrorMessage = ref<string | null>(null)
const assetPickerOpen = ref(false)
const pickerMode = ref<'add' | 'replace'>('add')
const replaceTargetDocumentUuid = ref<string | null>(null)

const activeWorkspaceInstanceUuid = computed(() => props.workspaceInstanceUuid ?? null)
const activeLatestPublishedInstanceUuid = computed(() => props.latestPublishedInstanceUuid ?? null)
const workspaceUuid = computed(() => props.workspaceUuid || null)

const resourceDetailQuery = useQuery({
  queryKey: computed(() => prismaspaceQueryKeys.resourceDetail(props.resourceUuid)),
  enabled: computed(() => Boolean(props.resourceUuid)),
  queryFn: async () => props.client.resource.getResource(props.resourceUuid),
})

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
      activeWorkspaceInstanceUuid.value ?? 'none',
      page.value,
      limit.value,
      statusFilter.value,
      keyword.value.trim(),
    )),
  enabled: computed(() => Boolean(activeWorkspaceInstanceUuid.value)),
  queryFn: async () => knowledgeApi.listDocuments(activeWorkspaceInstanceUuid.value as string, page.value, limit.value, {
    status: statusFilter.value === 'all' ? undefined : (statusFilter.value as DocumentProcessingStatus),
    keyword: keyword.value.trim() || undefined,
  }),
})

const documentChunksQuery = useQuery({
  queryKey: computed(() => [
    ...platformQueryKeys.knowledgeDocuments(
      activeWorkspaceInstanceUuid.value ?? 'none',
      chunkPage.value,
      chunkLimit.value,
      'all',
      '',
    ),
    'chunks',
    selectedDocumentUuid.value ?? 'none',
  ]),
  enabled: computed(() => Boolean(activeWorkspaceInstanceUuid.value && selectedDocumentUuid.value)),
  queryFn: async () => {
    if (!activeWorkspaceInstanceUuid.value || !selectedDocumentUuid.value) {
      return {
        items: [],
        total: 0,
        page: chunkPage.value,
        limit: chunkLimit.value,
      }
    }
    return knowledgeApi.listDocumentChunks(
      activeWorkspaceInstanceUuid.value,
      selectedDocumentUuid.value,
      chunkPage.value,
      chunkLimit.value,
    )
  },
})

const instanceQuery = useQuery({
  queryKey: computed(() => platformQueryKeys.knowledgeInstance(activeWorkspaceInstanceUuid.value ?? 'none')),
  enabled: computed(() => Boolean(activeWorkspaceInstanceUuid.value)),
  queryFn: async () => knowledgeApi.getInstance(activeWorkspaceInstanceUuid.value as string),
})

const documents = computed(() => documentsQuery.data.value?.items ?? [])
const chunks = computed(() => documentChunksQuery.data.value?.items ?? [])
const chunksErrorMessage = computed(() => {
  if (!documentChunksQuery.isError.value) {
    return null
  }
  const error = documentChunksQuery.error.value
  return error instanceof Error ? error.message : t('platform.workbench.knowledge.searchFailed')
})

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
  [selectedDocumentUuid, chunkLimit],
  () => {
    chunkPage.value = 1
  },
)

watch(
  activeWorkspaceInstanceUuid,
  () => {
    closeAllTaskConnections()
    taskProgressMap.value = {}
    selectedDocumentUuid.value = null
    searchResult.value = null
    searchErrorMessage.value = null
    page.value = 1
    chunkPage.value = 1
  },
)

watch(
  selectedDocumentUuid,
  () => {
    if (!selectedDocumentUuid.value) {
      return
    }
    void documentChunksQuery.refetch()
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
    if (!activeWorkspaceInstanceUuid.value) {
      throw new Error(t('platform.workbench.errors.noWorkspaceInstance'))
    }
    return knowledgeApi.addDocument(activeWorkspaceInstanceUuid.value, {
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
    if (!activeWorkspaceInstanceUuid.value) {
      throw new Error(t('platform.workbench.errors.noWorkspaceInstance'))
    }
    return knowledgeApi.updateDocument(activeWorkspaceInstanceUuid.value, payload.documentUuid, {
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
    if (!activeWorkspaceInstanceUuid.value) {
      throw new Error(t('platform.workbench.errors.noWorkspaceInstance'))
    }
    await knowledgeApi.removeDocument(activeWorkspaceInstanceUuid.value, documentUuid)
  },
  onSuccess: async () => {
    await Promise.all([documentsQuery.refetch(), instanceQuery.refetch()])
  },
  onError: (error) => emitBusinessError(error),
})

const removeDocumentsMutation = useMutation({
  mutationFn: async (documentUuids: string[]) => {
    if (!activeWorkspaceInstanceUuid.value) {
      throw new Error(t('platform.workbench.errors.noWorkspaceInstance'))
    }
    await Promise.all(documentUuids.map(documentUuid => knowledgeApi.removeDocument(activeWorkspaceInstanceUuid.value as string, documentUuid)))
  },
  onSuccess: async () => {
    await Promise.all([documentsQuery.refetch(), instanceQuery.refetch()])
  },
  onError: (error) => emitBusinessError(error),
})

const saveConfigMutation = useMutation({
  mutationFn: async (config: KnowledgeBaseInstanceConfigRead) => {
    if (!activeWorkspaceInstanceUuid.value) {
      throw new Error(t('platform.workbench.errors.noWorkspaceInstance'))
    }
    return knowledgeApi.updateInstance(activeWorkspaceInstanceUuid.value, { config })
  },
  onSuccess: async () => {
    await instanceQuery.refetch()
  },
  onError: (error) => emitBusinessError(error),
})

const buildPublishVersionTag = (): string => {
  const now = new Date()
  const pad = (value: number, length = 2): string => String(value).padStart(length, '0')
  return `v${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}${pad(now.getMilliseconds(), 3)}`
}

const publishMutation = useMutation({
  mutationFn: async () => {
    if (!activeWorkspaceInstanceUuid.value) {
      throw new Error(t('platform.workbench.errors.noWorkspaceInstance'))
    }
    return resourceApi.publishInstance(activeWorkspaceInstanceUuid.value, {
      version_tag: buildPublishVersionTag(),
    })
  },
  onSuccess: async () => {
    await instanceQuery.refetch()
  },
  onError: (error) => emitBusinessError(error),
})

const executeSearchMutation = useMutation({
  mutationFn: async (payload: KnowledgeSearchRequest) => {
    if (!activeWorkspaceInstanceUuid.value) {
      throw new Error(t('platform.workbench.errors.noWorkspaceInstance'))
    }
    const request: KnowledgeBaseExecutionRequest = {
      inputs: {
        query: payload.query,
        config: payload.config,
      },
    }
    return knowledgeApi.execute(activeWorkspaceInstanceUuid.value, request)
  },
  onSuccess: (response) => {
    searchResult.value = response.data
    searchErrorMessage.value = null
  },
  onError: (error) => {
    searchErrorMessage.value = error instanceof Error ? error.message : t('platform.workbench.knowledge.searchFailed')
    emitBusinessError(error)
  },
})

const updateChunkMutation = useMutation({
  mutationFn: async (payload: KnowledgeChunkUpdatePayload) => {
    if (!activeWorkspaceInstanceUuid.value) {
      throw new Error(t('platform.workbench.errors.noWorkspaceInstance'))
    }
    return knowledgeApi.updateChunks(activeWorkspaceInstanceUuid.value, {
      updates: {
        [payload.chunkUuid]: payload.content,
      },
    })
  },
  onSuccess: (_response, payload) => {
    const current = searchResult.value
    if (!current) {
      void documentChunksQuery.refetch()
      return
    }
    searchResult.value = {
      ...current,
      chunks: current.chunks.map(chunk => (chunk.uuid === payload.chunkUuid ? { ...chunk, content: payload.content } : chunk)),
    }
    void documentChunksQuery.refetch()
  },
  onError: (error) => emitBusinessError(error),
})

const handleAddDocument = async (payload: { sourceUri: string; fileName?: string }): Promise<void> => {
  await addDocumentMutation.mutateAsync(payload)
}

const handleAddDocumentFromLocal = (): void => {
  pickerMode.value = 'add'
  replaceTargetDocumentUuid.value = null
  assetPickerOpen.value = true
}

const handleAddDocumentFromUrl = async (payload: { sourceUri: string; fileName?: string }): Promise<void> => {
  await addDocumentMutation.mutateAsync(payload)
}

const handleRenameDocument = async (payload: { documentUuid: string; fileName: string }): Promise<void> => {
  await updateDocumentMutation.mutateAsync({
    documentUuid: payload.documentUuid,
    fileName: payload.fileName,
  })
}

const handleReplaceDocumentFromLocal = (payload: { documentUuid: string }): void => {
  pickerMode.value = 'replace'
  replaceTargetDocumentUuid.value = payload.documentUuid
  assetPickerOpen.value = true
}

const handleReplaceDocumentFromUrl = async (payload: { documentUuid: string; sourceUri: string; fileName?: string }): Promise<void> => {
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

const handleUpdateChunk = async (payload: KnowledgeChunkUpdatePayload): Promise<void> => {
  await updateChunkMutation.mutateAsync(payload)
}

const handlePublish = async (): Promise<void> => {
  await publishMutation.mutateAsync()
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
  await Promise.all([documentsQuery.refetch(), instanceQuery.refetch(), documentChunksQuery.refetch()])
}

const handleAssetSelected = async (assets: AssetRead[]): Promise<void> => {
  const selected = assets[0]
  if (!selected) {
    return
  }

  if (pickerMode.value === 'add') {
    await handleAddDocument({
      sourceUri: selected.url,
      fileName: selected.name,
    })
    return
  }

  if (!replaceTargetDocumentUuid.value) {
    return
  }
  await updateDocumentMutation.mutateAsync({
    documentUuid: replaceTargetDocumentUuid.value,
    sourceUri: selected.url,
    fileName: selected.name,
  })
}
</script>

<template>
  <KnowledgeBaseIdeWorkbench
    :resource-name="resourceDetailQuery.data.value?.name ?? ''"
    :resource-description="resourceDetailQuery.data.value?.description ?? ''"
    :updated-at="resourceDetailQuery.data.value?.updated_at ?? null"
    :workspace-instance-uuid="activeWorkspaceInstanceUuid"
    :latest-published-instance-uuid="activeLatestPublishedInstanceUuid"
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
    :chunks="chunks"
    :chunks-total="documentChunksQuery.data.value?.total ?? 0"
    :chunks-page="chunkPage"
    :chunks-limit="chunkLimit"
    :loading-chunks="documentChunksQuery.isLoading.value"
    :chunks-error-message="chunksErrorMessage"
    :config="instanceQuery.data.value?.config ?? null"
    :loading-config="instanceQuery.isLoading.value"
    :saving-config="saveConfigMutation.isPending.value"
    :publishing="publishMutation.isPending.value"
    :running-search="executeSearchMutation.isPending.value"
    :updating-chunk="updateChunkMutation.isPending.value"
    :search-result="searchResult"
    :search-error-message="searchErrorMessage"
    @refresh-documents="handleRefreshDocuments"
    @update:chunks-page="chunkPage = $event"
    @update:chunks-limit="chunkLimit = $event"
    @add-document-from-local="handleAddDocumentFromLocal"
    @add-document-from-url="handleAddDocumentFromUrl"
    @update:status-filter="statusFilter = $event"
    @update:keyword="keyword = $event"
    @select-document="selectedDocumentUuid = $event"
    @rename-document="handleRenameDocument"
    @replace-document-from-local="handleReplaceDocumentFromLocal"
    @replace-document-from-url="handleReplaceDocumentFromUrl"
    @remove-document="handleRemoveDocument"
    @remove-documents="handleRemoveDocuments"
    @update:page="page = $event"
    @update:limit="limit = $event"
    @save-config="handleSaveConfig"
    @run-search="handleRunSearch"
    @update-chunk="handleUpdateChunk"
    @back="props.onBack?.()"
    @publish="handlePublish"
  />

  <AssetPickerDialog
    v-model:open="assetPickerOpen"
    :workspace-uuid="workspaceUuid"
    :adapter="assetHubAdapter"
    :multiple="false"
    @selected="handleAssetSelected"
  />
</template>
