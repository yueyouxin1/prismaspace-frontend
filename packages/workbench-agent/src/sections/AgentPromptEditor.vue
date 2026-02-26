<script setup lang="ts">
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
    placeholder="编写系统提示词。输入 {{ 或 ${ 可插入表达式变量。"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>

