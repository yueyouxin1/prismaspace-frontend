<script setup lang="ts">
import { Button } from '@repo/ui-shadcn/components/ui/button'
import { Skeleton } from '@repo/ui-shadcn/components/ui/skeleton'
import type { KnowledgeChunkItem, KnowledgeDocumentItem } from '../types/knowledge-ide'
import KnowledgeChunkCard from '../components/KnowledgeChunkCard.vue'

withDefaults(defineProps<{
  selectedDocument: KnowledgeDocumentItem | null
  chunks: KnowledgeChunkItem[]
  loadingChunks?: boolean
  chunksErrorMessage?: string | null
  updatingChunk?: boolean
}>(), {
  loadingChunks: false,
  chunksErrorMessage: null,
  updatingChunk: false,
})

const emit = defineEmits<{
  (event: 'update-chunk', payload: { chunkUuid: string; content: string }): void
  (event: 'refresh-chunks'): void
}>()
</script>

<template>
  <section class="flex h-full min-h-0 flex-col">
    <header class="mb-3 flex items-center justify-between">
      <div>
        <h3 class="text-sm font-semibold">分块管理</h3>
        <p class="text-xs text-muted-foreground">
          {{ selectedDocument ? selectedDocument.file_name : '请先选择文档' }}
        </p>
      </div>
      <Button size="sm" variant="outline" @click="emit('refresh-chunks')">刷新分块</Button>
    </header>

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

    <div v-else class="space-y-3 overflow-y-auto pr-1">
      <KnowledgeChunkCard
        v-for="(chunk, index) in chunks"
        :key="chunk.uuid"
        :index="index"
        :chunk="chunk"
        :updating="updatingChunk"
        @update="emit('update-chunk', $event)"
      />
    </div>
  </section>
</template>
