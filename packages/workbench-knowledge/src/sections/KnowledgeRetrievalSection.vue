<script setup lang="ts">
import { computed, ref } from 'vue'
import { Badge } from '@repo/ui-shadcn/components/ui/badge'
import { Button } from '@repo/ui-shadcn/components/ui/button'
import { Collapsible, CollapsibleContent } from '@repo/ui-shadcn/components/ui/collapsible'
import { Input } from '@repo/ui-shadcn/components/ui/input'
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@repo/ui-shadcn/components/ui/item'
import { Label } from '@repo/ui-shadcn/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui-shadcn/components/ui/select'
import { Slider } from '@repo/ui-shadcn/components/ui/slider'
import { Switch } from '@repo/ui-shadcn/components/ui/switch'
import { Textarea } from '@repo/ui-shadcn/components/ui/textarea'
import type {
  KnowledgeRagConfig,
  KnowledgeSearchRequest,
  KnowledgeSearchResult,
  KnowledgeSearchStrategy,
} from '../types/knowledge-ide'

const props = withDefaults(defineProps<{
  runningSearch?: boolean
  searchResult?: KnowledgeSearchResult | null
  searchErrorMessage?: string | null
}>(), {
  runningSearch: false,
  searchResult: null,
  searchErrorMessage: null,
})

const emit = defineEmits<{
  (event: 'run-search', payload: KnowledgeSearchRequest): void
}>()

const query = ref('')
const rewriteModel = ref('gpt-4o-mini')
const rerankModel = ref('bge-reranker-v2-m3')
const config = ref<KnowledgeRagConfig>({
  max_recall_num: 5,
  min_match_score: 0.5,
  search_strategy: 'hybrid',
  query_rewrite: false,
  result_rerank: false,
})

const strategyOptions: Array<{ value: KnowledgeSearchStrategy; label: string; description: string }> = [
  { value: 'hybrid', label: 'Hybrid', description: '向量与关键词融合召回。' },
  { value: 'semantic', label: 'Vector', description: '仅依赖向量语义检索。' },
  { value: 'keyword', label: 'Keyword', description: '仅依赖关键词匹配。' },
]

const findStrategyOption = (value: unknown) => {
  const normalized = String(value || '').toLowerCase()
  return strategyOptions.find(item => item.value === normalized)
}

const selectedStrategyOption = computed(() => findStrategyOption(config.value.search_strategy))

const canRun = computed(() => query.value.trim().length > 0 && !props.runningSearch)

const parseNumber = (value: unknown): number | null => {
  const raw = String(value ?? '').trim()
  if (!raw) {
    return null
  }
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

const clampTopK = (value: number): number => {
  return Math.max(1, Math.min(20, Math.round(value)))
}

const clampScore = (value: number): number => {
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

const toSliderValues = (value: unknown): number[] => {
  if (!Array.isArray(value)) {
    return []
  }
  return value.map(item => Number(item)).filter(Number.isFinite)
}

const run = (): void => {
  if (!canRun.value) {
    return
  }
  emit('run-search', {
    query: query.value.trim(),
    config: {
      ...config.value,
      max_recall_num: clampTopK(config.value.max_recall_num),
      min_match_score: clampScore(config.value.min_match_score),
    },
  })
}

const handleStrategyChange = (value: unknown): void => {
  const normalized = String(value || '').toLowerCase()
  if (normalized === 'keyword' || normalized === 'semantic' || normalized === 'hybrid') {
    config.value.search_strategy = normalized
  }
}

const handleTopKSlider = (value: unknown): void => {
  const next = toSliderValues(value)[0]
  if (typeof next === 'number') {
    config.value.max_recall_num = clampTopK(next)
  }
}

const handleTopKInput = (value: unknown): void => {
  const parsed = parseNumber(value)
  if (parsed === null) {
    return
  }
  config.value.max_recall_num = clampTopK(parsed)
}

const handleScoreSlider = (value: unknown): void => {
  const next = toSliderValues(value)[0]
  if (typeof next === 'number') {
    config.value.min_match_score = clampScore(next)
  }
}

const handleScoreInput = (value: unknown): void => {
  const parsed = parseNumber(value)
  if (parsed === null) {
    return
  }
  config.value.min_match_score = clampScore(parsed)
}

const handleRewriteModelChange = (value: unknown): void => {
  rewriteModel.value = String(value || '')
}

const handleRerankModelChange = (value: unknown): void => {
  rerankModel.value = String(value || '')
}
</script>

<template>
  <section class="grid h-full min-h-0 grid-cols-1 gap-3 xl:grid-cols-[320px_minmax(0,1fr)]">
    <aside class="space-y-0 bg-card/60 p-4">
      <h3 class="text-sm font-semibold">检索测试</h3>

      <div class="border-b border-border/50 py-4">
        <div class="space-y-2">
          <Label for="knowledge-search-query">Query</Label>
          <Textarea
            id="knowledge-search-query"
            v-model="query"
            class="min-h-24"
            placeholder="输入检索问题，例如：如何配置 API Key？"
          />
        </div>
      </div>

      <div class="border-b border-border/50 py-4">
        <div class="space-y-2">
          <div>
            <p class="text-sm font-medium">检索策略</p>
            <p class="text-xs text-muted-foreground">选择召回方式。</p>
          </div>
          <Select
            :model-value="config.search_strategy"
            @update:model-value="handleStrategyChange"
          >
            <SelectTrigger class="h-auto! w-72">
              <SelectValue placeholder="选择检索策略">
                <Item
                  v-if="selectedStrategyOption"
                  class="w-full border-0 bg-transparent p-0"
                >
                  <ItemContent class="gap-0">
                    <ItemTitle>{{ selectedStrategyOption.label }}</ItemTitle>
                    <ItemDescription class="line-clamp-1 text-xs">
                      {{ selectedStrategyOption.description }}
                    </ItemDescription>
                  </ItemContent>
                </Item>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="item in strategyOptions" :key="item.value" :value="item.value">
                <Item class="w-full border-0 bg-transparent p-0">
                  <ItemContent class="gap-0">
                    <ItemTitle>{{ item.label }}</ItemTitle>
                    <ItemDescription class="line-clamp-1 text-xs">
                      {{ item.description }}
                    </ItemDescription>
                  </ItemContent>
                </Item>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div class="border-b border-border/50 py-4">
        <div class="space-y-2">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm font-medium">Top K</p>
            <Input
              :model-value="String(config.max_recall_num)"
              class="h-8 w-[60px] text-center tabular-nums"
              inputmode="numeric"
              @update:model-value="handleTopKInput"
            />
          </div>
          <Slider
            :model-value="[config.max_recall_num]"
            :min="1"
            :max="20"
            :step="1"
            @update:model-value="handleTopKSlider"
          />
        </div>
      </div>

      <div class="border-b border-border/50 py-4">
        <div class="space-y-2">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm font-medium">最低分数阈值</p>
            <Input
              :model-value="config.min_match_score.toFixed(2)"
              class="h-8 w-[60px] text-center tabular-nums"
              inputmode="decimal"
              @update:model-value="handleScoreInput"
            />
          </div>
          <Slider
            :model-value="[config.min_match_score]"
            :min="0"
            :max="1"
            :step="0.01"
            @update:model-value="handleScoreSlider"
          />
        </div>
      </div>

      <div class="border-b border-border/50 py-4">
        <div class="flex items-center justify-between gap-2">
          <div>
            <p class="text-sm font-medium">查询改写</p>
            <p class="text-xs text-muted-foreground">开启后先进行 query rewrite。</p>
          </div>
          <Switch
            :model-value="config.query_rewrite"
            @update:model-value="(value) => (config.query_rewrite = Boolean(value))"
          />
        </div>
        <Collapsible :open="config.query_rewrite">
          <CollapsibleContent class="overflow-hidden pt-3 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-200">
            <div class="space-y-2 rounded-md border bg-background p-3">
              <Label>改写模型</Label>
              <Select :model-value="rewriteModel" @update:model-value="handleRewriteModelChange">
                <SelectTrigger>
                  <SelectValue placeholder="选择改写模型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4o-mini">gpt-4o-mini</SelectItem>
                  <SelectItem value="qwen3-32b">qwen3-32b</SelectItem>
                  <SelectItem value="deepseek-v3">deepseek-v3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <div class="py-4">
        <div class="flex items-center justify-between gap-2">
          <div>
            <p class="text-sm font-medium">结果重排</p>
            <p class="text-xs text-muted-foreground">开启后对召回结果进行重排。</p>
          </div>
          <Switch
            :model-value="config.result_rerank"
            @update:model-value="(value) => (config.result_rerank = Boolean(value))"
          />
        </div>
        <Collapsible :open="config.result_rerank">
          <CollapsibleContent class="overflow-hidden pt-3 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-200">
            <div class="space-y-2 rounded-md border bg-background p-3">
              <Label>重排模型</Label>
              <Select :model-value="rerankModel" @update:model-value="handleRerankModelChange">
                <SelectTrigger>
                  <SelectValue placeholder="选择重排模型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bge-reranker-v2-m3">bge-reranker-v2-m3</SelectItem>
                  <SelectItem value="bge-reranker-large">bge-reranker-large</SelectItem>
                  <SelectItem value="gte-reranker-base">gte-reranker-base</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <Button class="mt-1 w-full" :disabled="!canRun" @click="run">
        {{ runningSearch ? '检索中...' : '执行检索' }}
      </Button>
    </aside>

    <section class="min-h-0 flex flex-col border-l p-4">
      <div class="flex items-center justify-between pb-4">
        <h4 class="text-sm font-semibold">召回结果</h4>
        <Badge variant="outline">{{ searchResult?.chunks.length || 0 }} 条</Badge>
      </div>

      <p v-if="searchErrorMessage" class="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive">
        {{ searchErrorMessage }}
      </p>

      <div
        v-else-if="runningSearch"
        class="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground"
      >
        正在执行检索，请稍候...
      </div>

      <div
        v-else-if="!searchResult || !searchResult.chunks.length"
        class="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground"
      >
        请输入 query 并执行检索，结果将展示在这里。
      </div>

      <div v-else class="min-h-0 flex-1 space-y-2 overflow-y-auto">
        <article
          v-for="chunk in searchResult.chunks"
          :key="chunk.uuid"
          class="rounded-md border p-3"
        >
          <div class="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span class="truncate">{{ chunk.uuid }}</span>
            <Badge variant="secondary">Score {{ chunk.score.toFixed(4) }}</Badge>
          </div>
          <p class="whitespace-pre-wrap break-words text-sm">{{ chunk.content }}</p>
        </article>
      </div>
    </section>
  </section>
</template>
