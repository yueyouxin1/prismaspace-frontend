<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Badge } from '@repo/ui-shadcn/components/ui/badge'
import { Progress } from '@repo/ui-shadcn/components/ui/progress'
import type { KnowledgeDocumentStatus, KnowledgeTaskProgress } from '../types/knowledge-ide'

const props = withDefaults(
  defineProps<{
    status: KnowledgeDocumentStatus
    progress?: KnowledgeTaskProgress | null
    compact?: boolean
  }>(),
  {
    progress: null,
    compact: false,
  },
)
const { t } = useI18n()

const statusText = computed(() => {
  const status = String(props.status).toLowerCase()
  if (status === 'pending') {
    return t('platform.workbench.knowledge.status.pending')
  }
  if (status === 'uploading') {
    return t('platform.workbench.knowledge.status.uploading')
  }
  if (status === 'processing') {
    return t('platform.workbench.knowledge.status.processing')
  }
  if (status === 'completed') {
    return t('platform.workbench.knowledge.status.completed')
  }
  if (status === 'failed') {
    return t('platform.workbench.knowledge.status.failed')
  }
  return props.status
})

const statusVariant = computed<'default' | 'secondary' | 'outline' | 'destructive'>(() => {
  const status = String(props.status).toLowerCase()
  if (status === 'completed') {
    return 'default'
  }
  if (status === 'failed') {
    return 'destructive'
  }
  if (status === 'processing' || status === 'uploading') {
    return 'secondary'
  }
  return 'outline'
})

const progressPercent = computed(() => {
  if (!props.progress) {
    return 0
  }
  if (props.progress.total <= 0) {
    return props.progress.status === 'completed' ? 100 : 0
  }
  const value = (props.progress.progress / props.progress.total) * 100
  if (!Number.isFinite(value)) {
    return 0
  }
  return Math.max(0, Math.min(100, value))
})

const showProgress = computed(() => {
  if (!props.progress) {
    return false
  }
  const status = String(props.status).toLowerCase()
  return status === 'pending' || status === 'uploading' || status === 'processing'
})
</script>

<template>
  <div class="min-w-0 space-y-1">
    <div class="flex items-center gap-2">
      <Badge :variant="statusVariant">{{ statusText }}</Badge>
      <span v-if="progress && !compact" class="truncate text-xs text-muted-foreground">
        {{ progress.message }}
      </span>
    </div>
    <Progress v-if="showProgress" :model-value="progressPercent" class="h-1.5" />
    <p v-if="showProgress && progress && !compact" class="text-xs text-muted-foreground">
      {{ progress.progress }} / {{ progress.total }}
    </p>
    <p v-if="progress?.error" class="text-xs text-destructive">
      {{ progress.error }}
    </p>
  </div>
</template>
