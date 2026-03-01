<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { LucideIcon } from 'lucide-vue-next'
import { Download, File, FileText, Globe, Layers, Link2, MoreHorizontal } from 'lucide-vue-next'
import { Badge } from '@repo/ui-shadcn/components/ui/badge'
import { Button } from '@repo/ui-shadcn/components/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@repo/ui-shadcn/components/ui/context-menu'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui-shadcn/components/ui/dropdown-menu'
import { Skeleton } from '@repo/ui-shadcn/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@repo/ui-shadcn/components/ui/tooltip'
import type {
  KnowledgeDocumentItem,
  KnowledgeDocumentViewMode,
  KnowledgeTaskProgress,
} from '../types/knowledge-ide'
import { detectKnowledgeSourceType } from '../services/knowledge-normalizers'

const props = withDefaults(defineProps<{
  documents: KnowledgeDocumentItem[]
  selectedDocumentUuid: string | null
  viewMode: KnowledgeDocumentViewMode
  loading?: boolean
  taskProgressMap?: Record<string, KnowledgeTaskProgress>
  mutating?: boolean
}>(), {
  loading: false,
  taskProgressMap: () => ({}),
  mutating: false,
})

const emit = defineEmits<{
  (event: 'select', documentUuid: string): void
  (event: 'rename', payload: { documentUuid: string; fileName: string }): void
  (event: 'replace-from-local', payload: { documentUuid: string }): void
  (event: 'replace-from-url', payload: { documentUuid: string; sourceUri: string; fileName?: string }): void
  (event: 'remove', documentUuid: string): void
  (event: 'remove-batch', documentUuids: string[]): void
}>()

interface FileVisual {
  icon: LucideIcon
  iconClass: string
  typeLabel: string
}

const selectedMap = ref<Record<string, boolean>>({})
const batchMode = ref(false)

watch(
  () => props.documents.map(item => item.uuid),
  (uuids) => {
    const next: Record<string, boolean> = {}
    uuids.forEach((uuid) => {
      if (selectedMap.value[uuid]) {
        next[uuid] = true
      }
    })
    selectedMap.value = next
  },
  { immediate: true },
)

watch(
  batchMode,
  (enabled) => {
    if (enabled) {
      return
    }
    selectedMap.value = {}
  },
)

const selectedCount = computed(() => Object.keys(selectedMap.value).length)

const statusLabel = (status: string): string => {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'completed') {
    return '已完成'
  }
  if (normalized === 'failed') {
    return '失败'
  }
  if (normalized === 'processing') {
    return '解析中'
  }
  if (normalized === 'uploading') {
    return '上传中'
  }
  return '待处理'
}

const statusVariant = (status: string): 'outline' | 'secondary' | 'destructive' => {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'failed') {
    return 'destructive'
  }
  if (normalized === 'completed') {
    return 'secondary'
  }
  return 'outline'
}

const formatFileSize = (value?: number | null): string => {
  if (!value || value <= 0) {
    return '--'
  }
  if (value < 1024) {
    return `${value} B`
  }
  const kb = value / 1024
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`
  }
  return `${(kb / 1024).toFixed(1)} MB`
}

const formatDateTime = (value?: string | null): string => {
  if (!value) {
    return '--'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const fileVisual = (document: KnowledgeDocumentItem): FileVisual => {
  const fileName = String(document.file_name || '').toLowerCase()
  if (fileName.endsWith('.pdf')) {
    return { icon: FileText, iconClass: 'text-red-500', typeLabel: 'PDF' }
  }
  if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
    return { icon: FileText, iconClass: 'text-sky-600', typeLabel: 'Word' }
  }
  if (fileName.endsWith('.md') || fileName.endsWith('.txt')) {
    return { icon: FileText, iconClass: 'text-zinc-500', typeLabel: 'Text' }
  }

  const sourceType = detectKnowledgeSourceType(document)
  if (sourceType === 'web') {
    return { icon: Globe, iconClass: 'text-zinc-500', typeLabel: 'Web' }
  }
  if (sourceType === 'uri') {
    return { icon: Link2, iconClass: 'text-zinc-500', typeLabel: 'URI' }
  }
  return { icon: File, iconClass: 'text-zinc-500', typeLabel: 'File' }
}

const toggleSelect = (documentUuid: string): void => {
  if (selectedMap.value[documentUuid]) {
    const next = { ...selectedMap.value }
    delete next[documentUuid]
    selectedMap.value = next
    return
  }
  selectedMap.value = {
    ...selectedMap.value,
    [documentUuid]: true,
  }
}

const handleRename = (document: KnowledgeDocumentItem): void => {
  const nextName = window.prompt('输入新的文档名称', document.file_name)?.trim()
  if (!nextName || nextName === document.file_name) {
    return
  }
  emit('rename', {
    documentUuid: document.uuid,
    fileName: nextName,
  })
}

const handleReplaceFromUrl = (document: KnowledgeDocumentItem): void => {
  const sourceUri = window.prompt('输入新的 URI / URL', document.source_uri)?.trim()
  if (!sourceUri) {
    return
  }
  const fileName = window.prompt('输入显示名称（可选）', document.file_name)?.trim()
  emit('replace-from-url', {
    documentUuid: document.uuid,
    sourceUri,
    fileName: fileName || undefined,
  })
}

const handleDownload = (document: KnowledgeDocumentItem): void => {
  const sourceUri = document.source_uri?.trim()
  if (!sourceUri) {
    return
  }
  const anchor = window.document.createElement('a')
  anchor.href = sourceUri
  anchor.target = '_blank'
  anchor.rel = 'noopener noreferrer'
  anchor.download = document.file_name || 'knowledge-document'
  anchor.click()
}

const handleRemove = (documentUuid: string): void => {
  const confirmed = window.confirm('确认删除该文档？该操作不可撤销。')
  if (!confirmed) {
    return
  }
  emit('remove', documentUuid)
}

const handleBatchRemove = (): void => {
  const documentUuids = Object.keys(selectedMap.value)
  if (!documentUuids.length) {
    return
  }
  const confirmed = window.confirm(`确认删除已选中的 ${documentUuids.length} 个文档？`)
  if (!confirmed) {
    return
  }
  emit('remove-batch', documentUuids)
}

const toggleBatchMode = (): void => {
  batchMode.value = !batchMode.value
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div class="flex items-center justify-between px-1 pb-2">
      <p class="text-xs text-muted-foreground">共 {{ documents.length }} 个文档</p>
      <div class="flex items-center gap-2">
        <Button variant="outline" size="sm" :disabled="mutating" @click="toggleBatchMode">
          {{ batchMode ? '完成批量' : '批量选择' }}
        </Button>
        <Button
          v-if="batchMode && selectedCount > 0"
          variant="outline"
          size="sm"
          :disabled="mutating"
          @click="handleBatchRemove"
        >
          删除已选（{{ selectedCount }}）
        </Button>
      </div>
    </div>

    <div v-if="loading" class="space-y-2 px-1">
      <Skeleton v-for="index in 6" :key="index" class="h-10 w-full rounded-md" />
    </div>

    <div v-else-if="!documents.length" class="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
      暂无文档，请先添加本地文件或 URI 资源。
    </div>

    <Transition v-else name="doc-layout" mode="out-in">
      <div v-if="viewMode === 'list'" key="list" class="space-y-0.5 px-1">
        <ContextMenu
          v-for="document in documents"
          :key="document.uuid"
        >
          <Tooltip>
            <TooltipTrigger as-child>
              <ContextMenuTrigger as-child>
                <div
                  class="list-item group/list flex h-9 items-center gap-2 rounded-md px-2 transition hover:bg-accent"
                  :class="{ 'bg-accent': selectedDocumentUuid === document.uuid }"
                >
                  <input
                    v-if="batchMode"
                    type="checkbox"
                    class="size-3.5 rounded border"
                    :checked="Boolean(selectedMap[document.uuid])"
                    @click.stop
                    @change="toggleSelect(document.uuid)"
                  >

                  <component
                    v-else
                    :is="fileVisual(document).icon"
                    class="size-4 shrink-0"
                    :class="fileVisual(document).iconClass"
                  />

                  <button
                    type="button"
                    class="min-w-0 flex-1 text-left"
                    @click="emit('select', document.uuid)"
                  >
                    <p class="truncate text-sm font-medium">{{ document.file_name }}</p>
                    <p class="truncate text-xs text-muted-foreground">
                      {{ document.source_uri || '无 URI' }}
                    </p>
                  </button>

                  <DropdownMenu>
                    <DropdownMenuTrigger as-child>
                      <Button size="icon-sm" variant="ghost" class="action-menu h-7 w-7" @click.stop>
                        <MoreHorizontal class="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" class="w-44">
                      <DropdownMenuItem @select.prevent="handleRename(document)">重命名</DropdownMenuItem>
                      <DropdownMenuItem @select.prevent="handleDownload(document)">下载</DropdownMenuItem>
                      <DropdownMenuItem @select.prevent="emit('replace-from-local', { documentUuid: document.uuid })">替换为本地文件</DropdownMenuItem>
                      <DropdownMenuItem @select.prevent="handleReplaceFromUrl(document)">替换为 URI 资源</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem class="text-destructive" @select.prevent="handleRemove(document.uuid)">删除</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </ContextMenuTrigger>
            </TooltipTrigger>

            <TooltipContent side="right" class="max-w-[420px] text-xs">
              <div class="space-y-1">
                <p class="font-medium text-foreground">{{ document.file_name }}</p>
                <p>类型: {{ fileVisual(document).typeLabel }}</p>
                <p>状态: {{ statusLabel(document.status) }}</p>
                <p>更新时间: {{ formatDateTime(document.created_at) }}</p>
              </div>
            </TooltipContent>
          </Tooltip>

          <ContextMenuContent class="w-44">
            <ContextMenuItem @select.prevent="handleRename(document)">重命名</ContextMenuItem>
            <ContextMenuItem @select.prevent="handleDownload(document)">下载</ContextMenuItem>
            <ContextMenuItem @select.prevent="emit('replace-from-local', { documentUuid: document.uuid })">替换为本地文件</ContextMenuItem>
            <ContextMenuItem @select.prevent="handleReplaceFromUrl(document)">替换为 URI 资源</ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem class="text-destructive" @select.prevent="handleRemove(document.uuid)">删除</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </div>

      <div v-else key="card" class="space-y-3 px-1">
        <ContextMenu
          v-for="document in documents"
          :key="document.uuid"
        >
          <Tooltip>
            <TooltipTrigger as-child>
              <ContextMenuTrigger as-child>
                <article
                  class="card-item card-container group/card rounded-lg border bg-background p-3 transition hover:border-foreground/30 hover:shadow-sm"
                  :class="{ 'border-foreground/30 bg-accent/40': selectedDocumentUuid === document.uuid }"
                >
                  <div class="flex items-start gap-2">
                    <input
                      v-if="batchMode"
                      type="checkbox"
                      class="mt-0.5 size-3.5 rounded border"
                      :checked="Boolean(selectedMap[document.uuid])"
                      @click.stop
                      @change="toggleSelect(document.uuid)"
                    >

                    <component
                      :is="fileVisual(document).icon"
                      class="mt-0.5 size-4 shrink-0"
                      :class="fileVisual(document).iconClass"
                    />

                    <button
                      type="button"
                      class="min-w-0 flex-1 text-left"
                      @click="emit('select', document.uuid)"
                    >
                      <p class="line-clamp-2 text-sm font-semibold">{{ document.file_name }}</p>
                    </button>

                    <DropdownMenu>
                      <DropdownMenuTrigger as-child>
                        <Button size="icon-sm" variant="ghost" class="action-menu h-7 w-7" @click.stop>
                          <MoreHorizontal class="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" class="w-44">
                        <DropdownMenuItem @select.prevent="handleRename(document)">重命名</DropdownMenuItem>
                        <DropdownMenuItem @select.prevent="handleDownload(document)">下载</DropdownMenuItem>
                        <DropdownMenuItem @select.prevent="emit('replace-from-local', { documentUuid: document.uuid })">替换为本地文件</DropdownMenuItem>
                        <DropdownMenuItem @select.prevent="handleReplaceFromUrl(document)">替换为 URI 资源</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem class="text-destructive" @select.prevent="handleRemove(document.uuid)">删除</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div class="mt-2 border-t border-dashed" />

                  <div class="card-metadata mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <Badge :variant="statusVariant(document.status)">{{ statusLabel(document.status) }}</Badge>
                    <span class="inline-flex items-center gap-1">
                      <Layers class="size-3" />
                      {{ document.chunk_count }} chunks
                    </span>
                    <span>{{ formatFileSize(document.file_size) }}</span>
                    <span>{{ fileVisual(document).typeLabel }}</span>
                    <span class="ml-auto">{{ formatDateTime(document.created_at) }}</span>
                  </div>

                  <p
                    v-if="taskProgressMap?.[document.uuid]"
                    class="mt-2 truncate text-[11px] text-muted-foreground"
                  >
                    {{ taskProgressMap?.[document.uuid]?.message }}
                    ({{ taskProgressMap?.[document.uuid]?.progress }}/{{ taskProgressMap?.[document.uuid]?.total }})
                  </p>
                </article>
              </ContextMenuTrigger>
            </TooltipTrigger>

            <TooltipContent side="right" class="max-w-[420px] text-xs">
              <div class="space-y-1">
                <p class="font-medium text-foreground">{{ document.file_name }}</p>
                <p>类型: {{ fileVisual(document).typeLabel }}</p>
                <p>状态: {{ statusLabel(document.status) }}</p>
                <p>更新时间: {{ formatDateTime(document.created_at) }}</p>
              </div>
            </TooltipContent>
          </Tooltip>

          <ContextMenuContent class="w-44">
            <ContextMenuItem @select.prevent="handleRename(document)">重命名</ContextMenuItem>
            <ContextMenuItem @select.prevent="handleDownload(document)">下载</ContextMenuItem>
            <ContextMenuItem @select.prevent="emit('replace-from-local', { documentUuid: document.uuid })">替换为本地文件</ContextMenuItem>
            <ContextMenuItem @select.prevent="handleReplaceFromUrl(document)">替换为 URI 资源</ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem class="text-destructive" @select.prevent="handleRemove(document.uuid)">删除</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.action-menu {
  opacity: 0;
  transform: translateY(-4px);
  transition: all 150ms cubic-bezier(0.16, 1, 0.3, 1);
}

.list-item:hover .action-menu,
.card-item:hover .action-menu,
.list-item:focus-within .action-menu,
.card-item:focus-within .action-menu {
  opacity: 1;
  transform: translateY(0);
}

.doc-layout-enter-active {
  transition:
    opacity 200ms cubic-bezier(0.16, 1, 0.3, 1),
    transform 200ms cubic-bezier(0.16, 1, 0.3, 1);
}

.doc-layout-leave-active {
  transition:
    opacity 100ms cubic-bezier(0.4, 0, 1, 1),
    transform 100ms cubic-bezier(0.4, 0, 1, 1);
}

.doc-layout-enter-from {
  opacity: 0;
  transform: translateY(-4px);
}

.doc-layout-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

.card-container {
  container-type: inline-size;
}

@container (max-width: 280px) {
  .card-metadata {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
