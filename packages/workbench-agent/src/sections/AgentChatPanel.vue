<script setup lang="ts">
import { computed } from 'vue'
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
  Message,
  MessageContent,
  MessageResponse,
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from '@repo/ui-ai-elements'
import { Badge } from '@repo/ui-shadcn/components/ui/badge'
import { Button } from '@repo/ui-shadcn/components/ui/button'
import type {
  AgentSessionSummary,
  AgentWorkbenchMessage,
} from '../types/agent-ide'

const props = withDefaults(
  defineProps<{
    resourceName: string
    sessions: AgentSessionSummary[]
    activeSessionUuid?: string | null
    messages: AgentWorkbenchMessage[]
    loadingSessions?: boolean
    loadingMessages?: boolean
    creatingSession?: boolean
    executing?: boolean
    errorMessage?: string | null
  }>(),
  {
    activeSessionUuid: null,
    loadingSessions: false,
    loadingMessages: false,
    creatingSession: false,
    executing: false,
    errorMessage: null,
  },
)

const emit = defineEmits<{
  (event: 'create-session'): void
  (event: 'select-session', sessionUuid: string): void
  (event: 'send-message', text: string): void
}>()

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
      content = '（空消息）'
    }
    return {
      id: message.uuid,
      from: (message.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content,
    }
  })
})

const submitStatus = computed(() => {
  return props.executing ? 'submitted' : undefined
})

const handleSubmit = (payload: { text: string }): void => {
  const nextText = payload.text.trim()
  if (!nextText) {
    return
  }
  emit('send-message', nextText)
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col gap-3">
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <h3 class="text-sm font-semibold">会话</h3>
        <Badge variant="outline">{{ sessions.length }}</Badge>
      </div>
      <Button
        size="sm"
        variant="outline"
        :disabled="creatingSession"
        @click="emit('create-session')"
      >
        {{ creatingSession ? '创建中...' : '新建会话' }}
      </Button>
    </div>

    <div class="flex gap-2 overflow-auto pb-1">
      <Button
        v-for="session in sessions"
        :key="session.uuid"
        size="sm"
        :variant="activeSessionUuid === session.uuid ? 'default' : 'outline'"
        class="max-w-[220px] shrink-0 justify-start"
        @click="emit('select-session', session.uuid)"
      >
        <span class="truncate">{{ session.title || '未命名会话' }}</span>
      </Button>
      <p v-if="loadingSessions" class="self-center text-xs text-muted-foreground">正在加载会话...</p>
    </div>

    <div class="relative min-h-0 flex-1 overflow-hidden rounded-md border bg-muted/10">
      <Conversation class="size-full">
        <ConversationContent>
          <ConversationEmptyState
            v-if="!normalizedMessages.length && !loadingMessages"
            title="预览与调试"
            :description="activeSessionUuid ? '发送消息开始调试。' : '请先新建会话。'"
          />
          <p v-if="loadingMessages" class="text-sm text-muted-foreground">正在加载消息...</p>
          <Message
            v-for="message in normalizedMessages"
            :key="message.id"
            :from="message.from"
          >
            <MessageContent>
              <MessageResponse :content="message.content" />
            </MessageContent>
          </Message>
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
    </div>

    <PromptInput class="w-full rounded-md border bg-background p-1" @submit="handleSubmit">
      <PromptInputBody>
        <PromptInputTextarea :disabled="executing" placeholder="发送消息..." />
      </PromptInputBody>
      <PromptInputFooter>
        <p class="text-xs text-muted-foreground">
          {{ errorMessage || (activeSessionUuid ? `当前会话：${resourceName}` : '未选择会话，将自动创建新会话') }}
        </p>
        <PromptInputSubmit :disabled="executing" :status="submitStatus" />
      </PromptInputFooter>
    </PromptInput>
  </div>
</template>
