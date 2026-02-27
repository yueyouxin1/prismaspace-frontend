<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { CodeMirrorMdEditor } from '@repo/editor'
import AgentPromptVariablePanel from '../components/AgentPromptVariablePanel.vue'

withDefaults(
  defineProps<{
    modelValue: string
    readonly?: boolean
  }>(),
  {
    readonly: false,
  },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
}>()
const { t } = useI18n()
</script>

<template>
  <CodeMirrorMdEditor
    :model-value="modelValue"
    :readonly="readonly"
    theme="vs-light"
    line-numbers="off"
    :font-size="14"
    :height="'100%'"
    :popup-component="AgentPromptVariablePanel"
    :trigger-patterns="[/\\{\\{[^}\\n]*$/, /\\$\\{[^}\\n]*$/]"
    :placeholder="t('platform.workbench.agent.promptPlaceholder')"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>
