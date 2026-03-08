<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { PlusIcon, Trash2Icon } from 'lucide-vue-next'
import { Button } from '@repo/ui-shadcn/components/ui/button'
import { Input } from '@repo/ui-shadcn/components/ui/input'
import { Label } from '@repo/ui-shadcn/components/ui/label'
import { Switch } from '@repo/ui-shadcn/components/ui/switch'
import { Textarea } from '@repo/ui-shadcn/components/ui/textarea'
import type { AgentEditableConfig } from '../types/agent-ide'

const props = withDefaults(
  defineProps<{
    modelValue: AgentEditableConfig
    readonly?: boolean
  }>(),
  {
    readonly: false,
  },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: AgentEditableConfig): void
}>()

const { t } = useI18n()
const nextQuestion = ref('')

const conversationConfig = computed(() => props.modelValue.uiConfig.conversation)

const updateConversationConfig = (patch: Partial<AgentEditableConfig['uiConfig']['conversation']>): void => {
  emit('update:modelValue', {
    ...props.modelValue,
    uiConfig: {
      ...props.modelValue.uiConfig,
      conversation: {
        ...props.modelValue.uiConfig.conversation,
        ...patch,
      },
    },
  })
}

const handleAddQuestion = (): void => {
  const value = nextQuestion.value.trim()
  if (!value) {
    return
  }
  updateConversationConfig({
    presetQuestions: [...conversationConfig.value.presetQuestions, value],
  })
  nextQuestion.value = ''
}

const handleRemoveQuestion = (index: number): void => {
  const values = [...conversationConfig.value.presetQuestions]
  values.splice(index, 1)
  updateConversationConfig({
    presetQuestions: values,
  })
}
</script>

<template>
  <div class="space-y-3">
    <div class="space-y-1">
      <h4 class="text-sm font-semibold">{{ t('platform.workbench.agent.experience.title') }}</h4>
      <p class="text-xs text-muted-foreground">{{ t('platform.workbench.agent.experience.description') }}</p>
    </div>

    <div class="space-y-2 rounded-lg border bg-card p-3">
      <Label>{{ t('platform.workbench.agent.experience.openingMessage') }}</Label>
      <Textarea
        :model-value="conversationConfig.openingMessage"
        :disabled="readonly"
        :rows="4"
        :placeholder="t('platform.workbench.agent.experience.openingPlaceholder')"
        @update:model-value="updateConversationConfig({ openingMessage: String($event || '') })"
      />
    </div>

    <div class="space-y-2 rounded-lg border bg-card p-3">
      <div class="flex items-center justify-between">
        <Label>{{ t('platform.workbench.agent.experience.presetQuestions') }}</Label>
        <div class="flex items-center gap-2">
          <Input
            v-model="nextQuestion"
            class="h-8 w-52"
            :disabled="readonly"
            :placeholder="t('platform.workbench.agent.experience.presetPlaceholder')"
          />
          <Button size="sm" :disabled="readonly || !nextQuestion.trim()" @click="handleAddQuestion">
            <PlusIcon class="mr-1 size-3.5" />
            {{ t('platform.workbench.agent.experience.addQuestion') }}
          </Button>
        </div>
      </div>

      <div v-if="!conversationConfig.presetQuestions.length" class="rounded border border-dashed p-2 text-xs text-muted-foreground">
        {{ t('platform.workbench.agent.experience.presetEmpty') }}
      </div>
      <div v-else class="space-y-2">
        <div
          v-for="(question, index) in conversationConfig.presetQuestions"
          :key="`${question}-${index}`"
          class="flex items-center justify-between gap-2 rounded border bg-background px-2 py-1.5"
        >
          <p class="truncate text-sm">{{ question }}</p>
          <Button size="icon" variant="ghost" :disabled="readonly" @click="handleRemoveQuestion(index)">
            <Trash2Icon class="size-4 text-destructive" />
          </Button>
        </div>
      </div>
    </div>

    <div class="flex items-center justify-between rounded-lg border bg-card px-3 py-2">
      <Label>{{ t('platform.workbench.agent.experience.showAllPreset') }}</Label>
      <Switch
        :model-value="conversationConfig.showAllPresetQuestions"
        :disabled="readonly"
        @update:model-value="updateConversationConfig({ showAllPresetQuestions: Boolean($event) })"
      />
    </div>
  </div>
</template>
