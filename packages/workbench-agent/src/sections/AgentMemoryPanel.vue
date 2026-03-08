<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Label } from '@repo/ui-shadcn/components/ui/label'
import { Input } from '@repo/ui-shadcn/components/ui/input'
import { Slider } from '@repo/ui-shadcn/components/ui/slider'
import { Switch } from '@repo/ui-shadcn/components/ui/switch'
import AgentResourceBindingSection from './AgentResourceBindingSection.vue'
import type { AgentEditableConfig, AgentReferenceBinding, AgentResourceCatalogItem } from '../types/agent-ide'

const props = withDefaults(
  defineProps<{
    modelValue: AgentEditableConfig
    resources: AgentResourceCatalogItem[]
    bindings: AgentReferenceBinding[]
    readonly?: boolean
    syncing?: boolean
    resourceTypeLabelMap?: Record<string, string>
  }>(),
  {
    readonly: false,
    syncing: false,
    resourceTypeLabelMap: () => ({}),
  },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: AgentEditableConfig): void
  (event: 'add-binding', payload: { sourceNodeUuid: string, targetInstanceUuid: string }): void
  (event: 'remove-binding', payload: { sourceNodeUuid: string, targetInstanceUuid: string }): void
}>()

const { t } = useI18n()

const databaseBindings = computed(() => props.bindings.filter(binding => binding.sourceNodeUuid === 'memory.database'))

const updateDeepMemory = (patch: Partial<AgentEditableConfig['deepMemoryConfig']>): void => {
  emit('update:modelValue', {
    ...props.modelValue,
    deepMemoryConfig: {
      ...props.modelValue.deepMemoryConfig,
      ...patch,
    },
  })
}

const updateMemoryUi = (patch: Partial<AgentEditableConfig['uiConfig']['memory']>): void => {
  emit('update:modelValue', {
    ...props.modelValue,
    uiConfig: {
      ...props.modelValue.uiConfig,
      memory: {
        ...props.modelValue.uiConfig.memory,
        ...patch,
      },
    },
  })
}

const parsePositiveInteger = (value: unknown, fallback: number): number => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return fallback
  }
  return Math.max(1, Math.round(parsed))
}

const parseBoundedFloat = (value: unknown, fallback: number): number => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return fallback
  }
  return Math.min(1, Math.max(0, parsed))
}

const variableInput = computed({
  get: () => props.modelValue.uiConfig.memory.variableKeys.join(', '),
  set: (value: string) => {
    const values = value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
    updateMemoryUi({
      variableKeys: values,
    })
  },
})
</script>

<template>
  <div class="space-y-3">
    <div class="space-y-1">
      <h4 class="text-sm font-semibold">{{ t('platform.workbench.agent.memory.title') }}</h4>
      <p class="text-xs text-muted-foreground">{{ t('platform.workbench.agent.memory.description') }}</p>
    </div>

    <div class="grid grid-cols-1 gap-2 md:grid-cols-2">
      <div class="flex items-center justify-between rounded-md border bg-card px-3 py-2">
        <Label>{{ t('platform.workbench.agent.memory.enableLongTerm') }}</Label>
        <Switch
          :model-value="modelValue.deepMemoryConfig.enabled"
          :disabled="readonly || syncing"
          @update:model-value="updateDeepMemory({ enabled: Boolean($event) })"
        />
      </div>
      <div class="flex items-center justify-between rounded-md border bg-card px-3 py-2">
        <Label>{{ t('platform.workbench.agent.memory.enableFileBox') }}</Label>
        <Switch
          :model-value="modelValue.uiConfig.memory.enableFileBox"
          :disabled="readonly || syncing"
          @update:model-value="updateMemoryUi({ enableFileBox: Boolean($event) })"
        />
      </div>
      <div class="flex items-center justify-between rounded-md border bg-card px-3 py-2">
        <Label>{{ t('platform.workbench.agent.memory.enableDatabase') }}</Label>
        <Switch
          :model-value="modelValue.uiConfig.memory.enableDatabaseMemory"
          :disabled="readonly || syncing"
          @update:model-value="updateMemoryUi({ enableDatabaseMemory: Boolean($event) })"
        />
      </div>
      <div class="flex items-center justify-between rounded-md border bg-card px-3 py-2">
        <Label>{{ t('platform.workbench.agent.memory.enableSummary') }}</Label>
        <Switch
          :model-value="modelValue.deepMemoryConfig.enableSummarization"
          :disabled="readonly || syncing || !modelValue.deepMemoryConfig.enabled"
          @update:model-value="updateDeepMemory({ enableSummarization: Boolean($event) })"
        />
      </div>
    </div>

    <div class="grid grid-cols-1 gap-2 rounded-md border bg-card p-3 md:grid-cols-2">
      <div class="space-y-2">
        <Label>{{ t('platform.workbench.agent.memory.maxRecallTurns') }}</Label>
        <Input
          type="number"
          min="1"
          max="10"
          :model-value="String(modelValue.deepMemoryConfig.maxRecallTurns)"
          :disabled="readonly || syncing || !modelValue.deepMemoryConfig.enabled"
          @update:model-value="updateDeepMemory({ maxRecallTurns: parsePositiveInteger($event, modelValue.deepMemoryConfig.maxRecallTurns) })"
        />
      </div>
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <Label>{{ t('platform.workbench.agent.memory.minMatchScore') }}</Label>
          <span class="text-xs text-muted-foreground">{{ modelValue.deepMemoryConfig.minMatchScore.toFixed(2) }}</span>
        </div>
        <Slider
          :model-value="[modelValue.deepMemoryConfig.minMatchScore]"
          :max="1"
          :step="0.01"
          :disabled="readonly || syncing || !modelValue.deepMemoryConfig.enabled"
          @update:model-value="updateDeepMemory({ minMatchScore: parseBoundedFloat($event?.[0], modelValue.deepMemoryConfig.minMatchScore) })"
        />
      </div>
      <div class="space-y-2">
        <Label>{{ t('platform.workbench.agent.memory.maxSummaryTurns') }}</Label>
        <Input
          type="number"
          min="1"
          max="10"
          :model-value="String(modelValue.deepMemoryConfig.maxSummaryTurns)"
          :disabled="readonly || syncing || !modelValue.deepMemoryConfig.enableSummarization"
          @update:model-value="updateDeepMemory({ maxSummaryTurns: parsePositiveInteger($event, modelValue.deepMemoryConfig.maxSummaryTurns) })"
        />
      </div>
      <div class="space-y-2">
        <Label>{{ t('platform.workbench.agent.memory.variables') }}</Label>
        <Input
          v-model="variableInput"
          :disabled="readonly || syncing"
          :placeholder="t('platform.workbench.agent.memory.variablesPlaceholder')"
        />
      </div>
    </div>

    <AgentResourceBindingSection
      source-node-uuid="memory.database"
      :title="t('platform.workbench.agent.memory.databaseTitle')"
      :description="t('platform.workbench.agent.memory.databaseDescription')"
      :resources="resources"
      :bindings="databaseBindings"
      :allowed-resource-types="['tenantdb']"
      :readonly="readonly"
      :syncing="syncing || !modelValue.uiConfig.memory.enableDatabaseMemory"
      :resource-type-label-map="resourceTypeLabelMap"
      @add-binding="emit('add-binding', $event)"
      @remove-binding="emit('remove-binding', $event)"
    />
  </div>
</template>
