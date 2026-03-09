<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Plus,
  Search,
  Settings2,
  Upload,
} from 'lucide-vue-next'
import { WorkbenchSurface, type WorkbenchExtraAction } from '@prismaspace/resources-core'
import { Badge } from '@prismaspace/ui-shadcn/components/ui/badge'
import { Button } from '@prismaspace/ui-shadcn/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@prismaspace/ui-shadcn/components/ui/dialog'
import { Input } from '@prismaspace/ui-shadcn/components/ui/input'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@prismaspace/ui-shadcn/components/ui/pagination'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@prismaspace/ui-shadcn/components/ui/resizable'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@prismaspace/ui-shadcn/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@prismaspace/ui-shadcn/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@prismaspace/ui-shadcn/components/ui/tooltip'
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
  chunksTotal?: number
  chunksPage?: number
  chunksLimit?: number
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
  chunksTotal: 0,
  chunksPage: 1,
  chunksLimit: 20,
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
  (event: 'update:chunks-page', value: number): void
  (event: 'update:chunks-limit', value: number): void
  (event: 'save-config', config: KnowledgeInstanceConfig): void
  (event: 'run-search', payload: KnowledgeSearchRequest): void
  (event: 'update-chunk', payload: KnowledgeChunkUpdatePayload): void
  (event: 'back'): void
  (event: 'publish'): void
}>()

const addDialogOpen = ref(false)
const settingsDialogOpen = ref(false)
const viewMode = ref<KnowledgeDocumentViewMode>('card')
const activeView = ref<'content' | 'retrieval'>('content')

const totalPages = computed(() => {
  if (!props.limit || props.limit <= 0) {
    return 1
  }
  return Math.max(1, Math.ceil(props.total / props.limit))
})

const statusBadge = computed(() => {
  if (props.summary.failed > 0) {
    return {
      label: '异常',
      variant: 'destructive' as const,
      tooltip: `共 ${props.summary.total} 个文档，失败 ${props.summary.failed} 个，解析中 ${props.summary.processing} 个。`,
    }
  }
  if (props.summary.processing > 0) {
    return {
      label: '同步中',
      variant: 'outline' as const,
      tooltip: `共 ${props.summary.total} 个文档，当前有 ${props.summary.processing} 个文档正在同步。`,
    }
  }
  return {
    label: '正常',
    variant: 'secondary' as const,
    tooltip: `共 ${props.summary.total} 个文档，当前状态正常。`,
  }
})

const headerActions = computed<WorkbenchExtraAction[]>(() => [
  {
    key: 'toggle-retrieval',
    label: activeView.value === 'retrieval' ? '内容' : '检索',
    icon: Search,
    placement: 'oneline',
  },
  {
    key: 'open-settings',
    label: '配置',
    icon: Settings2,
    placement: 'oneline',
    disabled: props.loadingConfig || props.savingConfig,
  },
  {
    key: 'publish',
    label: '发布',
    loadingLabel: '发布中...',
    icon: Upload,
    placement: 'oneline',
    loading: props.publishing,
    disabled: props.publishing,
  },
])

const handleStatusFilterChange = (value: unknown): void => {
  emit('update:status-filter', String(value || 'all'))
}

const handleViewModeChange = (value: unknown): void => {
  if (value === 'list' || value === 'card') {
    viewMode.value = value
  }
}

const handleHeaderAction = (key: string): void => {
  if (key === 'toggle-retrieval') {
    activeView.value = activeView.value === 'retrieval' ? 'content' : 'retrieval'
    return
  }
  if (key === 'open-settings') {
    settingsDialogOpen.value = true
  }
}

const handleDocumentPageUpdate = (nextPage: number): void => {
  if (nextPage === props.page) {
    return
  }
  emit('update:page', nextPage)
}
</script>

<template>
  <WorkbenchSurface title="Knowledge Workbench" :description="resourceDescription || '知识库文档管理、解析分块与检索测试'"
    resource-type="knowledge" :resource-name="resourceName" :updated-at="updatedAt"
    :workspace-instance-uuid="workspaceInstanceUuid" :latest-published-instance-uuid="latestPublishedInstanceUuid"
    :save-status-text="''" :run-action="{ visible: false }" :save-action="{ visible: false }"
    :publish-action="{ visible: false }" :extra-actions="headerActions" @action="handleHeaderAction"
    @back="emit('back')" @publish="emit('publish')">
    <TooltipProvider :delay-duration="300">
      <div class="relative flex h-full min-h-0 flex-1 overflow-hidden bg-background">
        <div
          class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,hsl(var(--muted))_0%,transparent_46%)] opacity-50" />

        <ResizablePanelGroup direction="horizontal" class="relative hidden h-full min-h-0 w-full xl:flex">
          <ResizablePanel :default-size="30" :min-size="20" :max-size="45" class="min-h-0 bg-card/50">
            <section class="flex h-full min-h-0 flex-col">
              <div class="space-y-2 border-b py-2 px-3 bg-muted/30">
                <div class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                  <div class="relative min-w-0">
                    <Search
                      class="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input :model-value="keyword" class="h-8 rounded-lg border-border/80 bg-background pl-8 text-xs"
                      placeholder="搜索文档名称"
                      @update:model-value="(value) => emit('update:keyword', String(value || ''))" />
                  </div>
                  <Button size="sm" class="h-8 gap-1.5 px-2.5 shadow-xs" :disabled="documentMutating"
                    @click="addDialogOpen = true">
                    <Plus class="size-3.5" />
                    <span class="text-xs">添加</span>
                  </Button>
                </div>

                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-1.5">
                    <Select :model-value="statusFilter" @update:model-value="handleStatusFilterChange">
                      <SelectTrigger size="sm" class="h-8">
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

                    <ToggleGroup type="single" :model-value="viewMode" variant="outline" size="sm"
                      class="h-8 rounded-md bg-muted p-0.5" @update:model-value="handleViewModeChange">
                      <ToggleGroupItem value="list"
                        class="h-7 w-7 p-0 text-muted-foreground data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-xs"
                        aria-label="列表视图">
                        <List class="size-3.5" />
                      </ToggleGroupItem>
                      <ToggleGroupItem value="card"
                        class="h-7 w-7 p-0 text-muted-foreground data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-xs"
                        aria-label="卡片视图">
                        <LayoutGrid class="size-3.5" />
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <Badge :variant="statusBadge.variant" class="cursor-default">
                        {{ statusBadge.label }}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>{{ statusBadge.tooltip }}</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              <div class="min-h-0 flex-1 overflow-y-auto p-3">
                <KnowledgeDocumentList :documents="documents" :selected-document-uuid="selectedDocumentUuid"
                  :view-mode="viewMode" :loading="loadingDocuments" :task-progress-map="taskProgressMap"
                  :mutating="documentMutating" @select="emit('select-document', $event)"
                  @rename="emit('rename-document', $event)"
                  @replace-from-local="emit('replace-document-from-local', $event)"
                  @replace-from-url="emit('replace-document-from-url', $event)"
                  @remove="emit('remove-document', $event)" @remove-batch="emit('remove-documents', $event)" />
              </div>

              <div class="flex items-center justify-between gap-2 border-t p-3">
                <span class="text-xs text-muted-foreground">{{ page }} / {{ totalPages }}</span>
                <div class="flex items-center gap-2">
                  <Pagination class="mx-0 w-auto" :page="page" :total="totalPages" :items-per-page="1"
                    :sibling-count="1" show-edges @update:page="handleDocumentPageUpdate">
                    <PaginationContent v-slot="{ items }">
                      <PaginationPrevious>
                        <ChevronLeft class="size-4" />
                      </PaginationPrevious>
                      <template v-for="(item, index) in items"
                        :key="`document-pagination-${index}-${item.type === 'page' ? item.value : 'ellipsis'}`">
                        <PaginationItem v-if="item.type === 'page'" :value="item.value"
                          :is-active="item.value === page">
                          {{ item.value }}
                        </PaginationItem>
                        <PaginationEllipsis v-else />
                      </template>
                      <PaginationNext>
                        <ChevronRight class="size-4" />
                      </PaginationNext>
                    </PaginationContent>
                  </Pagination>
                </div>
              </div>
            </section>
          </ResizablePanel>

          <ResizableHandle />

          <ResizablePanel :default-size="70" :min-size="50" class="min-h-0">
            <section class="flex h-full min-h-0 flex-col">
              <KnowledgeRetrievalSection v-if="activeView === 'retrieval'" :running-search="runningSearch"
                :search-result="searchResult" :search-error-message="searchErrorMessage"
                @run-search="emit('run-search', $event)" />

              <KnowledgeChunksSection v-else
                :selected-document="documents.find(item => item.uuid === selectedDocumentUuid) || null" :chunks="chunks"
                :chunks-total="chunksTotal" :chunks-page="chunksPage" :chunks-limit="chunksLimit"
                :loading-chunks="loadingChunks" :chunks-error-message="chunksErrorMessage"
                :updating-chunk="updatingChunk" @update:page="emit('update:chunks-page', $event)"
                @update:limit="emit('update:chunks-limit', $event)" @update-chunk="emit('update-chunk', $event)" />
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
            <KnowledgeDocumentList :documents="documents" :selected-document-uuid="selectedDocumentUuid"
              :view-mode="viewMode" :loading="loadingDocuments" :task-progress-map="taskProgressMap"
              :mutating="documentMutating" @select="emit('select-document', $event)"
              @rename="emit('rename-document', $event)"
              @replace-from-local="emit('replace-document-from-local', $event)"
              @replace-from-url="emit('replace-document-from-url', $event)" @remove="emit('remove-document', $event)"
              @remove-batch="emit('remove-documents', $event)" />
          </section>

          <section class="min-h-0 flex-1 rounded-lg border bg-card p-3">
            <KnowledgeRetrievalSection v-if="activeView === 'retrieval'" :running-search="runningSearch"
              :search-result="searchResult" :search-error-message="searchErrorMessage"
              @run-search="emit('run-search', $event)" />
            <KnowledgeChunksSection v-else
              :selected-document="documents.find(item => item.uuid === selectedDocumentUuid) || null" :chunks="chunks"
              :chunks-total="chunksTotal" :chunks-page="chunksPage" :chunks-limit="chunksLimit"
              :loading-chunks="loadingChunks" :chunks-error-message="chunksErrorMessage" :updating-chunk="updatingChunk"
              @update:page="emit('update:chunks-page', $event)" @update:limit="emit('update:chunks-limit', $event)"
              @update-chunk="emit('update-chunk', $event)" />
          </section>
        </div>
      </div>
    </TooltipProvider>

    <AddDocumentDialog v-model:open="addDialogOpen" :loading="documentMutating"
      @add-local="emit('add-document-from-local')" @add-url="emit('add-document-from-url', $event)" />

    <Dialog v-model:open="settingsDialogOpen">
      <DialogContent class="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>知识库配置</DialogTitle>
          <DialogDescription>配置 parser 与 chunker 策略，保存后立即生效。</DialogDescription>
        </DialogHeader>
        <KnowledgeSettingsSection :config="config" :loading-config="loadingConfig" :saving-config="savingConfig"
          embedded @save-config="emit('save-config', $event)" />
      </DialogContent>
    </Dialog>
  </WorkbenchSurface>
</template>
