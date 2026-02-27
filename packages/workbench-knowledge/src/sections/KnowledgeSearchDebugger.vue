<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Alert, AlertDescription, AlertTitle } from '@repo/ui-shadcn/components/ui/alert'
import { Badge } from '@repo/ui-shadcn/components/ui/badge'
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
import { Switch } from '@repo/ui-shadcn/components/ui/switch'
import { Textarea } from '@repo/ui-shadcn/components/ui/textarea'
import type {
  KnowledgeRagConfig,
  KnowledgeSearchRequest,
  KnowledgeSearchResult,
  KnowledgeSearchStrategy,
} from '../types/knowledge-ide'

const props = withDefaults(
  defineProps<{
    running?: boolean
    result?: KnowledgeSearchResult | null
    errorMessage?: string | null
  }>(),
  {
    running: false,
    result: null,
    errorMessage: null,
  },
)

const emit = defineEmits<{
  (event: 'run-search', payload: KnowledgeSearchRequest): void
}>()
const { t } = useI18n()

const queryText = ref('')
const ragConfig = ref<KnowledgeRagConfig>({
  max_recall_num: 5,
  min_match_score: 0.5,
  search_strategy: 'hybrid',
  query_rewrite: false,
  result_rerank: false,
})

const searchStrategies: Array<{ label: string; value: KnowledgeSearchStrategy }> = [
  { label: t('platform.workbench.knowledge.searchStrategies.hybrid'), value: 'hybrid' },
  { label: t('platform.workbench.knowledge.searchStrategies.semantic'), value: 'semantic' },
  { label: t('platform.workbench.knowledge.searchStrategies.keyword'), value: 'keyword' },
]

const canSubmit = computed(() => {
  return !props.running && queryText.value.trim().length > 0
})

const clampInteger = (value: number, fallback: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) {
    return fallback
  }
  return Math.max(min, Math.min(max, Math.round(value)))
}

const clampNumber = (value: number, fallback: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) {
    return fallback
  }
  return Math.max(min, Math.min(max, value))
}

const handleSubmit = (): void => {
  const query = queryText.value.trim()
  if (!query) {
    return
  }
  emit('run-search', {
    query,
    config: {
      ...ragConfig.value,
      max_recall_num: clampInteger(ragConfig.value.max_recall_num, 5, 1, 20),
      min_match_score: clampNumber(ragConfig.value.min_match_score, 0.5, 0, 1),
    },
  })
}

const formatScore = (value: number): string => {
  if (!Number.isFinite(value)) {
    return '0'
  }
  return value.toFixed(4)
}

const formatContext = (context: Record<string, unknown> | null | undefined): string => {
  if (!context) {
    return '{}'
  }
  try {
    return JSON.stringify(context, null, 2)
  } catch {
    return '{}'
  }
}
</script>

<template>
  <Card class="min-h-[300px]">
    <CardHeader class="pb-3">
      <CardTitle class="text-base">{{ t('platform.workbench.knowledge.debuggerTitle') }}</CardTitle>
    </CardHeader>
    <CardContent class="space-y-3">
      <div class="space-y-2">
        <Label class="text-xs text-muted-foreground">{{ t('platform.workbench.knowledge.query') }}</Label>
        <Textarea
          v-model="queryText"
          class="min-h-20 resize-none"
          :placeholder="t('platform.workbench.knowledge.queryPlaceholder')"
        />
      </div>

      <div class="grid gap-3 md:grid-cols-2">
        <div class="space-y-2">
          <Label class="text-xs text-muted-foreground">{{ t('platform.workbench.knowledge.searchStrategy') }}</Label>
          <Select v-model="ragConfig.search_strategy">
            <SelectTrigger>
              <SelectValue :placeholder="t('platform.workbench.knowledge.searchStrategyPlaceholder')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="item in searchStrategies" :key="item.value" :value="item.value">
                {{ item.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-2">
          <Label class="text-xs text-muted-foreground">{{ t('platform.workbench.knowledge.maxRecall') }}</Label>
          <Input
            :model-value="ragConfig.max_recall_num"
            type="number"
            min="1"
            max="20"
            @update:model-value="ragConfig.max_recall_num = Number($event)"
          />
        </div>

        <div class="space-y-2">
          <Label class="text-xs text-muted-foreground">{{ t('platform.workbench.knowledge.minScore') }}</Label>
          <Input
            :model-value="ragConfig.min_match_score"
            type="number"
            min="0"
            max="1"
            step="0.01"
            @update:model-value="ragConfig.min_match_score = Number($event)"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-2">
            <Label class="text-xs text-muted-foreground">{{ t('platform.workbench.knowledge.queryRewrite') }}</Label>
            <Switch :model-value="ragConfig.query_rewrite" @update:model-value="ragConfig.query_rewrite = Boolean($event)" />
          </div>
          <div class="space-y-2">
            <Label class="text-xs text-muted-foreground">{{ t('platform.workbench.knowledge.resultRerank') }}</Label>
            <Switch :model-value="ragConfig.result_rerank" @update:model-value="ragConfig.result_rerank = Boolean($event)" />
          </div>
        </div>
      </div>

      <Button :disabled="!canSubmit" @click="handleSubmit">
        {{ running ? t('platform.workbench.knowledge.searching') : t('platform.workbench.knowledge.runRetrieval') }}
      </Button>

      <Alert v-if="errorMessage" variant="destructive">
        <AlertTitle>{{ t('platform.workbench.knowledge.executionFailed') }}</AlertTitle>
        <AlertDescription>{{ errorMessage }}</AlertDescription>
      </Alert>

      <div v-if="result" class="space-y-2">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium">{{ t('platform.workbench.knowledge.resultChunks') }}</p>
          <Badge variant="outline">{{ result.chunks.length }}</Badge>
        </div>
        <div class="max-h-72 space-y-2 overflow-auto pr-1">
          <div
            v-for="chunk in result.chunks"
            :key="chunk.uuid"
            class="space-y-1 rounded-md border bg-muted/20 p-3"
          >
            <div class="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span class="truncate font-mono">{{ chunk.uuid }}</span>
              <Badge variant="secondary">{{ t('platform.workbench.knowledge.score', { value: formatScore(chunk.score) }) }}</Badge>
            </div>
            <p class="whitespace-pre-wrap break-words text-sm">{{ chunk.content }}</p>
            <details class="text-xs text-muted-foreground">
              <summary class="cursor-pointer">{{ t('platform.workbench.knowledge.context') }}</summary>
              <pre class="mt-1 whitespace-pre-wrap break-all rounded bg-muted/40 p-2">{{ formatContext(chunk.context) }}</pre>
            </details>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
