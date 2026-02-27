<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { WorkbenchSurface } from '@repo/workbench-core'
import KnowledgeExplorer from './sections/KnowledgeExplorer.vue'
import KnowledgeDocumentTable from './sections/KnowledgeDocumentTable.vue'
import KnowledgeSearchDebugger from './sections/KnowledgeSearchDebugger.vue'
import type {
  KnowledgeDocumentItem,
  KnowledgeDocumentStatus,
  KnowledgeExplorerSummary,
  KnowledgeInstanceConfig,
  KnowledgeRagConfig,
  KnowledgeSearchRequest,
  KnowledgeSearchResult,
  KnowledgeTaskProgress,
} from './types/knowledge-ide'

const props = withDefaults(
  defineProps<{
    resourceName: string
    resourceDescription?: string
    workspaceInstanceUuid?: string | null
    latestPublishedInstanceUuid?: string | null
    updatedAt?: string | null
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
    publishing?: boolean
    runningSearch?: boolean
    searchResult?: KnowledgeSearchResult | null
    searchErrorMessage?: string | null
  }>(),
  {
    resourceDescription: '',
    workspaceInstanceUuid: null,
    latestPublishedInstanceUuid: null,
    updatedAt: null,
    loadingDocuments: false,
    documentMutating: false,
    selectedDocumentUuid: null,
    taskProgressMap: () => ({}),
    config: null,
    loadingConfig: false,
    savingConfig: false,
    publishing: false,
    runningSearch: false,
    searchResult: null,
    searchErrorMessage: null,
  },
)

const emit = defineEmits<{
  (event: 'back'): void
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
  (event: 'publish'): void
}>()
const { t } = useI18n()

const defaultSearchConfig: KnowledgeRagConfig = {
  max_recall_num: 5,
  min_match_score: 0.5,
  search_strategy: 'hybrid',
  query_rewrite: false,
  result_rerank: false,
}

const canRunFromHeader = computed(() => !props.runningSearch && props.keyword.trim().length > 0)

const handleRunFromHeader = (): void => {
  if (!canRunFromHeader.value) {
    return
  }
  emit('run-search', {
    query: props.keyword.trim(),
    config: defaultSearchConfig,
  })
}

const handleSaveFromHeader = (): void => {
  if (!props.config || props.savingConfig || props.loadingConfig) {
    return
  }
  emit('save-config', props.config)
}
</script>

<template>
  <WorkbenchSurface
    :title="t('platform.workbench.knowledge.ideTitle')"
    :description="resourceDescription || t('platform.workbench.knowledge.ideDescription')"
    resource-type="knowledge"
    :resource-name="resourceName"
    :updated-at="updatedAt"
    :workspace-instance-uuid="workspaceInstanceUuid"
    :latest-published-instance-uuid="latestPublishedInstanceUuid"
    :run-action="{ visible: true, label: t('platform.workbench.actions.search'), loadingLabel: t('platform.workbench.knowledge.searching'), disabled: !canRunFromHeader, loading: runningSearch }"
    :save-action="{ visible: true, label: t('platform.workbench.knowledge.saveConfig'), loadingLabel: t('platform.workbench.knowledge.savingConfig'), disabled: savingConfig || loadingConfig || !config, loading: savingConfig }"
    :publish-action="{ visible: true, label: t('platform.workbench.header.actions.publish'), loadingLabel: t('platform.workbench.header.actions.publishing'), disabled: publishing || !workspaceInstanceUuid, loading: publishing }"
    :autosave="{ enabled: true, debounceMs: 1600, canAutosave: false, isDirty: false }"
    :save-handler="handleSaveFromHeader"
    @back="emit('back')"
    @run="handleRunFromHeader"
    @publish="emit('publish')"
  >
    <div class="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_minmax(360px,1fr)]">
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
