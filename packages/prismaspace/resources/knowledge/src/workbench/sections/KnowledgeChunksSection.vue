<script setup lang="ts">
import { computed } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@prismaspace/ui-shadcn/components/ui/pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@prismaspace/ui-shadcn/components/ui/select'
import { Skeleton } from '@prismaspace/ui-shadcn/components/ui/skeleton'
import type { KnowledgeChunkItem, KnowledgeDocumentItem } from '../types/knowledge-ide'
import KnowledgeChunkCard from '../components/KnowledgeChunkCard.vue'

const props = withDefaults(defineProps<{
  selectedDocument: KnowledgeDocumentItem | null
  chunks: KnowledgeChunkItem[]
  chunksTotal?: number
  chunksPage?: number
  chunksLimit?: number
  loadingChunks?: boolean
  chunksErrorMessage?: string | null
  updatingChunk?: boolean
}>(), {
  chunksTotal: 0,
  chunksPage: 1,
  chunksLimit: 20,
  loadingChunks: false,
  chunksErrorMessage: null,
  updatingChunk: false,
})

const emit = defineEmits<{
  (event: 'update-chunk', payload: { chunkUuid: string; content: string }): void
  (event: 'update:page', value: number): void
  (event: 'update:limit', value: number): void
}>()

const totalPages = computed(() => {
  const safeLimit = Math.max(1, props.chunksLimit)
  return Math.max(1, Math.ceil(props.chunksTotal / safeLimit))
})

const handlePageUpdate = (nextPage: number): void => {
  if (nextPage === props.chunksPage) {
    return
  }
  emit('update:page', nextPage)
}
</script>

<template>
  <section class="flex h-full min-h-0 flex-col">
    <div v-if="!selectedDocument" class="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
      左侧选择文档后展示解析分块。
    </div>

    <div v-else-if="loadingChunks" class="space-y-3">
      <Skeleton v-for="index in 4" :key="index" class="h-32 w-full rounded-lg" />
    </div>

    <div v-else-if="chunksErrorMessage" class="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
      {{ chunksErrorMessage }}
    </div>

    <div v-else-if="!chunks.length" class="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
      当前文档暂无可展示分块，可能仍在解析中或解析结果为空。
    </div>

    <div v-else class="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
      <KnowledgeChunkCard
        v-for="(chunk, index) in chunks"
        :key="chunk.uuid"
        :index="(chunksPage - 1) * chunksLimit + index"
        :chunk="chunk"
        :updating="updatingChunk"
        @update="emit('update-chunk', $event)"
      />
    </div>

    <div
      v-if="selectedDocument"
      class="flex items-center justify-between gap-2 border-t p-3"
    >
      <span class="text-xs text-muted-foreground">{{ chunksPage }} / {{ totalPages }}</span>
      <div class="flex items-center gap-2">
        <Pagination
          class="mx-0 w-auto"
          :page="chunksPage"
          :total="totalPages"
          :items-per-page="1"
          :sibling-count="1"
          show-edges
          @update:page="handlePageUpdate"
        >
          <PaginationContent v-slot="{ items }">
            <PaginationPrevious>
              <ChevronLeft class="size-4" />
            </PaginationPrevious>
            <template
              v-for="(item, index) in items"
              :key="`chunk-pagination-${index}-${item.type === 'page' ? item.value : 'ellipsis'}`"
            >
              <PaginationItem v-if="item.type === 'page'" :value="item.value" :is-active="item.value === chunksPage">
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
</template>
