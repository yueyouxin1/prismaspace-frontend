<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { WorkbenchSurface, type WorkbenchSaveTrigger } from '@repo/workbench-core'
import { Alert, AlertDescription, AlertTitle } from '@repo/ui-shadcn/components/ui/alert'
import AgentPromptEditor from './sections/AgentPromptEditor.vue'
import AgentOrchestrationPanel from './sections/AgentOrchestrationPanel.vue'
import AgentChatPanel from './sections/AgentChatPanel.vue'
import type {
  AgentEditableConfig,
  AgentIdeSeed,
  AgentInstancePatchPayload,
  AgentModelOption,
  AgentSessionSummary,
  AgentWorkbenchMessage,
} from './types/agent-ide'

const props = withDefaults(
  defineProps<{
    seed: AgentIdeSeed | null
    resourceDescription?: string
    modelOptions: AgentModelOption[]
    sessions: AgentSessionSummary[]
    activeSessionUuid?: string | null
    messages: AgentWorkbenchMessage[]
    loading?: boolean
    saving?: boolean
    modelsLoading?: boolean
    loadingSessions?: boolean
    loadingMessages?: boolean
    creatingSession?: boolean
    executing?: boolean
    publishing?: boolean
    workspaceInstanceUuid?: string | null
    latestPublishedInstanceUuid?: string | null
    updatedAt?: string | null
    lastSavedAt?: string | null
    errorMessage?: string | null
  }>(),
  {
    resourceDescription: '',
    activeSessionUuid: null,
    loading: false,
    saving: false,
    modelsLoading: false,
    loadingSessions: false,
    loadingMessages: false,
    creatingSession: false,
    executing: false,
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
  (event: 'create-session'): void
  (event: 'select-session', sessionUuid: string): void
  (event: 'send-message', text: string): void
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
})

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
  const diversityModeRaw = raw.diversity_mode
  const diversityMode
    = diversityModeRaw === 'precise' || diversityModeRaw === 'balanced' || diversityModeRaw === 'creative' || diversityModeRaw === 'custom'
      ? diversityModeRaw
      : 'balanced'

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

const displayResourceName = computed(() => {
  return props.seed?.resourceName || t('platform.workbench.agent.defaultName')
})

const saveDisabled = computed(() => {
  return props.loading || props.saving || !props.seed || !isDirty.value
})

const publishDisabled = computed(() => {
  return props.loading || props.saving || props.publishing || !props.seed
})

const headerUpdatedAt = computed(() => props.lastSavedAt ?? props.updatedAt)

const buildMergedAgentConfig = (): Record<string, unknown> => {
  const base = cloneRecord(rawAgentConfigBaseline.value)
  const modelParams = toRecord(base.model_params)
  const ioConfig = toRecord(base.io_config)
  const responseFormat = toRecord(ioConfig.response_format)

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

    <div
      v-else
      class="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.95fr)_minmax(0,1fr)]"
    >
      <section class="flex min-h-[420px] min-w-0 flex-col border-b xl:border-r xl:border-b-0">
        <div class="border-b px-4 py-3">
          <h3 class="text-base font-semibold">{{ t('platform.workbench.agent.sections.prompt') }}</h3>
        </div>
        <div class="min-h-0 flex-1 overflow-auto p-3">
          <div class="h-[560px] xl:h-full">
            <AgentPromptEditor
              :model-value="draftSystemPrompt"
              :readonly="saving"
              @update:model-value="draftSystemPrompt = $event"
            />
          </div>
        </div>
      </section>

      <section class="flex min-h-[420px] min-w-0 flex-col border-b xl:border-r xl:border-b-0">
        <div class="border-b px-4 py-3">
          <h3 class="text-base font-semibold">{{ t('platform.workbench.agent.sections.orchestration') }}</h3>
        </div>
        <div class="min-h-0 flex-1 overflow-auto p-4">
          <AgentOrchestrationPanel
            :model-value="draftEditableConfig"
            :llm-module-version-uuid="draftLlmModuleVersionUuid"
            :model-options="modelOptions"
            :models-loading="modelsLoading"
            :readonly="saving"
            @update:model-value="draftEditableConfig = $event"
            @update:llm-module-version-uuid="draftLlmModuleVersionUuid = $event"
          />
        </div>
      </section>

      <section class="flex min-h-[420px] min-w-0 flex-col">
        <div class="border-b px-4 py-3">
          <h3 class="text-base font-semibold">{{ t('platform.workbench.agent.sections.preview') }}</h3>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden p-3">
          <AgentChatPanel
            :resource-name="displayResourceName"
            :sessions="sessions"
            :active-session-uuid="activeSessionUuid"
            :messages="messages"
            :loading-sessions="loadingSessions"
            :loading-messages="loadingMessages"
            :creating-session="creatingSession"
            :executing="executing"
            :error-message="errorMessage"
            @create-session="emit('create-session')"
            @select-session="emit('select-session', $event)"
            @send-message="emit('send-message', $event)"
          />
        </div>
      </section>
    </div>
  </WorkbenchSurface>
</template>
