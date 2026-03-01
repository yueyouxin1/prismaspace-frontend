<script setup lang="ts">
import { ref, watch } from 'vue'
import { Button } from '@repo/ui-shadcn/components/ui/button'
import { Input } from '@repo/ui-shadcn/components/ui/input'
import { Label } from '@repo/ui-shadcn/components/ui/label'
import { Textarea } from '@repo/ui-shadcn/components/ui/textarea'
import type { KnowledgeInstanceConfig } from '../types/knowledge-ide'

const props = withDefaults(defineProps<{
  config: KnowledgeInstanceConfig | null
  loadingConfig?: boolean
  savingConfig?: boolean
  embedded?: boolean
}>(), {
  loadingConfig: false,
  savingConfig: false,
  embedded: false,
})

const emit = defineEmits<{
  (event: 'save-config', config: KnowledgeInstanceConfig): void
}>()

const parserName = ref('simple_parser_v1')
const parserMimeTypes = ref('text/plain,application/pdf')
const parserParamsText = ref('{\n  "tika_url": ""\n}')
const chunkerPoliciesText = ref('[\n  {\n    "chunker_name": "simple_chunker_v1",\n    "params": {\n      "chunk_size": 500\n    }\n  }\n]')
const parseError = ref('')

const applyConfig = (config: KnowledgeInstanceConfig | null): void => {
  if (!config) {
    return
  }
  parserName.value = config.parser_policy?.parser_name || 'simple_parser_v1'
  parserMimeTypes.value = (config.parser_policy?.allowed_mime_types || []).join(',')
  parserParamsText.value = JSON.stringify(config.parser_policy?.params || {}, null, 2)
  chunkerPoliciesText.value = JSON.stringify(config.chunker_policies || [], null, 2)
}

watch(
  () => props.config,
  (config) => {
    applyConfig(config)
  },
  { immediate: true, deep: true },
)

const save = (): void => {
  parseError.value = ''
  try {
    const parserParams = JSON.parse(parserParamsText.value || '{}') as Record<string, unknown>
    const chunkerPolicies = JSON.parse(chunkerPoliciesText.value || '[]') as Array<{ chunker_name: string; params?: Record<string, unknown> }>
    const normalizedChunkers = chunkerPolicies.map((item) => ({
      chunker_name: String(item.chunker_name || '').trim(),
      params: item.params && typeof item.params === 'object' ? item.params : {},
    })).filter(item => item.chunker_name)
    if (!normalizedChunkers.length) {
      parseError.value = '至少需要一个 chunker policy。'
      return
    }
    emit('save-config', {
      parser_policy: {
        parser_name: parserName.value.trim() || 'simple_parser_v1',
        allowed_mime_types: parserMimeTypes.value.split(',').map(item => item.trim()).filter(Boolean),
        params: parserParams,
      },
      chunker_policies: normalizedChunkers,
    })
  } catch (error) {
    parseError.value = error instanceof Error ? error.message : '配置 JSON 解析失败。'
  }
}
</script>

<template>
  <section :class="props.embedded ? 'space-y-3' : 'space-y-3 rounded-lg border p-3'">
    <div class="flex items-center justify-between">
      <div v-if="!props.embedded">
        <h3 class="text-sm font-semibold">知识库配置</h3>
        <p class="text-xs text-muted-foreground">管理 parser 与 chunker 策略，保存后立即生效。</p>
      </div>
      <Button :disabled="loadingConfig || savingConfig" @click="save">
        {{ savingConfig ? '保存中...' : '保存配置' }}
      </Button>
    </div>

    <div v-if="loadingConfig" class="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
      正在加载配置...
    </div>

    <template v-else>
      <div class="grid gap-3 md:grid-cols-2">
        <div class="space-y-2">
          <Label for="knowledge-parser-name">Parser 名称</Label>
          <Input id="knowledge-parser-name" v-model="parserName" />
        </div>
        <div class="space-y-2">
          <Label for="knowledge-parser-mimes">允许 MIME（逗号分隔）</Label>
          <Input id="knowledge-parser-mimes" v-model="parserMimeTypes" />
        </div>
      </div>

      <div class="space-y-2">
        <Label for="knowledge-parser-params">Parser Params（JSON）</Label>
        <Textarea id="knowledge-parser-params" v-model="parserParamsText" class="min-h-32 font-mono text-xs" />
      </div>

      <div class="space-y-2">
        <Label for="knowledge-chunker-policies">Chunker Policies（JSON）</Label>
        <Textarea id="knowledge-chunker-policies" v-model="chunkerPoliciesText" class="min-h-40 font-mono text-xs" />
      </div>

      <p v-if="parseError" class="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive">
        {{ parseError }}
      </p>
    </template>
  </section>
</template>
