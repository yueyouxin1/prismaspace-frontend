<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Switch } from '@repo/ui-shadcn/components/ui/switch'
import { Label } from '@repo/ui-shadcn/components/ui/label'
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

const pluginBindings = computed(() => {
  return props.bindings.filter(binding => binding.sourceNodeUuid === 'skill.plugin')
})

const workflowBindings = computed(() => {
  return props.bindings.filter(binding => binding.sourceNodeUuid === 'skill.workflow')
})

const updateSkillConfig = (patch: Partial<AgentEditableConfig['uiConfig']['skill']>): void => {
  emit('update:modelValue', {
    ...props.modelValue,
    uiConfig: {
      ...props.modelValue.uiConfig,
      skill: {
        ...props.modelValue.uiConfig.skill,
        ...patch,
      },
    },
  })
}
</script>

<template>
  <div class="space-y-3">
    <div class="space-y-1">
      <h4 class="text-sm font-semibold">{{ t('platform.workbench.agent.skill.title') }}</h4>
      <p class="text-xs text-muted-foreground">{{ t('platform.workbench.agent.skill.description') }}</p>
    </div>

    <div class="grid grid-cols-1 gap-2 md:grid-cols-2">
      <div class="flex items-center justify-between rounded-md border bg-card px-3 py-2">
        <Label>{{ t('platform.workbench.agent.skill.enablePlugins') }}</Label>
        <Switch
          :model-value="modelValue.uiConfig.skill.enablePlugins"
          :disabled="readonly || syncing"
          @update:model-value="updateSkillConfig({ enablePlugins: Boolean($event) })"
        />
      </div>
      <div class="flex items-center justify-between rounded-md border bg-card px-3 py-2">
        <Label>{{ t('platform.workbench.agent.skill.enableWorkflow') }}</Label>
        <Switch
          :model-value="modelValue.uiConfig.skill.enableWorkflow"
          :disabled="readonly || syncing"
          @update:model-value="updateSkillConfig({ enableWorkflow: Boolean($event) })"
        />
      </div>
    </div>

    <AgentResourceBindingSection
      source-node-uuid="skill.plugin"
      :title="t('platform.workbench.agent.skill.pluginsTitle')"
      :description="t('platform.workbench.agent.skill.pluginsDescription')"
      :resources="resources"
      :bindings="pluginBindings"
      :allowed-resource-types="['tool']"
      :readonly="readonly"
      :syncing="syncing || !modelValue.uiConfig.skill.enablePlugins"
      :resource-type-label-map="resourceTypeLabelMap"
      @add-binding="emit('add-binding', $event)"
      @remove-binding="emit('remove-binding', $event)"
    />

    <AgentResourceBindingSection
      source-node-uuid="skill.workflow"
      :title="t('platform.workbench.agent.skill.workflowTitle')"
      :description="t('platform.workbench.agent.skill.workflowDescription')"
      :resources="resources"
      :bindings="workflowBindings"
      :allowed-resource-types="['workflow']"
      :readonly="readonly"
      :syncing="syncing || !modelValue.uiConfig.skill.enableWorkflow"
      :resource-type-label-map="resourceTypeLabelMap"
      @add-binding="emit('add-binding', $event)"
      @remove-binding="emit('remove-binding', $event)"
    />
  </div>
</template>
