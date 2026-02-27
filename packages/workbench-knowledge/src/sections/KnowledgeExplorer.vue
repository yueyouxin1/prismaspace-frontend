<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@repo/ui-shadcn/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui-shadcn/components/ui/card'
import { Input } from '@repo/ui-shadcn/components/ui/input'
import { Label } from '@repo/ui-shadcn/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui-shadcn/components/ui/select'
import { Separator } from '@repo/ui-shadcn/components/ui/separator'
import type { KnowledgeDocumentStatus, KnowledgeExplorerSummary } from '../types/knowledge-ide'

const props = withDefaults(
  defineProps<{
    summary: KnowledgeExplorerSummary
    statusFilter: KnowledgeDocumentStatus | 'all'
    keyword: string
    adding?: boolean
    refreshing?: boolean
  }>(),
  {
    adding: false,
    refreshing: false,
  },
)

const emit = defineEmits<{
  (event: 'add-document', payload: { sourceUri: string; fileName?: string }): void
  (event: 'update:status-filter', value: KnowledgeDocumentStatus | 'all'): void
  (event: 'update:keyword', value: string): void
  (event: 'refresh'): void
}>()
const { t } = useI18n()

const sourceUri = ref('')
const fileName = ref('')

const statusOptions: Array<{ label: string; value: KnowledgeDocumentStatus | 'all' }> = [
  { label: t('platform.workbench.knowledge.filters.all'), value: 'all' },
  { label: t('platform.workbench.knowledge.status.pending'), value: 'pending' },
  { label: t('platform.workbench.knowledge.status.uploading'), value: 'uploading' },
  { label: t('platform.workbench.knowledge.status.processing'), value: 'processing' },
  { label: t('platform.workbench.knowledge.status.completed'), value: 'completed' },
  { label: t('platform.workbench.knowledge.status.failed'), value: 'failed' },
]

const canSubmit = computed(() => {
  return !props.adding && sourceUri.value.trim().length > 0
})

const handleSubmit = (): void => {
  const uri = sourceUri.value.trim()
  if (!uri) {
    return
  }
  emit('add-document', {
    sourceUri: uri,
    fileName: fileName.value.trim() || undefined,
  })
  sourceUri.value = ''
  fileName.value = ''
}
</script>

<template>
  <Card class="min-h-[540px]">
    <CardHeader class="pb-3">
      <CardTitle class="text-base">{{ t('platform.workbench.knowledge.explorer.title') }}</CardTitle>
    </CardHeader>
    <CardContent class="space-y-4">
      <div class="grid grid-cols-1 gap-2">
        <div class="rounded-md border bg-muted/30 px-3 py-2">
          <p class="text-xs text-muted-foreground">{{ t('platform.workbench.knowledge.metrics.total') }}</p>
          <p class="text-lg font-semibold">{{ summary.total }}</p>
        </div>
        <div class="rounded-md border bg-muted/30 px-3 py-2">
          <p class="text-xs text-muted-foreground">{{ t('platform.workbench.knowledge.metrics.processing') }}</p>
          <p class="text-lg font-semibold">{{ summary.processing }}</p>
        </div>
        <div class="rounded-md border bg-muted/30 px-3 py-2">
          <p class="text-xs text-muted-foreground">{{ t('platform.workbench.knowledge.metrics.failed') }}</p>
          <p class="text-lg font-semibold text-destructive">{{ summary.failed }}</p>
        </div>
      </div>

      <Separator />

      <div class="space-y-2">
        <Label class="text-xs text-muted-foreground">{{ t('platform.workbench.knowledge.filters.status') }}</Label>
        <Select :model-value="statusFilter" @update:model-value="emit('update:status-filter', ($event as KnowledgeDocumentStatus | 'all'))">
          <SelectTrigger>
            <SelectValue :placeholder="t('platform.workbench.knowledge.filters.statusPlaceholder')" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="option in statusOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="space-y-2">
        <Label class="text-xs text-muted-foreground">{{ t('platform.workbench.knowledge.filters.keyword') }}</Label>
        <Input :model-value="keyword" :placeholder="t('platform.workbench.knowledge.filters.keywordPlaceholder')" @update:model-value="emit('update:keyword', String($event ?? ''))" />
      </div>

      <div class="flex items-center gap-2">
        <Button class="flex-1" variant="outline" :disabled="refreshing" @click="emit('refresh')">
          {{ refreshing ? t('platform.workbench.knowledge.refreshing') : t('common.refresh') }}
        </Button>
      </div>

      <Separator />

      <div class="space-y-2">
        <Label class="text-xs text-muted-foreground">{{ t('platform.workbench.knowledge.addDocument') }}</Label>
        <Input v-model="sourceUri" placeholder="source_uri" />
        <Input v-model="fileName" :placeholder="t('platform.workbench.knowledge.fileNameOptional')" />
        <Button class="w-full" :disabled="!canSubmit" @click="handleSubmit">
          {{ adding ? t('platform.workbench.knowledge.submitting') : t('platform.workbench.knowledge.submitProcessing') }}
        </Button>
      </div>
    </CardContent>
  </Card>
</template>
