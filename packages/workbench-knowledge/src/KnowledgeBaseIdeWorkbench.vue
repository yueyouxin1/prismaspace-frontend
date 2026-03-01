<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { Check, Copy, LayoutGrid, List, Plus, RefreshCcw, Search } from 'lucide-vue-next'
import { WorkbenchSurface } from '@repo/workbench-core'
import { Badge } from '@repo/ui-shadcn/components/ui/badge'
import { Button } from '@repo/ui-shadcn/components/ui/button'
import { Input } from '@repo/ui-shadcn/components/ui/input'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@repo/ui-shadcn/components/ui/resizable'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui-shadcn/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/ui-shadcn/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@repo/ui-shadcn/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@repo/ui-shadcn/components/ui/tooltip'
import AddDocumentDialog from './components/AddDocumentDialog.vue'
import KnowledgeDocumentList from './components/KnowledgeDocumentList.vue'
import KnowledgeChunksSection from './sections/KnowledgeChunksSection.vue'
import KnowledgeRetrievalSection from './sections/KnowledgeRetrievalSection.vue'
import KnowledgeSettingsSection from './sections/KnowledgeSettingsSection.vue'
import type {
  KnowledgeChunkItem,
  KnowledgeChunkUpdatePayload,
  KnowledgeDocumentItem,
  KnowledgeDocumentSourcePayload,
  KnowledgeDocumentStatus,
  KnowledgeDocumentViewMode,
  KnowledgeInstanceConfig,
  KnowledgeSearchRequest,
  KnowledgeSearchResult,
  KnowledgeTaskProgress,
  KnowledgeWorkbenchSummary,
} from './types/knowledge-ide'

const props = withDefaults(defineProps<{
  resourceName: string
  resourceDescription?: string
  updatedAt?: string | null
  workspaceInstanceUuid?: string | null
  latestPublishedInstanceUuid?: string | null
  summary: KnowledgeWorkbenchSummary
  statusFilter: KnowledgeDocumentStatus | 'all'
  keyword: string
  documents: KnowledgeDocumentItem[]
  total: number
  page: number
  limit: number
  loadingDocuments?: boolean
  documentMutating?: boolean
  selectedDocumentUuid?: string | null
  taskProgressMap?: Record<string, KnowledgeTaskProgress>
  chunks?: KnowledgeChunkItem[]
  loadingChunks?: boolean
  chunksErrorMessage?: string | null
  config: KnowledgeInstanceConfig | null
  loadingConfig?: boolean
  savingConfig?: boolean
  publishing?: boolean
  runningSearch?: boolean
  updatingChunk?: boolean
  searchResult?: KnowledgeSearchResult | null
  searchErrorMessage?: string | null
}>(), {
  resourceDescription: '',
  updatedAt: null,
  workspaceInstanceUuid: null,
  latestPublishedInstanceUuid: null,
  loadingDocuments: false,
  documentMutating: false,
  selectedDocumentUuid: null,
  taskProgressMap: () => ({}),
  chunks: () => [],
  loadingChunks: false,
  chunksErrorMessage: null,
  loadingConfig: false,
  savingConfig: false,
  publishing: false,
  runningSearch: false,
  updatingChunk: false,
  searchResult: null,
  searchErrorMessage: null,
})

const emit = defineEmits<{
  (event: 'refresh-documents'): void
  (event: 'refresh-chunks'): void
  (event: 'add-document-from-local'): void
  (event: 'add-document-from-url', payload: KnowledgeDocumentSourcePayload): void
  (event: 'update:status-filter', value: KnowledgeDocumentStatus | 'all'): void
  (event: 'update:keyword', value: string): void
  (event: 'select-document', documentUuid: string): void
  (event: 'rename-document', payload: { documentUuid: string; fileName: string }): void
  (event: 'replace-document-from-local', payload: { documentUuid: string }): void
  (event: 'replace-document-from-url', payload: { documentUuid: string; sourceUri: string; fileName?: string }): void
  (event: 'remove-document', documentUuid: string): void
  (event: 'remove-documents', documentUuids: string[]): void
  (event: 'update:page', value: number): void
  (event: 'update:limit', value: number): void
  (event: 'save-config', config: KnowledgeInstanceConfig): void
  (event: 'run-search', payload: KnowledgeSearchRequest): void
  (event: 'update-chunk', payload: KnowledgeChunkUpdatePayload): void
  (event: 'back'): void
  (event: 'publish'): void
}>()

const addDialogOpen = ref(false)
const viewMode = ref<KnowledgeDocumentViewMode>('list')
const activeTab = ref<'chunks' | 'retrieval' | 'settings'>('chunks')
const copiedSourceUri = ref(false)
let copiedResetTimer: ReturnType<typeof setTimeout> | null = null

const selectedDocument = computed(() => {
  return props.documents.find(document => document.uuid === props.selectedDocumentUuid) || null
})

const totalPages = computed(() => {
  if (!props.limit || props.limit <= 0) {
    return 1
  }
  return Math.max(1, Math.ceil(props.total / props.limit))
})

const saveStatusText = computed(() => {
  if (props.summary.processing > 0) {
    return `解析中 ${props.summary.processing}`
  }
  if (props.summary.failed > 0) {
    return `失败 ${props.summary.failed}`
  }
  return '状态正常'
})

const saveStatusVariant = computed<'outline' | 'secondary' | 'destructive'>(() => {
  if (props.summary.failed > 0) {
    return 'destructive'
  }
  if (props.summary.processing > 0) {
    return 'outline'
  }
  return 'secondary'
})

const goPrevPage = (): void => {
  if (props.page <= 1) {
    return
  }
  emit('update:page', props.page - 1)
}

const goNextPage = (): void => {
  if (props.page >= totalPages.value) {
    return
  }
  emit('update:page', props.page + 1)
}

const handleStatusFilterChange = (value: unknown): void => {
  emit('update:status-filter', String(value || 'all'))
}

const handleViewModeChange = (value: unknown): void => {
  if (value === 'list' || value === 'card') {
    viewMode.value = value
  }
}

const copySourceUri = async (): Promise<void> => {
  const sourceUri = selectedDocument.value?.source_uri?.trim()
  if (!sourceUri || typeof navigator === 'undefined' || !navigator.clipboard) {
    return
  }
  try {
    await navigator.clipboard.writeText(sourceUri)
    copiedSourceUri.value = true
    if (copiedResetTimer) {
      clearTimeout(copiedResetTimer)
    }
    copiedResetTimer = setTimeout(() => {
      copiedSourceUri.value = false
      copiedResetTimer = null
    }, 1200)
  } catch {
    copiedSourceUri.value = false
  }
}

onBeforeUnmount(() => {
  if (!copiedResetTimer) {
    return
  }
  clearTimeout(copiedResetTimer)
  copiedResetTimer = null
})
</script>

<template>
  <WorkbenchSurface
    title="Knowledge Workbench"
    :description="resourceDescription || '知识库文档管理、解析分块与检索测试'"
    resource-type="knowledge"
    :resource-name="resourceName"
    :updated-at="updatedAt"
    :workspace-instance-uuid="workspaceInstanceUuid"
    :latest-published-instance-uuid="latestPublishedInstanceUuid"
    :save-status-text="saveStatusText"
    :save-status-variant="saveStatusVariant"
    :run-action="{ visible: false }"
    :save-action="{ visible: false }"
    :publish-action="{ visible: true, disabled: publishing, loading: publishing }"
    @back="emit('back')"
    @publish="emit('publish')"
  >
    <TooltipProvider :delay-duration="300">
      <div class="relative flex h-full min-h-0 flex-1 overflow-hidden bg-background">
        <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,hsl(var(--muted))_0%,transparent_46%)] opacity-50" />

        <ResizablePanelGroup direction="horizontal" class="relative hidden h-full min-h-0 w-full xl:flex">
          <ResizablePanel :default-size="30" :min-size="20" :max-size="45" class="min-h-0 border-r bg-card/50">
            <section class="flex h-full min-h-0 flex-col p-3">
              <div class="space-y-2 border-b pb-2">
                <div class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                  <div class="relative min-w-0">
                    <Search class="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      :model-value="keyword"
                      class="h-9 pl-8"
                      placeholder="搜索文档名称 / URI"
                      @update:model-value="(value) => emit('update:keyword', String(value || ''))"
                    />
                  </div>
                  <Button class="h-9 px-3" :disabled="documentMutating" @click="addDialogOpen = true">
                    <Plus class="mr-1.5 size-3.5" />
                    添加
                  </Button>
                </div>

                <div class="flex items-center justify-between gap-2">
                  <p class="truncate text-xs text-muted-foreground">
                    {{ summary.total }} Docs · {{ summary.processing }} Parsing · {{ summary.failed }} Failed
                  </p>
                  <div class="flex items-center gap-1.5">
                    <Select
                      :model-value="statusFilter"
                      @update:model-value="handleStatusFilterChange"
                    >
                      <SelectTrigger class="h-8 w-[118px] text-xs">
                        <SelectValue placeholder="状态" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部</SelectItem>
                        <SelectItem value="pending">待处理</SelectItem>
                        <SelectItem value="uploading">上传中</SelectItem>
                        <SelectItem value="processing">解析中</SelectItem>
                        <SelectItem value="completed">已完成</SelectItem>
                        <SelectItem value="failed">失败</SelectItem>
                      </SelectContent>
                    </Select>

                    <ToggleGroup
                      type="single"
                      :model-value="viewMode"
                      variant="outline"
                      size="sm"
                      class="h-8 rounded-md bg-muted p-0.5"
                      @update:model-value="handleViewModeChange"
                    >
                      <ToggleGroupItem value="list" class="h-7 w-7 p-0" aria-label="列表视图">
                        <List class="size-3.5" />
                      </ToggleGroupItem>
                      <ToggleGroupItem value="card" class="h-7 w-7 p-0" aria-label="卡片视图">
                        <LayoutGrid class="size-3.5" />
                      </ToggleGroupItem>
                    </ToggleGroup>

                    <Tooltip>
                      <TooltipTrigger as-child>
                        <Button size="icon-sm" variant="outline" :disabled="loadingDocuments" @click="emit('refresh-documents')">
                          <RefreshCcw class="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>刷新文档</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>

              <div class="mt-2 min-h-0 flex-1 overflow-y-auto">
                <KnowledgeDocumentList
                  :documents="documents"
                  :selected-document-uuid="selectedDocumentUuid"
                  :view-mode="viewMode"
                  :loading="loadingDocuments"
                  :task-progress-map="taskProgressMap"
                  :mutating="documentMutating"
                  @select="emit('select-document', $event)"
                  @rename="emit('rename-document', $event)"
                  @replace-from-local="emit('replace-document-from-local', $event)"
                  @replace-from-url="emit('replace-document-from-url', $event)"
                  @remove="emit('remove-document', $event)"
                  @remove-batch="emit('remove-documents', $event)"
                />
              </div>

              <div class="mt-3 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                <div class="flex items-center gap-2">
                  <Button size="sm" variant="outline" :disabled="page <= 1" @click="goPrevPage">上一页</Button>
                  <Button size="sm" variant="outline" :disabled="page >= totalPages" @click="goNextPage">下一页</Button>
                </div>
                <div class="flex items-center gap-2">
                  <span>{{ page }} / {{ totalPages }}</span>
                  <Select
                    :model-value="String(limit)"
                    @update:model-value="(value) => emit('update:limit', Number(value || 20))"
                  >
                    <SelectTrigger class="h-8 w-[80px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>
          </ResizablePanel>

          <ResizableHandle />

          <ResizablePanel :default-size="70" :min-size="50" class="min-h-0">
            <section class="flex h-full min-h-0 flex-col p-3">
              <div class="mb-3 flex items-start justify-between gap-2 border-b pb-3">
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold">{{ selectedDocument?.file_name || '未选择文档' }}</p>
                  <div class="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Tooltip>
                      <TooltipTrigger as-child>
                        <p class="max-w-[400px] truncate">
                          {{ selectedDocument?.source_uri || '请选择左侧文档后查看详情' }}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" class="max-w-[560px] break-all">
                        {{ selectedDocument?.source_uri || '请选择左侧文档后查看详情' }}
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger as-child>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          class="h-6 w-6"
                          :disabled="!selectedDocument?.source_uri"
                          @click="copySourceUri"
                        >
                          <Check v-if="copiedSourceUri" class="size-3.5 text-emerald-500" />
                          <Copy v-else class="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{{ copiedSourceUri ? '已复制' : '复制 URI' }}</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                <Badge variant="outline">Chunk {{ selectedDocument?.chunk_count ?? 0 }}</Badge>
              </div>

              <Tabs v-model="activeTab" class="flex min-h-0 flex-1 flex-col">
                <TabsList class="w-fit bg-muted/70 p-1">
                  <TabsTrigger value="chunks">分块</TabsTrigger>
                  <TabsTrigger value="retrieval">检索测试</TabsTrigger>
                  <TabsTrigger value="settings">配置</TabsTrigger>
                </TabsList>

                <TabsContent value="chunks" class="mt-3 min-h-0 flex-1 animate-in fade-in zoom-in-95 duration-200">
                  <KnowledgeChunksSection
                    :selected-document="selectedDocument"
                    :chunks="chunks"
                    :loading-chunks="loadingChunks"
                    :chunks-error-message="chunksErrorMessage"
                    :updating-chunk="updatingChunk"
                    @update-chunk="emit('update-chunk', $event)"
                    @refresh-chunks="emit('refresh-chunks')"
                  />
                </TabsContent>

                <TabsContent value="retrieval" class="mt-3 min-h-0 flex-1 animate-in fade-in zoom-in-95 duration-200">
                  <KnowledgeRetrievalSection
                    :running-search="runningSearch"
                    :search-result="searchResult"
                    :search-error-message="searchErrorMessage"
                    @run-search="emit('run-search', $event)"
                  />
                </TabsContent>

                <TabsContent value="settings" class="mt-3 min-h-0 flex-1 animate-in fade-in zoom-in-95 duration-200">
                  <KnowledgeSettingsSection
                    :config="config"
                    :loading-config="loadingConfig"
                    :saving-config="savingConfig"
                    @save-config="emit('save-config', $event)"
                  />
                </TabsContent>
              </Tabs>
            </section>
          </ResizablePanel>
        </ResizablePanelGroup>

        <div class="relative flex min-h-0 flex-1 flex-col gap-2 p-2 xl:hidden">
          <section class="rounded-lg border bg-card p-3">
            <div class="mb-2 flex items-center justify-between">
              <p class="text-sm font-semibold">文档列表</p>
              <Button size="sm" :disabled="documentMutating" @click="addDialogOpen = true">
                <Plus class="mr-1 size-3.5" />
                添加
              </Button>
            </div>
            <KnowledgeDocumentList
              :documents="documents"
              :selected-document-uuid="selectedDocumentUuid"
              :view-mode="viewMode"
              :loading="loadingDocuments"
              :task-progress-map="taskProgressMap"
              :mutating="documentMutating"
              @select="emit('select-document', $event)"
              @rename="emit('rename-document', $event)"
              @replace-from-local="emit('replace-document-from-local', $event)"
              @replace-from-url="emit('replace-document-from-url', $event)"
              @remove="emit('remove-document', $event)"
              @remove-batch="emit('remove-documents', $event)"
            />
          </section>

          <section class="min-h-0 flex-1 rounded-lg border bg-card p-3">
            <KnowledgeChunksSection
              :selected-document="selectedDocument"
              :chunks="chunks"
              :loading-chunks="loadingChunks"
              :chunks-error-message="chunksErrorMessage"
              :updating-chunk="updatingChunk"
              @update-chunk="emit('update-chunk', $event)"
              @refresh-chunks="emit('refresh-chunks')"
            />
          </section>
        </div>
      </div>
    </TooltipProvider>

    <AddDocumentDialog
      v-model:open="addDialogOpen"
      :loading="documentMutating"
      @add-local="emit('add-document-from-local')"
      @add-url="emit('add-document-from-url', $event)"
    />
  </WorkbenchSurface>
</template>
