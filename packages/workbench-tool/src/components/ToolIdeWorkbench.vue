<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { MonacoEditor, ParamSchemaRegularEditor } from '@repo/editor'
import { WorkbenchSurface, type WorkbenchSaveTrigger } from '@repo/workbench-core'
import { createToolRunDefaults } from '../adapters/tool-schema-adapter'
import { useToolIdeDraft } from '../composables/use-tool-ide-draft'
import type {
  ToolExecutePayload,
  ToolExecuteRequest,
  ToolHttpMethod,
  ToolIdeSaveRequest,
  ToolIdeSaveTrigger,
  ToolIdeSeed,
  ToolPublishRequest,
  ToolRunFeedback,
  ToolRunField,
} from '../types/tool-ide'
import { Alert, AlertDescription, AlertTitle } from '@repo/ui-shadcn/components/ui/alert'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@repo/ui-shadcn/components/ui/accordion'
import { Badge } from '@repo/ui-shadcn/components/ui/badge'
import { Button } from '@repo/ui-shadcn/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@repo/ui-shadcn/components/ui/dialog'
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

const AUTOSAVE_DEBOUNCE_MS = 1600

const props = withDefaults(
  defineProps<{
    seed: ToolIdeSeed | null
    resourceDescription?: string
    loading?: boolean
    saving?: boolean
    running?: boolean
    publishing?: boolean
    workspaceInstanceUuid?: string | null
    latestPublishedInstanceUuid?: string | null
    updatedAt?: string | null
    latestUpdatedAt?: string | null
    savedAt?: string | null
    runFeedback?: ToolRunFeedback | null
  }>(),
  {
    resourceDescription: '',
    loading: false,
    saving: false,
    running: false,
    publishing: false,
    workspaceInstanceUuid: null,
    latestPublishedInstanceUuid: null,
    updatedAt: null,
    latestUpdatedAt: null,
    savedAt: null,
    runFeedback: null,
  },
)

const emit = defineEmits<{
  (event: 'back'): void
  (event: 'save', payload: ToolIdeSaveRequest): void
  (event: 'execute', payload: ToolExecuteRequest): void
  (event: 'publish', payload: ToolPublishRequest): void
  (event: 'dirty-change', value: boolean): void
}>()
const { t } = useI18n()

const draft = useToolIdeDraft()
const roleOptions: string[] = ['http.path', 'http.query', 'http.body']
const toolMethods: ToolHttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

const runMode = ref<RunMode>('form')
const runDialogOpen = ref(false)
const runFormValues = ref<Record<string, unknown>>({})
const runJsonText = ref('{\n}')
const runError = ref('')
const returnRawResponse = ref(false)
const hasAppliedSeed = ref(false)
const lastMarkedSavedAt = ref<string | null>(null)

const inputEditorState = computed(() => draft.inputEditor.state.value)
const outputEditorState = computed(() => draft.outputEditor.state.value)
const inputSchemaErrors = computed(() => draft.inputValidation.value.errors)
const outputSchemaErrors = computed(() => draft.outputValidation.value.errors)
const schemaErrorCount = computed(() => inputSchemaErrors.value.length + outputSchemaErrors.value.length)
const runFields = computed(() => draft.runFields.value)

const toolDisplayName = computed(() => draft.name.value.trim() || t('platform.workbench.tool.defaultName'))
const headerUpdatedAt = computed(() => props.savedAt ?? props.updatedAt ?? props.latestUpdatedAt)

const nameError = computed(() => {
  const trimmed = draft.name.value.trim()
  if (!trimmed) {
    return t('platform.workbench.tool.errors.nameRequired')
  }
  if (trimmed.length > 100) {
    return t('platform.workbench.tool.errors.nameTooLong')
  }
  return ''
})

const descriptionError = computed(() => {
  const trimmed = draft.description.value.trim()
  if (!trimmed) {
    return t('platform.workbench.tool.errors.descriptionRequired')
  }
  if (trimmed.length > 600) {
    return t('platform.workbench.tool.errors.descriptionTooLong')
  }
  return ''
})

const urlError = computed(() => {
  const trimmed = draft.url.value.trim()
  if (!trimmed) {
    return ''
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    return t('platform.workbench.tool.errors.urlInvalid')
  }
  return ''
})

const hasBlockingErrors = computed(() => {
  return Boolean(nameError.value || descriptionError.value || urlError.value || schemaErrorCount.value > 0)
})

const isSaveDisabled = computed(() => {
  return props.loading || props.saving || props.running || props.publishing || !props.seed || hasBlockingErrors.value
})

const isPublishDisabled = computed(() => {
  return props.loading || props.saving || props.running || props.publishing || !props.seed || hasBlockingErrors.value
})

const isRunDialogDisabled = computed(() => {
  return props.loading || props.saving || props.running || props.publishing || !props.seed
})

const canAutosave = computed(() => {
  return Boolean(props.seed)
    && !props.loading
    && !props.saving
    && !props.running
    && !props.publishing
    && !hasBlockingErrors.value
})

const runFeedback = computed(() => props.runFeedback)

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
        return { hasValue: false, errorMessage: t('platform.workbench.tool.errors.fieldRequired', { name: field.name }) }
      }
      return { hasValue: false }
    }
    return { hasValue: true, value: Boolean(rawValue) }
  }

  if (field.type === 'number' || field.type === 'integer') {
    const valueText = String(rawValue ?? '').trim()
    if (!valueText) {
      if (field.required) {
        return { hasValue: false, errorMessage: t('platform.workbench.tool.errors.fieldRequired', { name: field.name }) }
      }
      return { hasValue: false }
    }
    const parsedNumber = Number(valueText)
    if (Number.isNaN(parsedNumber)) {
      return { hasValue: false, errorMessage: t('platform.workbench.tool.errors.numberRequired', { name: field.name }) }
    }
    if (field.type === 'integer' && !Number.isInteger(parsedNumber)) {
      return { hasValue: false, errorMessage: t('platform.workbench.tool.errors.integerRequired', { name: field.name }) }
    }
    return { hasValue: true, value: parsedNumber }
  }

  if (field.type === 'object' || field.type === 'array') {
    const valueText = String(rawValue ?? '').trim()
    if (!valueText) {
      if (field.required) {
        return { hasValue: false, errorMessage: t('platform.workbench.tool.errors.fieldRequired', { name: field.name }) }
      }
      return { hasValue: false }
    }
    try {
      const parsed = JSON.parse(valueText)
      if (field.type === 'object' && (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))) {
        return { hasValue: false, errorMessage: t('platform.workbench.tool.errors.objectRequired', { name: field.name }) }
      }
      if (field.type === 'array' && !Array.isArray(parsed)) {
        return { hasValue: false, errorMessage: t('platform.workbench.tool.errors.arrayRequired', { name: field.name }) }
      }
      return { hasValue: true, value: parsed }
    } catch {
      return { hasValue: false, errorMessage: t('platform.workbench.tool.errors.jsonInvalid', { name: field.name }) }
    }
  }

  const valueText = String(rawValue ?? '').trim()
  if (!valueText) {
    if (field.required) {
      return { hasValue: false, errorMessage: t('platform.workbench.tool.errors.fieldRequired', { name: field.name }) }
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
    runError.value = t('platform.workbench.tool.errors.runJsonRequired')
    return null
  }
  try {
    const parsed = JSON.parse(text) as unknown
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      runError.value = t('platform.workbench.tool.errors.runJsonObjectRequired')
      return null
    }
    return {
      inputs: parsed as Record<string, unknown>,
      returnRawResponse: returnRawResponse.value,
    }
  } catch {
    runError.value = t('platform.workbench.tool.errors.runJsonInvalid')
    return null
  }
}

const triggerSave = (trigger: ToolIdeSaveTrigger): boolean => {
  if (props.loading || props.saving || props.publishing || !props.seed || hasBlockingErrors.value) {
    return false
  }
  emit('save', {
    payload: draft.buildSavePayload(),
    trigger,
  })
  return true
}

const handleSurfaceSave = (trigger: WorkbenchSaveTrigger): void => {
  if (trigger === 'autosave') {
    triggerSave('autosave')
    return
  }
  triggerSave('manual')
}

const openRunDialog = (): void => {
  if (isRunDialogDisabled.value) {
    return
  }
  runDialogOpen.value = true
}

const triggerExecute = (): void => {
  if (props.loading || props.saving || props.running || props.publishing || !props.seed) {
    return
  }
  runError.value = ''
  if (hasBlockingErrors.value) {
    runError.value = t('platform.workbench.tool.errors.fixBeforeRun')
    return
  }
  const payload = runMode.value === 'json' ? buildJsonRunPayload() : buildFormRunPayload()
  if (!payload) {
    return
  }
  emit('execute', {
    run: payload,
    save: draft.buildSavePayload(),
  })
}

const triggerPublish = (): void => {
  if (isPublishDisabled.value || !props.seed) {
    return
  }
  emit('publish', {
    save: draft.buildSavePayload(),
  })
}

watch(
  () => props.savedAt,
  (savedAt) => {
    if (!savedAt || savedAt === lastMarkedSavedAt.value) {
      return
    }
    lastMarkedSavedAt.value = savedAt
    draft.markSaved()
  },
  { immediate: true },
)

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
  <WorkbenchSurface
    :title="t('platform.workbench.tool.ideTitle')"
    :description="draft.description.value || resourceDescription || t('platform.workbench.header.emptyDescription')"
    resource-type="tool"
    :resource-name="toolDisplayName"
    :updated-at="headerUpdatedAt"
    :workspace-instance-uuid="workspaceInstanceUuid"
    :latest-published-instance-uuid="latestPublishedInstanceUuid"
    :save-status-text="draft.isDirty.value ? t('platform.workbench.agent.unsaved') : t('platform.workbench.agent.saved')"
    :save-status-variant="draft.isDirty.value ? 'destructive' : 'outline'"
    :run-action="{ visible: true, label: t('platform.workbench.header.actions.run'), loadingLabel: t('platform.workbench.header.actions.running'), disabled: isRunDialogDisabled, loading: props.running }"
    :save-action="{ visible: true, label: t('platform.workbench.header.actions.save'), loadingLabel: t('platform.workbench.header.actions.saving'), disabled: isSaveDisabled, loading: props.saving }"
    :publish-action="{ visible: true, label: t('platform.workbench.header.actions.publish'), loadingLabel: t('platform.workbench.header.actions.publishing'), disabled: isPublishDisabled, loading: props.publishing }"
    :autosave="{ enabled: true, debounceMs: AUTOSAVE_DEBOUNCE_MS, canAutosave, isDirty: draft.isDirty.value }"
    :save-handler="handleSurfaceSave"
    @back="emit('back')"
    @run="openRunDialog"
    @publish="triggerPublish"
  >
    <div class="border-y">
      <Accordion type="multiple" :default-value="['basic', 'more', 'input', 'output']" class="w-full">
        <AccordionItem value="basic">
          <AccordionTrigger class="px-4 text-base font-semibold hover:no-underline">{{ t('platform.workbench.tool.sections.basic') }}</AccordionTrigger>
          <AccordionContent class="px-4 pb-5">
            <div class="space-y-4">
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <Label for="tool-ide-name">{{ t('platform.workbench.tool.fields.name') }} *</Label>
                  <span class="text-xs text-muted-foreground">{{ draft.name.value.length }}/100</span>
                </div>
                <Input
                  id="tool-ide-name"
                  v-model="draft.name.value"
                  maxlength="100"
                  :placeholder="t('platform.workbench.tool.placeholders.name')"
                />
                <p v-if="nameError" class="text-xs text-destructive">{{ nameError }}</p>
              </div>

              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <Label for="tool-ide-description">{{ t('platform.workbench.tool.fields.description') }} *</Label>
                  <span class="text-xs text-muted-foreground">{{ draft.description.value.length }}/600</span>
                </div>
                <Textarea
                  id="tool-ide-description"
                  v-model="draft.description.value"
                  class="min-h-24"
                  maxlength="600"
                  :placeholder="t('platform.workbench.tool.placeholders.description')"
                />
                <p v-if="descriptionError" class="text-xs text-destructive">{{ descriptionError }}</p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="more">
          <AccordionTrigger class="px-4 text-base font-semibold hover:no-underline">{{ t('platform.workbench.tool.sections.more') }}</AccordionTrigger>
          <AccordionContent class="px-4 pb-5">
            <div class="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
              <div class="space-y-2">
                <Label for="tool-ide-url">{{ t('platform.workbench.tool.fields.url') }} *</Label>
                <Input
                  id="tool-ide-url"
                  v-model="draft.url.value"
                  :placeholder="t('platform.workbench.tool.placeholders.url')"
                />
                <p v-if="urlError" class="text-xs text-destructive">{{ urlError }}</p>
              </div>

              <div class="space-y-2">
                <Label for="tool-ide-method">{{ t('platform.workbench.tool.fields.method') }} *</Label>
                <Select
                  :model-value="draft.method.value"
                  @update:model-value="(value) => (draft.method.value = String(value).toUpperCase() as ToolHttpMethod)"
                >
                  <SelectTrigger id="tool-ide-method">
                    <SelectValue :placeholder="t('platform.workbench.tool.placeholders.method')" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="methodValue in toolMethods" :key="methodValue" :value="methodValue">
                      {{ methodValue }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="input">
          <AccordionTrigger class="px-4 text-base font-semibold hover:no-underline">{{ t('platform.workbench.tool.sections.inputSchema') }}</AccordionTrigger>
          <AccordionContent class="px-4 pb-5">
            <ParamSchemaRegularEditor
              :state="inputEditorState"
              :dispatch="draft.inputEditor.dispatch"
              :role-options="roleOptions"
              class="h-[520px] min-h-[420px]"
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="output">
          <AccordionTrigger class="px-4 text-base font-semibold hover:no-underline">{{ t('platform.workbench.tool.sections.outputSchema') }}</AccordionTrigger>
          <AccordionContent class="px-4 pb-5">
            <ParamSchemaRegularEditor
              :state="outputEditorState"
              :dispatch="draft.outputEditor.dispatch"
              class="h-[520px] min-h-[420px]"
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>

    <Alert v-if="schemaErrorCount > 0" variant="destructive">
      <AlertTitle>{{ t('platform.workbench.tool.schemaInvalid') }}</AlertTitle>
      <AlertDescription>
        <p>{{ t('platform.workbench.tool.schemaInvalidDetail', { input: inputSchemaErrors.length, output: outputSchemaErrors.length }) }}</p>
        <p>{{ t('platform.workbench.tool.schemaInvalidHint') }}</p>
      </AlertDescription>
    </Alert>

    <Dialog v-model:open="runDialogOpen">
      <DialogContent class="flex h-[88vh] max-h-[88vh] sm:max-w-[60vw] flex-col">
        <DialogHeader>
          <DialogTitle>{{ t('platform.workbench.tool.runDialogTitle') }}</DialogTitle>
          <DialogDescription>{{ t('platform.workbench.tool.runDialogDescription') }}</DialogDescription>
        </DialogHeader>

        <div class="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section class="min-h-0 space-y-4 overflow-y-auto pr-1">
            <Tabs v-model="runMode" class="space-y-3">
              <TabsList>
                <TabsTrigger value="form">{{ t('platform.workbench.tool.runModes.form') }}</TabsTrigger>
                <TabsTrigger value="json">{{ t('platform.workbench.tool.runModes.json') }}</TabsTrigger>
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
                      <Badge v-if="field.required" variant="destructive">{{ t('platform.workbench.tool.required') }}</Badge>
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
                  {{ t('platform.workbench.tool.emptyInputSchema') }}
                </p>
              </TabsContent>

              <TabsContent value="json" class="space-y-2">
                <div class="overflow-hidden rounded-md border">
                  <MonacoEditor
                    v-model="runJsonText"
                    language="json"
                    :height="320"
                    :minimap="false"
                    :options="{ tabSize: 2 }"
                    :path="`workbench/tool/${workspaceInstanceUuid || 'draft'}/run-input.json`"
                  />
                </div>
              </TabsContent>
            </Tabs>

          </section>

          <section class="min-h-0 space-y-2 overflow-y-auto rounded-md border p-3">
            <div class="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/20 p-3">
              <div class="flex items-center gap-2">
                <Switch
                  :model-value="returnRawResponse"
                  @update:model-value="(value) => (returnRawResponse = Boolean(value))"
                />
                <span class="text-sm">{{ t('platform.workbench.tool.returnRaw') }}</span>
              </div>
              <Button :disabled="props.running || props.saving || props.loading || hasBlockingErrors" @click="triggerExecute">
                {{ props.running ? t('platform.workbench.tool.executing') : t('platform.workbench.tool.execute') }}
              </Button>
            </div>

            <Alert v-if="runError" variant="destructive">
              <AlertTitle>{{ t('platform.workbench.tool.runArgsInvalid') }}</AlertTitle>
              <AlertDescription>{{ runError }}</AlertDescription>
            </Alert>

            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="text-sm font-medium">{{ t('platform.workbench.tool.result') }}</p>
              <template v-if="runFeedback">
                <Badge :variant="runFeedback.success ? 'secondary' : 'destructive'">
                  {{ runFeedback.success ? t('platform.workbench.common.success') : t('platform.workbench.common.failed') }}
                </Badge>
                <span class="text-xs text-muted-foreground">{{ runFeedback.durationMs }} ms</span>
              </template>
            </div>
            <p v-if="runFeedback?.errorMessage" class="text-xs text-destructive">{{ runFeedback.errorMessage }}</p>
            <pre class="max-h-[62vh] overflow-auto rounded-md border bg-muted/30 p-3 text-xs">{{ runFeedbackText || t('platform.workbench.tool.emptyResult') }}</pre>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  </WorkbenchSurface>
</template>
