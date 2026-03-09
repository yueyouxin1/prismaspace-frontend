<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  KnowledgeBaseIdeWorkbench,
} from '@prismaspace/knowledge/workbench'
import {
  createKnowledgeWorkbenchStore,
} from '@prismaspace/knowledge/runtime'
import type {
  KnowledgeChunkItem,
  KnowledgeChunkUpdatePayload,
  KnowledgeDocumentItem,
  KnowledgeDocumentSourcePayload,
  KnowledgeDocumentStatus,
  KnowledgeInstanceConfig,
  KnowledgeSearchRequest,
  KnowledgeSearchResult,
  KnowledgeTaskProgress,
} from '@prismaspace/knowledge/types'

const store = createKnowledgeWorkbenchStore({
  statusFilter: 'all',
  viewMode: 'list',
})

const statusFilter = computed({
  get: () => store.state.statusFilter,
  set: value => store.setStatusFilter(value),
})
const keyword = computed({
  get: () => store.state.keyword,
  set: value => store.setKeyword(value),
})

const page = ref(1)
const limit = ref(20)
const selectedDocumentUuid = ref<string | null>(null)
const documents = ref<KnowledgeDocumentItem[]>([
  {
    uuid: 'doc-guideline',
    file_name: '产品知识库接入规范.md',
    source_uri: 'https://example.com/docs/product-guideline',
    file_type: 'text/markdown',
    file_size: 18240,
    status: 'completed',
    error_message: null,
    chunk_count: 3,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    uuid: 'doc-faq',
    file_name: '客服 FAQ.txt',
    source_uri: 'https://example.com/docs/faq.txt',
    file_type: 'text/plain',
    file_size: 9630,
    status: 'completed',
    error_message: null,
    chunk_count: 2,
    created_at: new Date(Date.now() - 43200000).toISOString(),
  },
])

const chunkMap = ref<Record<string, KnowledgeChunkItem[]>>({
  'doc-guideline': [
    { uuid: 'chunk-a1', content: '接入前需先创建 workspace 与 resource。', token_count: 17, status: 'completed', context: null, payload: null, error_message: null },
    { uuid: 'chunk-a2', content: '文档上传后由解析服务异步切块，支持 markdown、pdf 与纯文本。', token_count: 37, status: 'completed', context: null, payload: null, error_message: null },
    { uuid: 'chunk-a3', content: '检索测试建议使用 hybrid 策略并设置合理阈值。', token_count: 24, status: 'completed', context: null, payload: null, error_message: null },
  ],
  'doc-faq': [
    { uuid: 'chunk-b1', content: 'Q: 上传失败怎么办？ A: 请检查链接是否可访问。', token_count: 26, status: 'completed', context: null, payload: null, error_message: null },
    { uuid: 'chunk-b2', content: 'Q: 如何提高召回质量？ A: 调整 top-k 和最低匹配分数。', token_count: 31, status: 'completed', context: null, payload: null, error_message: null },
  ],
})

const taskProgressMap = ref<Record<string, KnowledgeTaskProgress>>({})
const loadingDocuments = ref(false)
const documentMutating = ref(false)
const loadingChunks = ref(false)
const chunksErrorMessage = ref<string | null>(null)
const runningSearch = ref(false)
const searchResult = ref<KnowledgeSearchResult | null>(null)
const searchErrorMessage = ref<string | null>(null)
const updatingChunk = ref(false)
const publishing = ref(false)
const savingConfig = ref(false)

const instanceConfig = ref<KnowledgeInstanceConfig>({
  parser_policy: {
    parser_name: 'simple_parser_v1',
    allowed_mime_types: ['text/plain', 'application/pdf', 'text/markdown'],
    params: {
      tika_url: 'http://localhost:9998',
    },
  },
  chunker_policies: [
    {
      chunker_name: 'simple_chunker_v1',
      params: {
        chunk_size: 500,
      },
    },
  ],
})

const filteredDocuments = computed(() => {
  const normalizedKeyword = keyword.value.trim().toLowerCase()
  return documents.value.filter((item) => {
    if (statusFilter.value !== 'all' && item.status !== statusFilter.value) {
      return false
    }
    if (!normalizedKeyword) {
      return true
    }
    return item.file_name.toLowerCase().includes(normalizedKeyword) || item.source_uri.toLowerCase().includes(normalizedKeyword)
  })
})

const pagedDocuments = computed(() => {
  const start = (page.value - 1) * limit.value
  return filteredDocuments.value.slice(start, start + limit.value)
})

const selectedChunks = computed(() => {
  if (!selectedDocumentUuid.value) {
    return []
  }
  return chunkMap.value[selectedDocumentUuid.value] || []
})

const summary = computed(() => ({
  total: filteredDocuments.value.length,
  processing: filteredDocuments.value.filter(item => item.status === 'processing' || item.status === 'uploading' || item.status === 'pending').length,
  failed: filteredDocuments.value.filter(item => item.status === 'failed').length,
}))

watch(
  filteredDocuments,
  (items) => {
    if (!items.length) {
      selectedDocumentUuid.value = null
      return
    }
    if (!selectedDocumentUuid.value || !items.some(item => item.uuid === selectedDocumentUuid.value)) {
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

const generateId = (prefix: string): string => `${prefix}-${Math.random().toString(36).slice(2, 10)}`

const buildDefaultChunks = (name: string): KnowledgeChunkItem[] => [
  {
    uuid: generateId('chunk'),
    content: `文档《${name}》的自动解析分块 1。`,
    token_count: 18,
    status: 'completed',
    error_message: null,
    context: null,
    payload: null,
  },
  {
    uuid: generateId('chunk'),
    content: `文档《${name}》的自动解析分块 2。`,
    token_count: 18,
    status: 'completed',
    error_message: null,
    context: null,
    payload: null,
  },
]

const setDocumentStatus = (documentUuid: string, status: KnowledgeDocumentStatus): void => {
  documents.value = documents.value.map(item => (item.uuid === documentUuid ? { ...item, status } : item))
}

const handleRefreshDocuments = async (): Promise<void> => {
  loadingDocuments.value = true
  await new Promise(resolve => setTimeout(resolve, 500))
  loadingDocuments.value = false
}

const handleRefreshChunks = async (): Promise<void> => {
  loadingChunks.value = true
  chunksErrorMessage.value = null
  await new Promise(resolve => setTimeout(resolve, 300))
  loadingChunks.value = false
}

const createProcessingDocument = (payload: KnowledgeDocumentSourcePayload): KnowledgeDocumentItem => {
  const documentUuid = generateId('doc')
  const displayName = payload.fileName || payload.sourceUri.split('/').pop() || 'untitled'
  return {
    uuid: documentUuid,
    file_name: displayName,
    source_uri: payload.sourceUri,
    file_type: displayName.endsWith('.md') ? 'text/markdown' : 'text/plain',
    file_size: Math.max(1024, displayName.length * 512),
    status: 'processing',
    error_message: null,
    chunk_count: 0,
    created_at: new Date().toISOString(),
  }
}

const enqueueDocumentSimulation = (document: KnowledgeDocumentItem): void => {
  taskProgressMap.value = {
    ...taskProgressMap.value,
    [document.uuid]: {
      status: 'processing',
      message: 'Parsing...',
      progress: 1,
      total: 3,
    },
  }
  setTimeout(() => {
    taskProgressMap.value = {
      ...taskProgressMap.value,
      [document.uuid]: {
        status: 'processing',
        message: 'Chunking...',
        progress: 2,
        total: 3,
      },
    }
  }, 600)
  setTimeout(() => {
    const chunks = buildDefaultChunks(document.file_name)
    chunkMap.value = {
      ...chunkMap.value,
      [document.uuid]: chunks,
    }
    documents.value = documents.value.map(item => (item.uuid === document.uuid
      ? { ...item, status: 'completed', chunk_count: chunks.length }
      : item))
    taskProgressMap.value = {
      ...taskProgressMap.value,
      [document.uuid]: {
        status: 'completed',
        message: 'Completed',
        progress: 3,
        total: 3,
      },
    }
  }, 1200)
}

const handleAddDocument = async (payload: KnowledgeDocumentSourcePayload): Promise<void> => {
  documentMutating.value = true
  const created = createProcessingDocument(payload)
  documents.value = [created, ...documents.value]
  selectedDocumentUuid.value = created.uuid
  enqueueDocumentSimulation(created)
  await new Promise(resolve => setTimeout(resolve, 300))
  documentMutating.value = false
}

const handleAddDocumentFromLocal = async (): Promise<void> => {
  await handleAddDocument({
    sourceUri: `https://cdn.example.com/upload/${generateId('file')}.md`,
    fileName: `本地上传-${new Date().toLocaleTimeString()}.md`,
  })
}

const handleAddDocumentFromUrl = async (payload: KnowledgeDocumentSourcePayload): Promise<void> => {
  await handleAddDocument(payload)
}

const handleRenameDocument = async (payload: { documentUuid: string; fileName: string }): Promise<void> => {
  documents.value = documents.value.map(item => (item.uuid === payload.documentUuid ? { ...item, file_name: payload.fileName } : item))
}

const handleReplaceDocumentFromLocal = async (payload: { documentUuid: string }): Promise<void> => {
  const name = `替换本地-${new Date().toLocaleTimeString()}.txt`
  documents.value = documents.value.map(item => (item.uuid === payload.documentUuid
    ? { ...item, source_uri: `https://cdn.example.com/upload/${generateId('file')}.txt`, file_name: name, status: 'processing', chunk_count: 0 }
    : item))
  setDocumentStatus(payload.documentUuid, 'processing')
  chunkMap.value[payload.documentUuid] = buildDefaultChunks(name)
  setTimeout(() => {
    setDocumentStatus(payload.documentUuid, 'completed')
    documents.value = documents.value.map(item => (item.uuid === payload.documentUuid ? { ...item, chunk_count: chunkMap.value[payload.documentUuid]?.length || 0 } : item))
  }, 600)
}

const handleReplaceDocumentFromUrl = async (payload: { documentUuid: string; sourceUri: string; fileName?: string }): Promise<void> => {
  const nextName = payload.fileName || payload.sourceUri.split('/').pop() || 'replaced-doc'
  documents.value = documents.value.map(item => (item.uuid === payload.documentUuid
    ? { ...item, source_uri: payload.sourceUri, file_name: nextName, status: 'processing', chunk_count: 0 }
    : item))
  chunkMap.value[payload.documentUuid] = buildDefaultChunks(nextName)
  setTimeout(() => {
    setDocumentStatus(payload.documentUuid, 'completed')
    documents.value = documents.value.map(item => (item.uuid === payload.documentUuid ? { ...item, chunk_count: chunkMap.value[payload.documentUuid]?.length || 0 } : item))
  }, 700)
}

const handleRemoveDocument = async (documentUuid: string): Promise<void> => {
  documents.value = documents.value.filter(item => item.uuid !== documentUuid)
  const nextChunkMap = { ...chunkMap.value }
  delete nextChunkMap[documentUuid]
  chunkMap.value = nextChunkMap
}

const handleRemoveDocuments = async (documentUuids: string[]): Promise<void> => {
  const removedSet = new Set(documentUuids)
  documents.value = documents.value.filter(item => !removedSet.has(item.uuid))
  const nextChunkMap = { ...chunkMap.value }
  documentUuids.forEach(uuid => delete nextChunkMap[uuid])
  chunkMap.value = nextChunkMap
}

const handleSaveConfig = async (config: KnowledgeInstanceConfig): Promise<void> => {
  savingConfig.value = true
  await new Promise(resolve => setTimeout(resolve, 350))
  instanceConfig.value = config
  savingConfig.value = false
}

const handleRunSearch = async (payload: KnowledgeSearchRequest): Promise<void> => {
  runningSearch.value = true
  searchErrorMessage.value = null
  await new Promise(resolve => setTimeout(resolve, 700))
  const candidates = Object.values(chunkMap.value).flat()
  if (!candidates.length) {
    searchResult.value = {
      instance_uuid: 'demo-instance',
      chunks: [],
    }
    runningSearch.value = false
    return
  }
  const normalizedQuery = payload.query.toLowerCase()
  const chunks = candidates
    .map((chunk, index) => {
      const hit = chunk.content.toLowerCase().includes(normalizedQuery)
      const baseScore = hit ? 0.82 : 0.55
      return {
        uuid: chunk.uuid,
        content: chunk.content,
        score: Number((baseScore - index * 0.03).toFixed(4)),
        context: chunk.context || null,
      }
    })
    .filter(item => item.score >= payload.config.min_match_score)
    .slice(0, payload.config.max_recall_num)

  searchResult.value = {
    instance_uuid: 'demo-instance',
    chunks,
  }
  runningSearch.value = false
}

const handleUpdateChunk = async (payload: KnowledgeChunkUpdatePayload): Promise<void> => {
  updatingChunk.value = true
  for (const documentUuid of Object.keys(chunkMap.value)) {
    const chunks = chunkMap.value[documentUuid] || []
    const hasTarget = chunks.some(chunk => chunk.uuid === payload.chunkUuid)
    if (!hasTarget) {
      continue
    }
    chunkMap.value[documentUuid] = chunks.map(chunk => (chunk.uuid === payload.chunkUuid ? { ...chunk, content: payload.content, token_count: payload.content.length } : chunk))
  }
  await new Promise(resolve => setTimeout(resolve, 300))
  updatingChunk.value = false
}

const handlePublish = async (): Promise<void> => {
  publishing.value = true
  await new Promise(resolve => setTimeout(resolve, 600))
  publishing.value = false
}

const handleBack = (): void => {
}
</script>

<template>
  <div class="h-[calc(100vh-8rem)] min-h-[760px] w-full overflow-hidden rounded-lg border">
    <KnowledgeBaseIdeWorkbench
      resource-name="Knowledge Workbench Demo"
      resource-description="Demo: 知识库文档解析与分块管理工作台"
      :updated-at="new Date().toISOString()"
      workspace-instance-uuid="demo-workspace-instance"
      latest-published-instance-uuid="demo-published-instance"
      :summary="summary"
      :status-filter="statusFilter"
      :keyword="keyword"
      :documents="pagedDocuments"
      :total="filteredDocuments.length"
      :page="page"
      :limit="limit"
      :loading-documents="loadingDocuments"
      :document-mutating="documentMutating"
      :selected-document-uuid="selectedDocumentUuid"
      :task-progress-map="taskProgressMap"
      :chunks="selectedChunks"
      :loading-chunks="loadingChunks"
      :chunks-error-message="chunksErrorMessage"
      :config="instanceConfig"
      :loading-config="false"
      :saving-config="savingConfig"
      :publishing="publishing"
      :running-search="runningSearch"
      :updating-chunk="updatingChunk"
      :search-result="searchResult"
      :search-error-message="searchErrorMessage"
      @refresh-documents="handleRefreshDocuments"
      @refresh-chunks="handleRefreshChunks"
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
      @publish="handlePublish"
      @back="handleBack"
    />
  </div>
</template>
