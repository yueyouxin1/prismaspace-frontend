<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Label } from '@prismaspace/ui-shadcn/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@prismaspace/ui-shadcn/components/ui/select'
import { Switch } from '@prismaspace/ui-shadcn/components/ui/switch'
import AgentResourceBindingSection from './AgentResourceBindingSection.vue'
import type { AgentEditableConfig, AgentKnowledgeCallMode, AgentReferenceBinding, AgentResourceCatalogItem } from '../types/agent-ide'

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

const textBindings = computed(() => props.bindings.filter(binding => binding.sourceNodeUuid === 'knowledge.text'))
const tableBindings = computed(() => props.bindings.filter(binding => binding.sourceNodeUuid === 'knowledge.table'))
const imageBindings = computed(() => props.bindings.filter(binding => binding.sourceNodeUuid === 'knowledge.image'))

const updateRagConfig = (patch: Partial<AgentEditableConfig['ragConfig']>): void => {
  emit('update:modelValue', {
    ...props.modelValue,
    ragConfig: {
      ...props.modelValue.ragConfig,
      ...patch,
    },
  })
}

const onCallModeChange = (value: unknown): void => {
  const mode: AgentKnowledgeCallMode = value === 'always' ? 'always' : 'on_demand'
  updateRagConfig({
    callMode: mode,
  })
}
</script>

<template>
  <div class="space-y-3">
    <div class="space-y-1">
      <h4 class="text-sm font-semibold">{{ t('platform.workbench.agent.knowledge.title') }}</h4>
      <p class="text-xs text-muted-foreground">{{ t('platform.workbench.agent.knowledge.description') }}</p>
    </div>

    <div class="grid grid-cols-1 gap-2 md:grid-cols-3">
      <div class="space-y-2">
        <Label>{{ t('platform.workbench.agent.knowledge.callMode') }}</Label>
        <Select :model-value="modelValue.ragConfig.callMode" :disabled="readonly || syncing" @update:model-value="onCallModeChange">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="on_demand">{{ t('platform.workbench.agent.knowledge.callModeOnDemand') }}</SelectItem>
            <SelectItem value="always">{{ t('platform.workbench.agent.knowledge.callModeAlways') }}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div class="flex items-center justify-between rounded-md border bg-card px-3 py-2">
        <Label>{{ t('platform.workbench.agent.knowledge.enableKnowledge') }}</Label>
        <Switch
          :model-value="modelValue.ragConfig.enabled"
          :disabled="readonly || syncing"
          @update:model-value="updateRagConfig({ enabled: Boolean($event) })"
        />
      </div>
      <div class="flex items-center justify-between rounded-md border bg-card px-3 py-2">
        <Label>{{ t('platform.workbench.agent.knowledge.showSource') }}</Label>
        <Switch
          :model-value="modelValue.ragConfig.showSource"
          :disabled="readonly || syncing"
          @update:model-value="updateRagConfig({ showSource: Boolean($event) })"
        />
      </div>
    </div>

    <AgentResourceBindingSection
      source-node-uuid="knowledge.text"
      :title="t('platform.workbench.agent.knowledge.textTitle')"
      :description="t('platform.workbench.agent.knowledge.textDescription')"
      :resources="resources"
      :bindings="textBindings"
      :allowed-resource-types="['knowledge']"
      :readonly="readonly"
      :syncing="syncing || !modelValue.ragConfig.enabled"
      :resource-type-label-map="resourceTypeLabelMap"
      @add-binding="emit('add-binding', $event)"
      @remove-binding="emit('remove-binding', $event)"
    />

    <AgentResourceBindingSection
      source-node-uuid="knowledge.table"
      :title="t('platform.workbench.agent.knowledge.tableTitle')"
      :description="t('platform.workbench.agent.knowledge.tableDescription')"
      :resources="resources"
      :bindings="tableBindings"
      :allowed-resource-types="['tenantdb']"
      :readonly="readonly"
      :syncing="syncing || !modelValue.ragConfig.enabled"
      :resource-type-label-map="resourceTypeLabelMap"
      @add-binding="emit('add-binding', $event)"
      @remove-binding="emit('remove-binding', $event)"
    />

    <AgentResourceBindingSection
      source-node-uuid="knowledge.image"
      :title="t('platform.workbench.agent.knowledge.imageTitle')"
      :description="t('platform.workbench.agent.knowledge.imageDescription')"
      :resources="resources"
      :bindings="imageBindings"
      :allowed-resource-types="['knowledge']"
      :readonly="readonly"
      :syncing="syncing || !modelValue.ragConfig.enabled"
      :resource-type-label-map="resourceTypeLabelMap"
      @add-binding="emit('add-binding', $event)"
      @remove-binding="emit('remove-binding', $event)"
    />
  </div>
</template>
