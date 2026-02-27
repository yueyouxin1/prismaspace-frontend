<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import ModelSettingsAccordion from './ModelSettingsAccordion.vue'
import type {
  AgentEditableConfig,
  AgentModelOption,
} from '../types/agent-ide'

withDefaults(
  defineProps<{
    modelValue: AgentEditableConfig
    llmModuleVersionUuid?: string | null
    modelOptions: AgentModelOption[]
    modelsLoading?: boolean
    readonly?: boolean
  }>(),
  {
    llmModuleVersionUuid: null,
    modelsLoading: false,
    readonly: false,
  },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: AgentEditableConfig): void
  (event: 'update:llmModuleVersionUuid', value: string): void
}>()
const { t } = useI18n()
</script>

<template>
  <div class="space-y-4">
    <div class="space-y-1">
      <h3 class="text-base font-semibold">{{ t('platform.workbench.agent.orchestration.title') }}</h3>
      <p class="text-xs text-muted-foreground">{{ t('platform.workbench.agent.orchestration.description') }}</p>
    </div>

    <ModelSettingsAccordion
      :model-value="modelValue"
      :llm-module-version-uuid="llmModuleVersionUuid"
      :model-options="modelOptions"
      :models-loading="modelsLoading"
      :readonly="readonly"
      @update:model-value="emit('update:modelValue', $event)"
      @update:llm-module-version-uuid="emit('update:llmModuleVersionUuid', $event)"
    />
  </div>
</template>
