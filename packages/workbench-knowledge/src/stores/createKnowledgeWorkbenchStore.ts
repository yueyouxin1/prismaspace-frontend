import { reactive } from 'vue'
import type {
  KnowledgeDocumentStatus,
  KnowledgeDocumentViewMode,
  KnowledgeSourceType,
  KnowledgeWorkbenchState,
} from '../types/knowledge-ide'

export interface CreateKnowledgeWorkbenchStoreOptions {
  statusFilter?: KnowledgeDocumentStatus | 'all'
  keyword?: string
  viewMode?: KnowledgeDocumentViewMode
  activeTab?: KnowledgeWorkbenchState['activeTab']
  selectedDocumentUuid?: string | null
  selectedSourceType?: KnowledgeSourceType
  addDialogOpen?: boolean
}

export const createKnowledgeWorkbenchStore = (
  options: CreateKnowledgeWorkbenchStoreOptions = {},
) => {
  const state = reactive<KnowledgeWorkbenchState>({
    statusFilter: options.statusFilter ?? 'all',
    keyword: options.keyword ?? '',
    viewMode: options.viewMode ?? 'list',
    activeTab: options.activeTab ?? 'chunks',
    selectedDocumentUuid: options.selectedDocumentUuid ?? null,
    selectedSourceType: options.selectedSourceType ?? 'local',
    addDialogOpen: options.addDialogOpen ?? false,
  })

  const setStatusFilter = (status: KnowledgeDocumentStatus | 'all'): void => {
    state.statusFilter = status
  }

  const setKeyword = (keyword: string): void => {
    state.keyword = keyword
  }

  const setViewMode = (mode: KnowledgeDocumentViewMode): void => {
    state.viewMode = mode
  }

  const setActiveTab = (tab: KnowledgeWorkbenchState['activeTab']): void => {
    state.activeTab = tab
  }

  const selectDocument = (documentUuid: string | null): void => {
    state.selectedDocumentUuid = documentUuid
  }

  const setSourceType = (sourceType: KnowledgeSourceType): void => {
    state.selectedSourceType = sourceType
  }

  const setAddDialogOpen = (open: boolean): void => {
    state.addDialogOpen = open
  }

  return {
    state,
    setStatusFilter,
    setKeyword,
    setViewMode,
    setActiveTab,
    selectDocument,
    setSourceType,
    setAddDialogOpen,
  }
}
