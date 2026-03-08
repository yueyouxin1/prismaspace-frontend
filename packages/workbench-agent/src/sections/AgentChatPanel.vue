<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
  Loader,
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from '@repo/ui-ai-elements'
import { RefreshCcwIcon } from 'lucide-vue-next'
import { Button } from '@repo/ui-shadcn/components/ui/button'
import type {
  AgentWorkbenchMessage,
} from '../types/agent-ide'

const props = withDefaults(
  defineProps<{
    activeSessionUuid?: string | null
    messages: AgentWorkbenchMessage[]
    loadingMessages?: boolean
    executing?: boolean
    errorMessage?: string | null
    suggestions?: string[]
    canRetry?: boolean
  }>(),
  {
    activeSessionUuid: null,
    loadingMessages: false,
    executing: false,
    errorMessage: null,
    suggestions: () => [],
    canRetry: false,
  },
)

const emit = defineEmits<{
  (event: 'send-message', text: string): void
  (event: 'stop-stream'): void
  (event: 'retry-last-user'): void
  (event: 'continue-message'): void
}>()

const { t } = useI18n()

const toJsonString = (value: unknown): string => {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

const normalizedMessages = computed(() => {
  return props.messages.map((message) => {
    let content = (message.content ?? '').trim()
    if (!content && message.toolCalls && message.toolCalls.length > 0) {
      content = `\`\`\`json\n${toJsonString(message.toolCalls)}\n\`\`\``
    }
    if (!content && message.meta) {
      content = `\`\`\`json\n${toJsonString(message.meta)}\n\`\`\``
    }
    if (!content) {
      content = t('platform.workbench.agent.chat.emptyMessage')
    }
    return {
      id: message.uuid,
      from: (message.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content,
      reasoning: message.reasoning?.trim() || '',
      streaming: Boolean(message.streaming),
      references: message.references ?? [],
    }
  })
})

const submitStatus = computed(() => {
  return props.executing ? 'submitted' : undefined
})

const handleSubmit = (payload: { text?: string | null }): void => {
  const nextText = (payload.text ?? '').trim()
  if (!nextText) {
    return
  }
  emit('send-message', nextText)
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col gap-3 rounded-md border bg-background p-3">
    <div v-if="suggestions.length" class="flex flex-wrap items-center gap-2">
      <Button
        v-for="item in suggestions.slice(0, 6)"
        :key="item"
        size="sm"
        variant="outline"
        :disabled="executing"
        @click="emit('send-message', item)"
      >
        {{ item }}
      </Button>
    </div>

    <div class="relative min-h-0 flex-1 overflow-hidden rounded-md border bg-muted/10">
      <Conversation class="size-full">
        <ConversationContent>
          <ConversationEmptyState
            v-if="!normalizedMessages.length && !loadingMessages"
            :title="t('platform.workbench.agent.sections.preview')"
            :description="activeSessionUuid ? t('platform.workbench.agent.chat.sendToDebug') : t('platform.workbench.agent.chat.createSessionFirst')"
          />
          <p v-if="loadingMessages" class="text-sm text-muted-foreground">{{ t('platform.workbench.agent.chat.loadingMessages') }}</p>
          <template
            v-for="message in normalizedMessages"
            :key="message.id"
          >
            <Sources
              v-if="message.from === 'assistant' && message.references.length"
              class="mb-1"
            >
              <SourcesTrigger :count="message.references.length" />
              <SourcesContent
                v-for="(source, index) in message.references"
                :key="`${message.id}-source-${index}`"
              >
                <Source :href="source.url || '#'" :title="source.title" />
              </SourcesContent>
            </Sources>

            <Message :from="message.from">
              <div class="w-full">
                <Reasoning
                  v-if="message.reasoning && message.from === 'assistant'"
                  class="mb-1 w-full"
                  :is-streaming="executing && message.streaming"
                >
                  <ReasoningTrigger />
                  <ReasoningContent :content="message.reasoning" />
                </Reasoning>
                <MessageContent>
                  <MessageResponse :content="message.content" />
                </MessageContent>
                <MessageActions v-if="message.from === 'assistant' && canRetry && !executing">
                  <MessageAction :label="t('common.retry')" @click="emit('retry-last-user')">
                    <RefreshCcwIcon class="size-3" />
                  </MessageAction>
                </MessageActions>
              </div>
            </Message>
          </template>
          <Loader v-if="executing && !normalizedMessages.length" class="mx-auto" />
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
    </div>

    <PromptInput class="w-full rounded-md border bg-background p-1" @submit="handleSubmit">
      <PromptInputBody>
        <PromptInputTextarea :disabled="executing" :placeholder="t('platform.workbench.agent.chat.inputPlaceholder')" />
      </PromptInputBody>
      <PromptInputFooter>
        <PromptInputTools>
          <PromptInputActionMenu>
            <PromptInputActionMenuTrigger />
            <PromptInputActionMenuContent>
              <PromptInputActionAddAttachments />
            </PromptInputActionMenuContent>
          </PromptInputActionMenu>
          <PromptInputButton :disabled="executing" variant="ghost" @click="emit('continue-message')">
            {{ t('common.continue') }}
          </PromptInputButton>
        </PromptInputTools>
        <div class="flex items-center gap-2">
          <p class="text-xs text-muted-foreground">
            {{ errorMessage || (activeSessionUuid ? t('platform.workbench.agent.chat.currentSessionActive') : t('platform.workbench.agent.chat.autoCreateSession')) }}
          </p>
          <Button
            v-if="executing"
            size="sm"
            variant="outline"
            @click="emit('stop-stream')"
          >
            {{ t('platform.workbench.agent.chat.stop') }}
          </Button>
        </div>
        <PromptInputSubmit :disabled="executing" :status="submitStatus" />
      </PromptInputFooter>
    </PromptInput>
  </div>
</template>
