<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { WorkbenchSurface, type WorkbenchSaveTrigger } from '@prismaspace/resources-core'
import type { PrismaspaceClient } from '@prismaspace/sdk'
import { Alert, AlertDescription, AlertTitle } from '@prismaspace/ui-shadcn/components/ui/alert'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@prismaspace/ui-shadcn/components/ui/resizable'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@prismaspace/ui-shadcn/components/ui/tabs'
import AgentChat from '../main/AgentChat.vue'
import AgentPromptEditor from './sections/AgentPromptEditor.vue'
import AgentOrchestrationPanel from './sections/AgentOrchestrationPanel.vue'
import type {
  AgentEditableConfig,
  AgentIdeSeed,
  AgentInstancePatchPayload,
  AgentModelOption,
  AgentReferenceBinding,
  AgentResourceCatalogItem,
} from './types/agent-ide'

const props = withDefaults(
  defineProps<{
    client?: PrismaspaceClient | null
    seed: AgentIdeSeed | null
    resourceDescription?: string
    modelOptions: AgentModelOption[]
    resources: AgentResourceCatalogItem[]
    bindings: AgentReferenceBinding[]
    loading?: boolean
    saving?: boolean
    modelsLoading?: boolean
    loadingBindings?: boolean
    syncingBindings?: boolean
    publishing?: boolean
    workspaceInstanceUuid?: string | null
    latestPublishedInstanceUuid?: string | null
    updatedAt?: string | null
    lastSavedAt?: string | null
    errorMessage?: string | null
  }>(),
  {
    client: null,
    resourceDescription: '',
    loading: false,
    saving: false,
    modelsLoading: false,
    loadingBindings: false,
    syncingBindings: false,
    publishing: false,
    workspaceInstanceUuid: null,
    latestPublishedInstanceUuid: null,
    updatedAt: null,
    lastSavedAt: null,
    errorMessage: null,
  },
)

const emit = defineEmits<{
  (event: 'back'): void
  (event: 'save', payload: AgentInstancePatchPayload): void
  (event: 'add-binding', payload: { sourceNodeUuid: string, targetInstanceUuid: string }): void
  (event: 'remove-binding', payload: { sourceNodeUuid: string, targetInstanceUuid: string }): void
  (event: 'publish'): void
  (event: 'dirty-change', value: boolean): void
}>()

const { t } = useI18n()

const draftSystemPrompt = ref('')
const draftLlmModuleVersionUuid = ref<string | null>(null)
const draftEditableConfig = ref<AgentEditableConfig>({
  diversityMode: 'balanced',
  modelParams: {
    temperature: 0.5,
    topP: 0.9,
    presencePenalty: 0,
    frequencyPenalty: 0,
  },
  ioConfig: {
    historyTurns: 10,
    maxResponseTokens: 2048,
    enableDeepThinking: false,
    maxThinkingTokens: null,
    responseFormatType: 'text',
  },
  deepMemoryConfig: {
    enabled: false,
    enableVectorRecall: true,
    maxRecallTurns: 2,
    minMatchScore: 0.6,
    enableSummarization: false,
    maxSummaryTurns: 5,
    summaryScope: 'session',
  },
  ragConfig: {
    enabled: false,
    showSource: true,
    callMode: 'on_demand',
  },
  uiConfig: {
    skill: {
      enablePlugins: true,
      enableWorkflow: true,
    },
    memory: {
      variableKeys: [],
      enableFileBox: false,
      enableDatabaseMemory: false,
    },
    conversation: {
      openingMessage: '',
      presetQuestions: [],
      showAllPresetQuestions: true,
    },
  },
})

const mobileMainView = ref<'prompt' | 'orchestration' | 'preview'>('preview')
const tabletLeftView = ref<'prompt' | 'orchestration'>('prompt')
const baselineSnapshot = ref('')
const rawAgentConfigBaseline = ref<Record<string, unknown>>({})
const seedFingerprint = ref('')

const toRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  return value as Record<string, unknown>
}

const toNumber = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return fallback
}

const toBoolean = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === 'boolean') {
    return value
  }
  return fallback
}

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return []
  }
  return value
    .map(item => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
}

const cloneRecord = (value: Record<string, unknown>): Record<string, unknown> => {
  try {
    return JSON.parse(JSON.stringify(value)) as Record<string, unknown>
  } catch {
    return { ...value }
  }
}

const toEditableConfig = (raw: Record<string, unknown>): AgentEditableConfig => {
  const modelParams = toRecord(raw.model_params)
  const ioConfig = toRecord(raw.io_config)
  const responseFormat = toRecord(ioConfig.response_format)
  const deepMemory = toRecord(raw.deep_memory)
  const ragConfig = toRecord(raw.rag_config)
  const uiConfig = toRecord(raw.ui_config)
  const skillConfig = toRecord(uiConfig.skill)
  const memoryConfig = toRecord(uiConfig.memory)
  const conversationConfig = toRecord(uiConfig.conversation)

  const diversityModeRaw = raw.diversity_mode
  const diversityMode
    = diversityModeRaw === 'precise' || diversityModeRaw === 'balanced' || diversityModeRaw === 'creative' || diversityModeRaw === 'custom'
      ? diversityModeRaw
      : 'balanced'

  const ragCallMethodRaw = ragConfig.call_method
  const ragCallMode = ragCallMethodRaw === 'always' ? 'always' : 'on_demand'

  return {
    diversityMode,
    modelParams: {
      temperature: toNumber(modelParams.temperature, 0.5),
      topP: toNumber(modelParams.top_p, 0.9),
      presencePenalty: toNumber(modelParams.presence_penalty, 0),
      frequencyPenalty: toNumber(modelParams.frequency_penalty, 0),
    },
    ioConfig: {
      historyTurns: Math.max(0, Math.round(toNumber(ioConfig.history_turns, 10))),
      maxResponseTokens: Math.max(1, Math.round(toNumber(ioConfig.max_response_tokens, 2048))),
      enableDeepThinking: toBoolean(ioConfig.enable_deep_thinking, false),
      maxThinkingTokens: ioConfig.max_thinking_tokens === null || ioConfig.max_thinking_tokens === undefined
        ? null
        : Math.max(1, Math.round(toNumber(ioConfig.max_thinking_tokens, 1024))),
      responseFormatType: responseFormat.type === 'json_object' ? 'json_object' : 'text',
    },
    deepMemoryConfig: {
      enabled: toBoolean(deepMemory.enabled, false),
      enableVectorRecall: toBoolean(deepMemory.enable_vector_recall, true),
      maxRecallTurns: Math.max(1, Math.round(toNumber(deepMemory.max_recall_turns, 2))),
      minMatchScore: Math.min(1, Math.max(0, toNumber(deepMemory.min_match_score, 0.6))),
      enableSummarization: toBoolean(deepMemory.enable_summarization, false),
      maxSummaryTurns: Math.max(1, Math.round(toNumber(deepMemory.max_summary_turns, 5))),
      summaryScope: deepMemory.summary_scope === 'user' ? 'user' : 'session',
    },
    ragConfig: {
      enabled: toBoolean(ragConfig.enabled, false),
      showSource: toBoolean(ragConfig.show_source, true),
      callMode: ragCallMode,
    },
    uiConfig: {
      skill: {
        enablePlugins: toBoolean(skillConfig.enable_plugins, true),
        enableWorkflow: toBoolean(skillConfig.enable_workflow, true),
      },
      memory: {
        variableKeys: toStringArray(memoryConfig.variable_keys),
        enableFileBox: toBoolean(memoryConfig.enable_file_box, false),
        enableDatabaseMemory: toBoolean(memoryConfig.enable_database_memory, false),
      },
      conversation: {
        openingMessage: typeof conversationConfig.opening_message === 'string' ? conversationConfig.opening_message : '',
        presetQuestions: toStringArray(conversationConfig.preset_questions),
        showAllPresetQuestions: toBoolean(conversationConfig.show_all_preset_questions, true),
      },
    },
  }
}

const snapshotFromDraft = (): string => {
  return JSON.stringify({
    systemPrompt: draftSystemPrompt.value,
    llmModuleVersionUuid: draftLlmModuleVersionUuid.value,
    editableConfig: draftEditableConfig.value,
  })
}

const applySeed = (seed: AgentIdeSeed): void => {
  draftSystemPrompt.value = seed.systemPrompt
  draftLlmModuleVersionUuid.value = seed.llmModuleVersionUuid
  draftEditableConfig.value = toEditableConfig(seed.agentConfig)
  rawAgentConfigBaseline.value = cloneRecord(seed.agentConfig)
  baselineSnapshot.value = snapshotFromDraft()
}

watch(
  () => props.seed,
  (seed) => {
    if (!seed) {
      return
    }
    const fingerprint = JSON.stringify({
      resourceName: seed.resourceName,
      systemPrompt: seed.systemPrompt,
      llmModuleVersionUuid: seed.llmModuleVersionUuid,
      agentConfig: seed.agentConfig,
    })
    if (fingerprint === seedFingerprint.value) {
      return
    }
    seedFingerprint.value = fingerprint
    applySeed(seed)
  },
  { immediate: true, deep: true },
)

const isDirty = computed(() => {
  if (!props.seed) {
    return false
  }
  return snapshotFromDraft() !== baselineSnapshot.value
})

watch(
  isDirty,
  (value) => {
    emit('dirty-change', value)
  },
  { immediate: true },
)

const displayResourceName = computed(() => props.seed?.resourceName || t('platform.workbench.agent.defaultName'))
const saveDisabled = computed(() => props.loading || props.saving || !props.seed || !isDirty.value)
const publishDisabled = computed(() => props.loading || props.saving || props.publishing || !props.seed)
const headerUpdatedAt = computed(() => props.lastSavedAt ?? props.updatedAt)

const buildMergedAgentConfig = (): Record<string, unknown> => {
  const base = cloneRecord(rawAgentConfigBaseline.value)
  const modelParams = toRecord(base.model_params)
  const ioConfig = toRecord(base.io_config)
  const responseFormat = toRecord(ioConfig.response_format)
  const deepMemory = toRecord(base.deep_memory)
  const ragConfig = toRecord(base.rag_config)
  const uiConfig = toRecord(base.ui_config)
  const skillConfig = toRecord(uiConfig.skill)
  const memoryConfig = toRecord(uiConfig.memory)
  const conversationConfig = toRecord(uiConfig.conversation)

  base.diversity_mode = draftEditableConfig.value.diversityMode
  base.model_params = {
    ...modelParams,
    temperature: draftEditableConfig.value.modelParams.temperature,
    top_p: draftEditableConfig.value.modelParams.topP,
    presence_penalty: draftEditableConfig.value.modelParams.presencePenalty,
    frequency_penalty: draftEditableConfig.value.modelParams.frequencyPenalty,
  }
  base.io_config = {
    ...ioConfig,
    history_turns: draftEditableConfig.value.ioConfig.historyTurns,
    max_response_tokens: draftEditableConfig.value.ioConfig.maxResponseTokens,
    enable_deep_thinking: draftEditableConfig.value.ioConfig.enableDeepThinking,
    max_thinking_tokens: draftEditableConfig.value.ioConfig.enableDeepThinking
      ? draftEditableConfig.value.ioConfig.maxThinkingTokens
      : null,
    response_format: {
      ...responseFormat,
      type: draftEditableConfig.value.ioConfig.responseFormatType,
    },
  }
  base.deep_memory = {
    ...deepMemory,
    enabled: draftEditableConfig.value.deepMemoryConfig.enabled,
    enable_vector_recall: draftEditableConfig.value.deepMemoryConfig.enableVectorRecall,
    max_recall_turns: draftEditableConfig.value.deepMemoryConfig.maxRecallTurns,
    min_match_score: draftEditableConfig.value.deepMemoryConfig.minMatchScore,
    enable_summarization: draftEditableConfig.value.deepMemoryConfig.enableSummarization,
    max_summary_turns: draftEditableConfig.value.deepMemoryConfig.maxSummaryTurns,
    summary_scope: draftEditableConfig.value.deepMemoryConfig.summaryScope,
  }
  base.rag_config = {
    ...ragConfig,
    enabled: draftEditableConfig.value.ragConfig.enabled,
    show_source: draftEditableConfig.value.ragConfig.showSource,
    call_method: draftEditableConfig.value.ragConfig.callMode === 'always' ? 'always' : 'auto',
  }
  base.ui_config = {
    ...uiConfig,
    skill: {
      ...skillConfig,
      enable_plugins: draftEditableConfig.value.uiConfig.skill.enablePlugins,
      enable_workflow: draftEditableConfig.value.uiConfig.skill.enableWorkflow,
    },
    memory: {
      ...memoryConfig,
      variable_keys: draftEditableConfig.value.uiConfig.memory.variableKeys,
      enable_file_box: draftEditableConfig.value.uiConfig.memory.enableFileBox,
      enable_database_memory: draftEditableConfig.value.uiConfig.memory.enableDatabaseMemory,
    },
    conversation: {
      ...conversationConfig,
      opening_message: draftEditableConfig.value.uiConfig.conversation.openingMessage,
      preset_questions: draftEditableConfig.value.uiConfig.conversation.presetQuestions,
      show_all_preset_questions: draftEditableConfig.value.uiConfig.conversation.showAllPresetQuestions,
    },
  }
  return base
}

const handleSave = (): void => {
  if (!props.seed || saveDisabled.value) {
    return
  }
  const payload: AgentInstancePatchPayload = {}
  if (draftSystemPrompt.value !== props.seed.systemPrompt) {
    payload.system_prompt = draftSystemPrompt.value
  }
  if ((draftLlmModuleVersionUuid.value ?? null) !== (props.seed.llmModuleVersionUuid ?? null)) {
    payload.llm_module_version_uuid = draftLlmModuleVersionUuid.value
  }
  const seedEditableSnapshot = JSON.stringify(toEditableConfig(props.seed.agentConfig))
  const draftEditableSnapshot = JSON.stringify(draftEditableConfig.value)
  if (seedEditableSnapshot !== draftEditableSnapshot) {
    payload.agent_config = buildMergedAgentConfig()
  }
  if (!Object.keys(payload).length) {
    return
  }
  emit('save', payload)
}

const handleSurfaceSave = (trigger: WorkbenchSaveTrigger): void => {
  if (trigger === 'autosave' && !isDirty.value) {
    return
  }
  handleSave()
}
</script>

<template>
  <WorkbenchSurface
    :title="t('platform.workbench.agent.ideTitle')"
    :description="resourceDescription || t('platform.workbench.agent.ideDescription')"
    resource-type="agent"
    :resource-name="displayResourceName"
    :updated-at="headerUpdatedAt"
    :workspace-instance-uuid="workspaceInstanceUuid"
    :latest-published-instance-uuid="latestPublishedInstanceUuid"
    :save-status-text="isDirty ? t('platform.workbench.agent.unsaved') : t('platform.workbench.agent.saved')"
    :save-status-variant="isDirty ? 'destructive' : 'outline'"
    :run-action="{ visible: false }"
    :save-action="{ visible: true, label: t('platform.workbench.agent.saveConfig'), loadingLabel: t('platform.workbench.agent.savingConfig'), disabled: saveDisabled, loading: props.saving }"
    :publish-action="{ visible: true, label: t('platform.workbench.header.actions.publish'), loadingLabel: t('platform.workbench.header.actions.publishing'), disabled: publishDisabled, loading: props.publishing }"
    :autosave="{ enabled: true, debounceMs: 1600, canAutosave: !props.loading && !props.saving && !!props.seed, isDirty }"
    :save-handler="handleSurfaceSave"
    @back="emit('back')"
    @publish="emit('publish')"
  >
    <Alert v-if="errorMessage" variant="destructive" class="m-3">
      <AlertTitle>{{ t('platform.workbench.agent.operationFailed') }}</AlertTitle>
      <AlertDescription>{{ errorMessage }}</AlertDescription>
    </Alert>

    <div v-if="!seed" class="flex flex-1 items-center justify-center text-sm text-muted-foreground">
      {{ t('platform.workbench.agent.loadingInstance') }}
    </div>

    <template v-else>
      <ResizablePanelGroup direction="horizontal" class="hidden h-full min-h-0 w-full xl:flex">
        <ResizablePanel :default-size="30" :min-size="22" :max-size="40" class="min-h-0 border-r">
          <section class="flex min-h-0 h-full flex-col">
            <div class="border-b px-4 py-3">
              <h3 class="text-base font-semibold">{{ t('platform.workbench.agent.sections.prompt') }}</h3>
            </div>
            <div class="min-h-0 flex-1 overflow-auto p-3">
              <div class="h-full">
                <AgentPromptEditor
                  :model-value="draftSystemPrompt"
                  :readonly="saving"
                  @update:model-value="draftSystemPrompt = $event"
                />
              </div>
            </div>
          </section>
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel :default-size="34" :min-size="26" :max-size="42" class="min-h-0 border-r">
          <section class="flex min-h-0 h-full flex-col">
            <div class="border-b px-4 py-3">
              <h3 class="text-base font-semibold">{{ t('platform.workbench.agent.sections.orchestration') }}</h3>
            </div>
            <div class="min-h-0 flex-1 overflow-auto p-4">
              <AgentOrchestrationPanel
                :model-value="draftEditableConfig"
                :llm-module-version-uuid="draftLlmModuleVersionUuid"
                :model-options="modelOptions"
                :resources="resources"
                :bindings="bindings"
                :models-loading="modelsLoading"
                :loading-bindings="loadingBindings"
                :syncing-bindings="syncingBindings"
                :readonly="saving"
                @update:model-value="draftEditableConfig = $event"
                @update:llm-module-version-uuid="draftLlmModuleVersionUuid = $event"
                @add-binding="emit('add-binding', $event)"
                @remove-binding="emit('remove-binding', $event)"
              />
            </div>
          </section>
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel :default-size="36" :min-size="28" class="min-h-0">
          <section class="flex min-h-0 h-full flex-col">
            <div class="border-b px-4 py-3">
              <h3 class="text-base font-semibold">{{ t('platform.workbench.agent.sections.preview') }}</h3>
            </div>
            <div class="min-h-0 flex-1 overflow-auto">
              <AgentChat
                :client="client"
                :instance-uuid="workspaceInstanceUuid || latestPublishedInstanceUuid || undefined"
              />
            </div>
          </section>
        </ResizablePanel>
      </ResizablePanelGroup>

      <div class="hidden h-full min-h-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:grid xl:hidden">
        <section class="flex min-h-0 flex-col border-r">
          <Tabs v-model="tabletLeftView" class="flex min-h-0 flex-1 flex-col">
            <div class="border-b px-4 py-3">
              <TabsList class="grid w-full grid-cols-2">
                <TabsTrigger value="prompt">{{ t('platform.workbench.agent.sections.prompt') }}</TabsTrigger>
                <TabsTrigger value="orchestration">{{ t('platform.workbench.agent.sections.orchestration') }}</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="prompt" class="mt-0 min-h-0 flex-1 overflow-auto p-3">
              <div class="h-full">
                <AgentPromptEditor
                  :model-value="draftSystemPrompt"
                  :readonly="saving"
                  @update:model-value="draftSystemPrompt = $event"
                />
              </div>
            </TabsContent>
            <TabsContent value="orchestration" class="mt-0 min-h-0 flex-1 overflow-auto p-3">
              <AgentOrchestrationPanel
                :model-value="draftEditableConfig"
                :llm-module-version-uuid="draftLlmModuleVersionUuid"
                :model-options="modelOptions"
                :resources="resources"
                :bindings="bindings"
                :models-loading="modelsLoading"
                :loading-bindings="loadingBindings"
                :syncing-bindings="syncingBindings"
                :readonly="saving"
                @update:model-value="draftEditableConfig = $event"
                @update:llm-module-version-uuid="draftLlmModuleVersionUuid = $event"
                @add-binding="emit('add-binding', $event)"
                @remove-binding="emit('remove-binding', $event)"
              />
            </TabsContent>
          </Tabs>
        </section>

        <section class="flex min-h-0 flex-col">
          <div class="border-b px-4 py-3">
            <h3 class="text-base font-semibold">{{ t('platform.workbench.agent.sections.preview') }}</h3>
          </div>
          <div class="min-h-0 flex-1 overflow-auto">
            <AgentChat
              :client="client"
              :instance-uuid="workspaceInstanceUuid || latestPublishedInstanceUuid || undefined"
            />
          </div>
        </section>
      </div>

      <Tabs v-model="mobileMainView" class="flex h-full min-h-0 flex-col md:hidden">
        <div class="border-b px-3 py-2">
          <TabsList class="grid w-full grid-cols-3">
            <TabsTrigger value="prompt">{{ t('platform.workbench.agent.sections.prompt') }}</TabsTrigger>
            <TabsTrigger value="orchestration">{{ t('platform.workbench.agent.sections.orchestration') }}</TabsTrigger>
            <TabsTrigger value="preview">{{ t('platform.workbench.agent.sections.preview') }}</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="prompt" class="mt-0 min-h-0 flex-1 overflow-auto p-3">
          <div class="h-full">
            <AgentPromptEditor
              :model-value="draftSystemPrompt"
              :readonly="saving"
              @update:model-value="draftSystemPrompt = $event"
            />
          </div>
        </TabsContent>
        <TabsContent value="orchestration" class="mt-0 min-h-0 flex-1 overflow-auto p-3">
          <AgentOrchestrationPanel
            :model-value="draftEditableConfig"
            :llm-module-version-uuid="draftLlmModuleVersionUuid"
            :model-options="modelOptions"
            :resources="resources"
            :bindings="bindings"
            :models-loading="modelsLoading"
            :loading-bindings="loadingBindings"
            :syncing-bindings="syncingBindings"
            :readonly="saving"
            @update:model-value="draftEditableConfig = $event"
            @update:llm-module-version-uuid="draftLlmModuleVersionUuid = $event"
            @add-binding="emit('add-binding', $event)"
            @remove-binding="emit('remove-binding', $event)"
          />
        </TabsContent>
        <TabsContent value="preview" class="mt-0 min-h-0 flex-1 overflow-auto">
          <AgentChat
            :client="client"
            :instance-uuid="workspaceInstanceUuid || latestPublishedInstanceUuid || undefined"
          />
        </TabsContent>
      </Tabs>
    </template>
  </WorkbenchSurface>
</template>
