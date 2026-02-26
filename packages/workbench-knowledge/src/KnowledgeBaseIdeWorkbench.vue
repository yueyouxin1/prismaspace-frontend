<script setup lang="ts">
import { computed } from 'vue'
import { WorkbenchSurface } from '@repo/workbench-core'
import KnowledgeExplorer from './sections/KnowledgeExplorer.vue'
import KnowledgeDocumentTable from './sections/KnowledgeDocumentTable.vue'
import KnowledgeInspector from './sections/KnowledgeInspector.vue'
import KnowledgeSearchDebugger from './sections/KnowledgeSearchDebugger.vue'
import type {
  KnowledgeDocumentItem,
  KnowledgeDocumentStatus,
  KnowledgeExplorerSummary,
  KnowledgeInstanceConfig,
  KnowledgeSearchRequest,
  KnowledgeSearchResult,
  KnowledgeTaskProgress,
} from './types/knowledge-ide'

const props = withDefaults(
  defineProps<{
    resourceName: string
    workspaceInstanceUuid?: string | null
    latestPublishedInstanceUuid?: string | null
    summary: KnowledgeExplorerSummary
    statusFilter: KnowledgeDocumentStatus | 'all'
    keyword: string
    documents: KnowledgeDocumentItem[]
    total: number
    page: number
    limit: number
    loadingDocuments?: boolean
    documentMutating?: boolean
    selectedDocumentUuid?: string | null
    taskProgressMap?: Record<string, KnowledgeTaskProgress | undefined>
    config?: KnowledgeInstanceConfig | null
    loadingConfig?: boolean
    savingConfig?: boolean
    runningSearch?: boolean
    searchResult?: KnowledgeSearchResult | null
    searchErrorMessage?: string | null
  }>(),
  {
    workspaceInstanceUuid: null,
    latestPublishedInstanceUuid: null,
    loadingDocuments: false,
    documentMutating: false,
    selectedDocumentUuid: null,
    taskProgressMap: () => ({}),
    config: null,
    loadingConfig: false,
    savingConfig: false,
    runningSearch: false,
    searchResult: null,
    searchErrorMessage: null,
  },
)

const emit = defineEmits<{
  (event: 'refresh-documents'): void
  (event: 'add-document', payload: { sourceUri: string; fileName?: string }): void
  (event: 'update:status-filter', value: KnowledgeDocumentStatus | 'all'): void
  (event: 'update:keyword', value: string): void
  (event: 'select-document', documentUuid: string): void
  (event: 'rename-document', payload: { documentUuid: string; fileName: string }): void
  (event: 'replace-document', payload: { documentUuid: string; sourceUri: string; fileName?: string }): void
  (event: 'remove-document', documentUuid: string): void
  (event: 'remove-documents', documentUuids: string[]): void
  (event: 'update:page', value: number): void
  (event: 'update:limit', value: number): void
  (event: 'save-config', payload: KnowledgeInstanceConfig): void
  (event: 'run-search', payload: KnowledgeSearchRequest): void
}>()

const selectedDocument = computed<KnowledgeDocumentItem | null>(() => {
  if (!props.selectedDocumentUuid) {
    return null
  }
  return props.documents.find(document => document.uuid === props.selectedDocumentUuid) ?? null
})

const selectedTaskProgress = computed<KnowledgeTaskProgress | null>(() => {
  if (!selectedDocument.value) {
    return null
  }
  return props.taskProgressMap[selectedDocument.value.uuid] ?? null
})
</script>

<template>
  <WorkbenchSurface
    title="KnowledgeBase IDE"
    description="Document lifecycle, real-time processing, retrieval debug and instance configuration."
    resource-type="knowledge"
    :resource-name="resourceName"
    :workspace-instance-uuid="workspaceInstanceUuid"
    :latest-published-instance-uuid="latestPublishedInstanceUuid"
  >
    <div class="grid gap-4 xl:grid-cols-[280px_minmax(0,1.35fr)_minmax(360px,1fr)]">
      <KnowledgeExplorer
        :summary="summary"
        :status-filter="statusFilter"
        :keyword="keyword"
        :adding="documentMutating"
        :refreshing="loadingDocuments"
        @add-document="emit('add-document', $event)"
        @update:status-filter="emit('update:status-filter', $event)"
        @update:keyword="emit('update:keyword', $event)"
        @refresh="emit('refresh-documents')"
      />

      <KnowledgeDocumentTable
        :documents="documents"
        :total="total"
        :page="page"
        :limit="limit"
        :loading="loadingDocuments"
        :mutating="documentMutating"
        :selected-document-uuid="selectedDocumentUuid"
        :task-progress-map="taskProgressMap"
        @refresh="emit('refresh-documents')"
        @select-document="emit('select-document', $event)"
        @rename-document="emit('rename-document', $event)"
        @replace-document="emit('replace-document', $event)"
        @remove-document="emit('remove-document', $event)"
        @remove-documents="emit('remove-documents', $event)"
        @update:page="emit('update:page', $event)"
        @update:limit="emit('update:limit', $event)"
      />

      <div class="space-y-4">
        <KnowledgeInspector
          :selected-document="selectedDocument"
          :selected-task-progress="selectedTaskProgress"
          :config="config"
          :loading-config="loadingConfig"
          :saving-config="savingConfig"
          @save-config="emit('save-config', $event)"
        />

        <KnowledgeSearchDebugger
          :running="runningSearch"
          :result="searchResult"
          :error-message="searchErrorMessage"
          @run-search="emit('run-search', $event)"
        />
      </div>
    </div>
  </WorkbenchSurface>
</template>
