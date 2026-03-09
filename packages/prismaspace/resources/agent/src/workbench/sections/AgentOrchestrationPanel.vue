<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@prismaspace/ui-shadcn/components/ui/accordion'
import ModelSettingsAccordion from './ModelSettingsAccordion.vue'
import AgentSkillPanel from './AgentSkillPanel.vue'
import AgentKnowledgePanel from './AgentKnowledgePanel.vue'
import AgentMemoryPanel from './AgentMemoryPanel.vue'
import AgentConversationExperiencePanel from './AgentConversationExperiencePanel.vue'
import type {
  AgentEditableConfig,
  AgentModelOption,
  AgentReferenceBinding,
  AgentResourceCatalogItem,
} from '../types/agent-ide'

withDefaults(
  defineProps<{
    modelValue: AgentEditableConfig
    llmModuleVersionUuid?: string | null
    modelOptions: AgentModelOption[]
    resources: AgentResourceCatalogItem[]
    bindings: AgentReferenceBinding[]
    loadingBindings?: boolean
    syncingBindings?: boolean
    modelsLoading?: boolean
    readonly?: boolean
  }>(),
  {
    llmModuleVersionUuid: null,
    resources: () => [],
    bindings: () => [],
    loadingBindings: false,
    syncingBindings: false,
    modelsLoading: false,
    readonly: false,
  },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: AgentEditableConfig): void
  (event: 'update:llmModuleVersionUuid', value: string): void
  (event: 'add-binding', payload: { sourceNodeUuid: string, targetInstanceUuid: string }): void
  (event: 'remove-binding', payload: { sourceNodeUuid: string, targetInstanceUuid: string }): void
}>()
const { t } = useI18n()

const resourceTypeLabelMap = {
  tool: t('platform.workbench.agent.bindings.resourceTypes.tool'),
  workflow: t('platform.workbench.agent.bindings.resourceTypes.workflow'),
  knowledge: t('platform.workbench.agent.bindings.resourceTypes.knowledge'),
  tenantdb: t('platform.workbench.agent.bindings.resourceTypes.tenantdb'),
  agent: t('platform.workbench.agent.bindings.resourceTypes.agent'),
  uiapp: t('platform.workbench.agent.bindings.resourceTypes.uiapp'),
}
</script>

<template>
  <div class="space-y-4">
    <div class="space-y-1">
      <h3 class="text-base font-semibold">{{ t('platform.workbench.agent.orchestration.title') }}</h3>
      <p class="text-xs text-muted-foreground">{{ t('platform.workbench.agent.orchestration.description') }}</p>
    </div>

    <Accordion type="multiple" :default-value="['model', 'skill', 'knowledge', 'memory', 'experience']">
      <AccordionItem value="model">
        <AccordionTrigger class="text-sm font-semibold hover:no-underline">
          {{ t('platform.workbench.agent.modelSettings.title') }}
        </AccordionTrigger>
        <AccordionContent>
          <ModelSettingsAccordion
            :model-value="modelValue"
            :llm-module-version-uuid="llmModuleVersionUuid"
            :model-options="modelOptions"
            :models-loading="modelsLoading"
            :readonly="readonly"
            @update:model-value="emit('update:modelValue', $event)"
            @update:llm-module-version-uuid="emit('update:llmModuleVersionUuid', $event)"
          />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="skill">
        <AccordionTrigger class="text-sm font-semibold hover:no-underline">
          {{ t('platform.workbench.agent.skill.title') }}
        </AccordionTrigger>
        <AccordionContent>
          <AgentSkillPanel
            :model-value="modelValue"
            :resources="resources"
            :bindings="bindings"
            :readonly="readonly"
            :syncing="syncingBindings"
            :resource-type-label-map="resourceTypeLabelMap"
            @update:model-value="emit('update:modelValue', $event)"
            @add-binding="emit('add-binding', $event)"
            @remove-binding="emit('remove-binding', $event)"
          />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="knowledge">
        <AccordionTrigger class="text-sm font-semibold hover:no-underline">
          {{ t('platform.workbench.agent.knowledge.title') }}
        </AccordionTrigger>
        <AccordionContent>
          <AgentKnowledgePanel
            :model-value="modelValue"
            :resources="resources"
            :bindings="bindings"
            :readonly="readonly"
            :syncing="syncingBindings || loadingBindings"
            :resource-type-label-map="resourceTypeLabelMap"
            @update:model-value="emit('update:modelValue', $event)"
            @add-binding="emit('add-binding', $event)"
            @remove-binding="emit('remove-binding', $event)"
          />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="memory">
        <AccordionTrigger class="text-sm font-semibold hover:no-underline">
          {{ t('platform.workbench.agent.memory.title') }}
        </AccordionTrigger>
        <AccordionContent>
          <AgentMemoryPanel
            :model-value="modelValue"
            :resources="resources"
            :bindings="bindings"
            :readonly="readonly"
            :syncing="syncingBindings || loadingBindings"
            :resource-type-label-map="resourceTypeLabelMap"
            @update:model-value="emit('update:modelValue', $event)"
            @add-binding="emit('add-binding', $event)"
            @remove-binding="emit('remove-binding', $event)"
          />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="experience">
        <AccordionTrigger class="text-sm font-semibold hover:no-underline">
          {{ t('platform.workbench.agent.experience.title') }}
        </AccordionTrigger>
        <AccordionContent>
          <AgentConversationExperiencePanel
            :model-value="modelValue"
            :readonly="readonly"
            @update:model-value="emit('update:modelValue', $event)"
          />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  </div>
</template>
