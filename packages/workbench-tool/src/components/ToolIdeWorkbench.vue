<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  ParamSchemaProfessionalEditor,
  ParamSchemaRegularEditor,
} from '@repo/editor'
import { createToolRunDefaults } from '../adapters/tool-schema-adapter'
import { useToolIdeDraft } from '../composables/use-tool-ide-draft'
import type {
  ToolExecutePayload,
  ToolHttpMethod,
  ToolIdeSavePayload,
  ToolIdeSeed,
  ToolRunFeedback,
  ToolRunField,
} from '../types/tool-ide'
import { Alert, AlertDescription, AlertTitle } from '@repo/ui-shadcn/components/ui/alert'
import { Badge } from '@repo/ui-shadcn/components/ui/badge'
import { Button } from '@repo/ui-shadcn/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui-shadcn/components/ui/card'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/ui-shadcn/components/ui/tabs'
import { Textarea } from '@repo/ui-shadcn/components/ui/textarea'

type RunMode = 'form' | 'json'

const props = withDefaults(
  defineProps<{
    seed: ToolIdeSeed | null
    loading?: boolean
    saving?: boolean
    running?: boolean
    workspaceInstanceUuid?: string | null
    latestPublishedInstanceUuid?: string | null
    runFeedback?: ToolRunFeedback | null
  }>(),
  {
    loading: false,
    saving: false,
    running: false,
    workspaceInstanceUuid: null,
    latestPublishedInstanceUuid: null,
    runFeedback: null,
  },
)

const emit = defineEmits<{
  (event: 'save', payload: ToolIdeSavePayload): void
  (event: 'execute', payload: ToolExecutePayload): void
  (event: 'dirty-change', value: boolean): void
}>()

const draft = useToolIdeDraft()
const roleOptions: string[] = ['http.path', 'http.query', 'http.body']
const toolMethods: ToolHttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

const runMode = ref<RunMode>('form')
const runFormValues = ref<Record<string, unknown>>({})
const runJsonText = ref('{\n}')
const runError = ref('')
const returnRawResponse = ref(false)
const hasAppliedSeed = ref(false)

const inputEditorState = computed(() => draft.inputEditor.state.value)
const outputEditorState = computed(() => draft.outputEditor.state.value)
const inputSchemaErrors = computed(() => draft.inputValidation.value.errors)
const outputSchemaErrors = computed(() => draft.outputValidation.value.errors)
const schemaErrorCount = computed(() => inputSchemaErrors.value.length + outputSchemaErrors.value.length)
const runFields = computed(() => draft.runFields.value)

const nameError = computed(() => {
  const trimmed = draft.name.value.trim()
  if (!trimmed) {
    return '请输入工具名称。'
  }
  if (trimmed.length > 100) {
    return '工具名称不能超过 100 个字符。'
  }
  return ''
})

const descriptionError = computed(() => {
  const trimmed = draft.description.value.trim()
  if (!trimmed) {
    return '请输入工具描述。'
  }
  if (trimmed.length > 600) {
    return '工具描述不能超过 600 个字符。'
  }
  return ''
})

const urlError = computed(() => {
  const trimmed = draft.url.value.trim()
  if (!trimmed) {
    return ''
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    return '工具路径需以 http:// 或 https:// 开头。'
  }
  return ''
})

const isSaveDisabled = computed(() => {
  return props.loading || props.saving || !props.seed
})

const runFeedbackText = computed(() => {
  if (!props.runFeedback?.payload) {
    return ''
  }
  try {
    return JSON.stringify(props.runFeedback.payload, null, 2)
  } catch {
    return String(props.runFeedback.payload)
  }
})

const buildRunJsonFromForm = (fields: ToolRunField[], source: Record<string, unknown>): string => {
  const payload: Record<string, unknown> = {}
  fields.forEach((field) => {
    payload[field.name] = source[field.name]
  })
  try {
    return JSON.stringify(payload, null, 2)
  } catch {
    return '{\n}'
  }
}

const syncRunDefaults = (fields: ToolRunField[]): void => {
  const defaults = createToolRunDefaults(fields)
  const merged: Record<string, unknown> = {}
  fields.forEach((field) => {
    if (field.name in runFormValues.value) {
      merged[field.name] = runFormValues.value[field.name]
      return
    }
    merged[field.name] = defaults[field.name]
  })
  runFormValues.value = merged
  runJsonText.value = buildRunJsonFromForm(fields, merged)
}

const parseRunFieldValue = (
  field: ToolRunField,
  rawValue: unknown,
): { hasValue: boolean; value?: unknown; errorMessage?: string } => {
  if (field.type === 'boolean') {
    if (rawValue === undefined || rawValue === null || rawValue === '') {
      if (field.required) {
        return { hasValue: false, errorMessage: `参数 ${field.name} 为必填。` }
      }
      return { hasValue: false }
    }
    return { hasValue: true, value: Boolean(rawValue) }
  }

  if (field.type === 'number' || field.type === 'integer') {
    const valueText = String(rawValue ?? '').trim()
    if (!valueText) {
      if (field.required) {
        return { hasValue: false, errorMessage: `参数 ${field.name} 为必填。` }
      }
      return { hasValue: false }
    }
    const parsedNumber = Number(valueText)
    if (Number.isNaN(parsedNumber)) {
      return { hasValue: false, errorMessage: `参数 ${field.name} 需要是数字。` }
    }
    if (field.type === 'integer' && !Number.isInteger(parsedNumber)) {
      return { hasValue: false, errorMessage: `参数 ${field.name} 需要是整数。` }
    }
    return { hasValue: true, value: parsedNumber }
  }

  if (field.type === 'object' || field.type === 'array') {
    const valueText = String(rawValue ?? '').trim()
    if (!valueText) {
      if (field.required) {
        return { hasValue: false, errorMessage: `参数 ${field.name} 为必填。` }
      }
      return { hasValue: false }
    }
    try {
      const parsed = JSON.parse(valueText)
      if (field.type === 'object' && (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))) {
        return { hasValue: false, errorMessage: `参数 ${field.name} 需要是 JSON 对象。` }
      }
      if (field.type === 'array' && !Array.isArray(parsed)) {
        return { hasValue: false, errorMessage: `参数 ${field.name} 需要是 JSON 数组。` }
      }
      return { hasValue: true, value: parsed }
    } catch {
      return { hasValue: false, errorMessage: `参数 ${field.name} 不是合法 JSON。` }
    }
  }

  const valueText = String(rawValue ?? '').trim()
  if (!valueText) {
    if (field.required) {
      return { hasValue: false, errorMessage: `参数 ${field.name} 为必填。` }
    }
    return { hasValue: false }
  }
  return { hasValue: true, value: valueText }
}

const buildFormRunPayload = (): ToolExecutePayload | null => {
  const inputs: Record<string, unknown> = {}
  for (const field of runFields.value) {
    const parsed = parseRunFieldValue(field, runFormValues.value[field.name])
    if (parsed.errorMessage) {
      runError.value = parsed.errorMessage
      return null
    }
    if (parsed.hasValue) {
      inputs[field.name] = parsed.value
    }
  }
  return {
    inputs,
    returnRawResponse: returnRawResponse.value,
  }
}

const buildJsonRunPayload = (): ToolExecutePayload | null => {
  const text = runJsonText.value.trim()
  if (!text) {
    runError.value = '请输入执行入参 JSON。'
    return null
  }
  try {
    const parsed = JSON.parse(text) as unknown
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      runError.value = '执行入参必须是 JSON 对象。'
      return null
    }
    return {
      inputs: parsed as Record<string, unknown>,
      returnRawResponse: returnRawResponse.value,
    }
  } catch {
    runError.value = '执行入参 JSON 格式错误。'
    return null
  }
}

const triggerSave = (): void => {
  if (isSaveDisabled.value) {
    return
  }
  if (nameError.value || descriptionError.value || urlError.value) {
    return
  }
  if (schemaErrorCount.value > 0) {
    return
  }

  const payload = draft.buildSavePayload()
  emit('save', payload)
}

const triggerExecute = (): void => {
  if (props.loading || props.running) {
    return
  }
  runError.value = ''
  const payload = runMode.value === 'json' ? buildJsonRunPayload() : buildFormRunPayload()
  if (!payload) {
    return
  }
  emit('execute', payload)
}

watch(
  () => props.seed,
  (seed) => {
    if (!seed) {
      return
    }
    if (!hasAppliedSeed.value || !draft.isDirty.value) {
      draft.applySeed(seed)
      syncRunDefaults(draft.runFields.value)
      hasAppliedSeed.value = true
    }
  },
  { immediate: true, deep: true },
)

watch(runFields, (fields) => {
  syncRunDefaults(fields)
})

watch(
  () => draft.isDirty.value,
  (dirty) => {
    emit('dirty-change', dirty)
  },
  { immediate: true },
)
</script>

<template>
  <div class="space-y-4">
    <Card>
      <CardContent class="flex flex-wrap items-center justify-between gap-3 pt-6">
        <div class="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">tool</Badge>
          <Badge variant="outline">Workspace Instance: {{ workspaceInstanceUuid || '-' }}</Badge>
          <Badge variant="outline">
            Published: {{ latestPublishedInstanceUuid ? 'Yes' : 'No' }}
          </Badge>
          <Badge v-if="draft.isDirty.value" variant="destructive">未保存变更</Badge>
        </div>
        <div class="flex items-center gap-2">
          <Button variant="outline" :disabled="props.loading || props.running" @click="triggerExecute">
            {{ props.running ? '试运行中...' : '试运行' }}
          </Button>
          <Button :disabled="isSaveDisabled" @click="triggerSave">
            {{ props.saving ? '保存中...' : '保存工具' }}
          </Button>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>填写基本信息</CardTitle>
        <CardDescription>名称与描述会同步到 Resource 元数据。</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <Label for="tool-ide-name">工具名称 *</Label>
            <span class="text-xs text-muted-foreground">{{ draft.name.value.length }}/100</span>
          </div>
          <Input
            id="tool-ide-name"
            v-model="draft.name.value"
            maxlength="100"
            placeholder="请输入工具名称，确保语义清晰且符合平台规范"
          />
          <p v-if="nameError" class="text-xs text-destructive">{{ nameError }}</p>
        </div>

        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <Label for="tool-ide-description">工具描述 *</Label>
            <span class="text-xs text-muted-foreground">{{ draft.description.value.length }}/600</span>
          </div>
          <Textarea
            id="tool-ide-description"
            v-model="draft.description.value"
            class="min-h-24"
            maxlength="600"
            placeholder="请描述工具主要功能和使用场景，帮助用户或大模型理解"
          />
          <p v-if="descriptionError" class="text-xs text-destructive">{{ descriptionError }}</p>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>更多信息</CardTitle>
        <CardDescription>配置工具请求地址与 HTTP 方法。</CardDescription>
      </CardHeader>
      <CardContent class="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div class="space-y-2">
          <Label for="tool-ide-url">工具路径 *</Label>
          <Input
            id="tool-ide-url"
            v-model="draft.url.value"
            placeholder="https://wttr.in/{city}"
          />
          <p v-if="urlError" class="text-xs text-destructive">{{ urlError }}</p>
        </div>

        <div class="space-y-2">
          <Label for="tool-ide-method">请求方法 *</Label>
          <Select
            :model-value="draft.method.value"
            @update:model-value="(value) => (draft.method.value = String(value).toUpperCase() as ToolHttpMethod)"
          >
            <SelectTrigger id="tool-ide-method">
              <SelectValue placeholder="选择请求方法" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="methodValue in toolMethods" :key="methodValue" :value="methodValue">
                {{ methodValue }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>配置输入参数</CardTitle>
        <CardDescription>复用 Param Schema Editor（Regular）。</CardDescription>
      </CardHeader>
      <CardContent>
        <ParamSchemaRegularEditor
          :state="inputEditorState"
          :dispatch="draft.inputEditor.dispatch"
          :role-options="roleOptions"
          class="h-[520px] min-h-[420px]"
        />
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>配置输出参数</CardTitle>
        <CardDescription>复用 Param Schema Editor（Professional）。</CardDescription>
      </CardHeader>
      <CardContent>
        <ParamSchemaProfessionalEditor
          :state="outputEditorState"
          :dispatch="draft.outputEditor.dispatch"
          class="h-[560px] min-h-[460px]"
        />
      </CardContent>
    </Card>

    <Alert v-if="schemaErrorCount > 0" variant="destructive">
      <AlertTitle>Schema 校验失败</AlertTitle>
      <AlertDescription>
        <p>输入参数错误：{{ inputSchemaErrors.length }}，输出参数错误：{{ outputSchemaErrors.length }}。</p>
        <p>请修复后再保存。</p>
      </AlertDescription>
    </Alert>

    <Card>
      <CardHeader>
        <CardTitle>试运行</CardTitle>
        <CardDescription>支持表单和 JSON 两种执行入参模式。</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <Tabs v-model="runMode" class="space-y-3">
          <TabsList>
            <TabsTrigger value="form">表单模式</TabsTrigger>
            <TabsTrigger value="json">JSON 模式</TabsTrigger>
          </TabsList>

          <TabsContent value="form" class="space-y-3">
            <template v-if="runFields.length">
              <div
                v-for="field in runFields"
                :key="field.name"
                class="space-y-2 rounded-md border p-3"
              >
                <div class="flex items-center gap-2">
                  <p class="font-medium">{{ field.name }}</p>
                  <Badge variant="outline">{{ field.type }}</Badge>
                  <Badge v-if="field.required" variant="destructive">required</Badge>
                  <Badge v-if="field.role" variant="secondary">{{ field.role }}</Badge>
                </div>
                <p v-if="field.description" class="text-xs text-muted-foreground">{{ field.description }}</p>

                <Input
                  v-if="field.type === 'string' || field.type === 'number' || field.type === 'integer'"
                  :type="field.type === 'string' ? 'text' : 'number'"
                  :model-value="String(runFormValues[field.name] ?? '')"
                  @update:model-value="(value) => (runFormValues[field.name] = value)"
                />

                <Switch
                  v-else-if="field.type === 'boolean'"
                  :model-value="Boolean(runFormValues[field.name])"
                  @update:model-value="(value) => (runFormValues[field.name] = Boolean(value))"
                />

                <Textarea
                  v-else
                  class="min-h-24 font-mono text-xs"
                  :model-value="String(runFormValues[field.name] ?? '')"
                  @update:model-value="(value) => (runFormValues[field.name] = value)"
                />
              </div>
            </template>
            <p v-else class="text-sm text-muted-foreground">
              当前输入 schema 为空，可直接执行空参数请求。
            </p>
          </TabsContent>

          <TabsContent value="json" class="space-y-2">
            <Textarea
              v-model="runJsonText"
              class="min-h-44 font-mono text-xs"
              placeholder='{"city":"Hangzhou"}'
            />
          </TabsContent>
        </Tabs>

        <div class="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/20 p-3">
          <div class="flex items-center gap-2">
            <Switch
              :model-value="returnRawResponse"
              @update:model-value="(value) => (returnRawResponse = Boolean(value))"
            />
            <span class="text-sm">返回原始响应（仅 Workspace 草稿有效）</span>
          </div>
          <Button :disabled="props.running || props.loading" @click="triggerExecute">
            {{ props.running ? '执行中...' : '执行 Tool' }}
          </Button>
        </div>

        <Alert v-if="runError" variant="destructive">
          <AlertTitle>执行参数错误</AlertTitle>
          <AlertDescription>{{ runError }}</AlertDescription>
        </Alert>

        <div class="space-y-2 rounded-md border p-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="text-sm font-medium">执行结果</p>
            <template v-if="runFeedback">
              <Badge :variant="runFeedback.success ? 'secondary' : 'destructive'">
                {{ runFeedback.success ? 'Success' : 'Failed' }}
              </Badge>
              <span class="text-xs text-muted-foreground">{{ runFeedback.durationMs }} ms</span>
            </template>
          </div>
          <p v-if="runFeedback?.errorMessage" class="text-xs text-destructive">{{ runFeedback.errorMessage }}</p>
          <pre class="max-h-96 overflow-auto rounded-md border bg-muted/30 p-3 text-xs">{{ runFeedbackText || '暂无执行结果。' }}</pre>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
