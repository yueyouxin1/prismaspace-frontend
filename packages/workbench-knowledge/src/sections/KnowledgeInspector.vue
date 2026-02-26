<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Alert, AlertDescription, AlertTitle } from '@repo/ui-shadcn/components/ui/alert'
import { Button } from '@repo/ui-shadcn/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui-shadcn/components/ui/card'
import { Input } from '@repo/ui-shadcn/components/ui/input'
import { Label } from '@repo/ui-shadcn/components/ui/label'
import { Separator } from '@repo/ui-shadcn/components/ui/separator'
import { Textarea } from '@repo/ui-shadcn/components/ui/textarea'
import KnowledgeTaskStatusBadge from '../components/KnowledgeTaskStatusBadge.vue'
import type {
  KnowledgeDocumentItem,
  KnowledgeInstanceConfig,
  KnowledgeTaskProgress,
} from '../types/knowledge-ide'

const props = withDefaults(
  defineProps<{
    selectedDocument?: KnowledgeDocumentItem | null
    selectedTaskProgress?: KnowledgeTaskProgress | null
    config?: KnowledgeInstanceConfig | null
    loadingConfig?: boolean
    savingConfig?: boolean
  }>(),
  {
    selectedDocument: null,
    selectedTaskProgress: null,
    config: null,
    loadingConfig: false,
    savingConfig: false,
  },
)

const emit = defineEmits<{
  (event: 'save-config', payload: KnowledgeInstanceConfig): void
}>()

const parserName = ref('')
const allowedMimeTypesInput = ref('')
const parserParamsInput = ref('{}')
const chunkerPoliciesInput = ref('[]')
const formError = ref<string | null>(null)

const prettyJson = (value: unknown): string => {
  try {
    return JSON.stringify(value ?? {}, null, 2)
  } catch {
    return '{}'
  }
}

const applyConfig = (config: KnowledgeInstanceConfig | null | undefined): void => {
  parserName.value = config?.parser_policy?.parser_name ?? 'simple_parser_v1'
  allowedMimeTypesInput.value = (config?.parser_policy?.allowed_mime_types ?? []).join(', ')
  parserParamsInput.value = prettyJson(config?.parser_policy?.params ?? {})
  chunkerPoliciesInput.value = prettyJson(config?.chunker_policies ?? [])
  formError.value = null
}

watch(
  () => props.config,
  (nextConfig) => {
    applyConfig(nextConfig)
  },
  { immediate: true, deep: true },
)

const formatDateTime = (value?: string | null): string => {
  if (!value) {
    return '-'
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
    second: '2-digit',
    hour12: false,
  }).format(date)
}

const parseJsonRecord = (raw: string): Record<string, unknown> | null => {
  try {
    const value = JSON.parse(raw) as unknown
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null
    }
    return value as Record<string, unknown>
  } catch {
    return null
  }
}

const parseChunkerPolicies = (raw: string): KnowledgeInstanceConfig['chunker_policies'] | null => {
  try {
    const value = JSON.parse(raw) as unknown
    if (!Array.isArray(value)) {
      return null
    }
    const policies = value
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item))
      .map((item) => ({
        chunker_name: String(item.chunker_name ?? ''),
        params: item.params && typeof item.params === 'object' && !Array.isArray(item.params)
          ? (item.params as Record<string, unknown>)
          : {},
      }))
      .filter((item) => item.chunker_name.length > 0)
    return policies
  } catch {
    return null
  }
}

const canSave = computed(() => {
  return !props.loadingConfig && !props.savingConfig
})

const handleSaveConfig = (): void => {
  const parserParams = parseJsonRecord(parserParamsInput.value)
  if (!parserParams) {
    formError.value = 'Parser params must be a valid JSON object.'
    return
  }

  const chunkerPolicies = parseChunkerPolicies(chunkerPoliciesInput.value)
  if (!chunkerPolicies) {
    formError.value = 'Chunker policies must be a valid JSON array.'
    return
  }

  const mimeTypes = allowedMimeTypesInput.value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)

  formError.value = null
  emit('save-config', {
    parser_policy: {
      parser_name: parserName.value.trim() || 'simple_parser_v1',
      allowed_mime_types: mimeTypes,
      params: parserParams,
    },
    chunker_policies: chunkerPolicies,
  })
}
</script>

<template>
  <div class="space-y-4">
    <Card>
      <CardHeader class="pb-3">
        <CardTitle class="text-base">Inspector</CardTitle>
      </CardHeader>
      <CardContent class="space-y-3">
        <template v-if="selectedDocument">
          <div class="space-y-2">
            <p class="truncate text-sm font-medium">{{ selectedDocument.file_name }}</p>
            <KnowledgeTaskStatusBadge :status="selectedDocument.status" :progress="selectedTaskProgress" />
          </div>
          <Separator />
          <div class="space-y-1 text-xs text-muted-foreground">
            <p><span class="font-medium text-foreground">UUID:</span> <span class="font-mono">{{ selectedDocument.uuid }}</span></p>
            <p><span class="font-medium text-foreground">Source:</span> <span class="break-all">{{ selectedDocument.source_uri }}</span></p>
            <p><span class="font-medium text-foreground">Type:</span> {{ selectedDocument.file_type || '-' }}</p>
            <p><span class="font-medium text-foreground">Size:</span> {{ selectedDocument.file_size ?? '-' }}</p>
            <p><span class="font-medium text-foreground">Chunks:</span> {{ selectedDocument.chunk_count }}</p>
            <p><span class="font-medium text-foreground">Created:</span> {{ formatDateTime(selectedDocument.created_at) }}</p>
          </div>
          <p v-if="selectedDocument.error_message" class="text-xs text-destructive">
            {{ selectedDocument.error_message }}
          </p>
        </template>
        <p v-else class="text-sm text-muted-foreground">Select a document to inspect details.</p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="pb-3">
        <CardTitle class="text-base">Instance Config</CardTitle>
      </CardHeader>
      <CardContent class="space-y-3">
        <div class="space-y-2">
          <Label class="text-xs text-muted-foreground">parser_policy.parser_name</Label>
          <Input v-model="parserName" />
        </div>

        <div class="space-y-2">
          <Label class="text-xs text-muted-foreground">parser_policy.allowed_mime_types (comma separated)</Label>
          <Textarea v-model="allowedMimeTypesInput" class="min-h-16 resize-y" />
        </div>

        <div class="space-y-2">
          <Label class="text-xs text-muted-foreground">parser_policy.params (JSON object)</Label>
          <Textarea v-model="parserParamsInput" class="min-h-28 resize-y font-mono text-xs" />
        </div>

        <div class="space-y-2">
          <Label class="text-xs text-muted-foreground">chunker_policies (JSON array)</Label>
          <Textarea v-model="chunkerPoliciesInput" class="min-h-28 resize-y font-mono text-xs" />
        </div>

        <Alert v-if="formError" variant="destructive">
          <AlertTitle>Config Validation Error</AlertTitle>
          <AlertDescription>{{ formError }}</AlertDescription>
        </Alert>

        <Button :disabled="!canSave" @click="handleSaveConfig">
          {{ savingConfig ? 'Saving...' : 'Save Instance Config' }}
        </Button>
      </CardContent>
    </Card>
  </div>
</template>
