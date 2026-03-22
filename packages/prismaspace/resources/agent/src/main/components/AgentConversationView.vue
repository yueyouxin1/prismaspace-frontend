<script setup lang="ts">
import type { DisplayMessage } from '../agent-chat.types'
import { Alert, AlertDescription } from '@prismaspace/ui-shadcn/components/ui/alert'
import { Badge } from '@prismaspace/ui-shadcn/components/ui/badge'
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@prismaspace/ui-ai-elements/components/ai-elements/conversation'
import {
  Message,
  MessageAttachments,
  MessageContent,
  MessageResponse,
} from '@prismaspace/ui-ai-elements/components/ai-elements/message'
import { Loader } from '@prismaspace/ui-ai-elements/components/ai-elements/loader'
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@prismaspace/ui-ai-elements/components/ai-elements/reasoning'
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from '@prismaspace/ui-ai-elements/components/ai-elements/sources'
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from '@prismaspace/ui-ai-elements/components/ai-elements/tool'
import { AlertCircleIcon } from 'lucide-vue-next'
import { computed } from 'vue'

const props = defineProps<{
  conversationKey: string
  messages: DisplayMessage[]
  shellError: string | null
  showAuthFallbackNotice: boolean
  showIntro: boolean
  emptyTitle: string
  emptySubtitle: string
  loadingMessages: boolean
  copy: Record<string, string>
  compact?: boolean
}>()

const contentClass = computed(() => (
  props.compact
    ? (props.showIntro ? 'gap-3 px-3 pb-2 pt-0' : 'gap-4 px-3 pb-12 pt-0')
    : (props.showIntro ? 'gap-4 px-4 pb-4 pt-0 md:px-8 md:pb-4' : 'gap-6 px-4 pb-16 pt-0 md:px-8 md:pb-18')
))

function mapToolState(status: DisplayMessage['toolCalls'][number]['status']): 'input-available' | 'output-available' | 'output-error' {
  if (status === 'running') {
    return 'input-available'
  }
  if (status === 'error') {
    return 'output-error'
  }
  return 'output-available'
}

function parseToolPayload(value?: string): unknown {
  if (!value) {
    return undefined
  }
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}
</script>

<template>
  <Conversation
    :key="conversationKey"
    class="relative min-h-0 flex-1"
    initial="instant"
    :resize="{ damping: 0.72, stiffness: 0.08, mass: 1.02 }"
  >
    <ConversationContent :class="contentClass">
      <div class="mx-auto flex min-w-0 w-full max-w-4xl flex-col gap-6 py-3 md:py-4" :class="props.compact ? 'gap-4 py-2' : ''">
        <Alert
          v-if="shellError"
          variant="destructive"
          class="rounded-[20px] border-rose-200 bg-rose-50 shadow-[0_10px_24px_rgba(244,63,94,0.06)]"
        >
          <AlertCircleIcon class="size-4" />
          <AlertDescription class="text-sm text-rose-700">
            {{ shellError }}
          </AlertDescription>
        </Alert>

        <Alert
          v-if="showAuthFallbackNotice"
          class="rounded-[18px] border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
        >
          <AlertDescription class="text-xs leading-6 text-slate-500">
            {{ copy.authFallback }}
          </AlertDescription>
        </Alert>

        <ConversationEmptyState
          v-if="showIntro"
          class="min-h-[26vh] gap-2 px-4 text-center md:min-h-[32vh]"
          :class="props.compact ? 'min-h-[18vh] px-3' : ''"
        >
          <div class="space-y-3">
            <h2 class="text-[24px] font-semibold tracking-[-0.04em] text-slate-900 md:text-[34px]" :class="props.compact ? 'text-[20px] md:text-[20px]' : ''">
              {{ emptyTitle }}
            </h2>
            <p v-if="emptySubtitle" class="max-w-2xl text-sm leading-7 text-slate-500 md:text-[15px]" :class="props.compact ? 'leading-6 text-[13px]' : ''">
              {{ emptySubtitle }}
            </p>
          </div>
        </ConversationEmptyState>

        <Alert
          v-if="loadingMessages"
          class="rounded-[18px] border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
        >
          <AlertDescription class="text-sm text-slate-500">
            {{ copy.loadingMessages }}
          </AlertDescription>
        </Alert>

        <Message
          v-for="message in messages"
          :key="message.id"
          :from="message.role === 'user' ? 'user' : 'assistant'"
          :class="message.role === 'assistant' ? (props.compact ? 'min-w-0 w-full max-w-full' : 'min-w-0 w-full max-w-3xl') : 'min-w-0'"
        >
          <div class="min-w-0 w-full space-y-4">
            <Reasoning
              v-if="message.role !== 'user' && message.reasoning"
              :open="message.reasoningOpen"
              :is-streaming="message.streaming"
              @update:open="message.reasoningOpen = $event"
            >
              <ReasoningTrigger />
              <ReasoningContent :content="message.reasoning" />
            </Reasoning>

            <div v-if="message.role !== 'user' && message.toolCalls.length" class="grid min-w-0 gap-3">
              <Tool
                v-for="tool in message.toolCalls"
                :key="tool.id"
                class="min-w-0 rounded-[18px] border-slate-200 bg-white shadow-[0_6px_18px_rgba(15,23,42,0.04)]"
              >
                <ToolHeader
                  type="dynamic-tool"
                  :tool-name="tool.name"
                  :title="tool.name"
                  :state="mapToolState(tool.status)"
                />
                <ToolContent>
                  <ToolInput
                    v-if="tool.args"
                    :input="parseToolPayload(tool.args)"
                    class="border-t border-slate-100"
                  />
                  <ToolOutput
                    v-if="tool.result || tool.error"
                    :output="parseToolPayload(tool.result)"
                    :error-text="tool.error || undefined"
                    :class="tool.args ? 'border-t border-slate-100' : ''"
                  />
                </ToolContent>
              </Tool>
            </div>

            <MessageContent :class="message.role === 'assistant' ? 'min-w-0 w-full overflow-hidden' : ''">
              <Alert
                v-if="message.error"
                variant="destructive"
                class="mb-4 rounded-[18px] border-rose-200 bg-rose-50"
              >
                <AlertCircleIcon class="size-4" />
                <AlertDescription class="text-sm text-rose-700">
                  {{ message.error }}
                </AlertDescription>
              </Alert>

              <p
                v-if="message.role === 'user' && !message.content"
                class="text-sm text-slate-500"
              >
                {{ copy.attachmentOnlyLabel }}
              </p>

              <MessageResponse
                v-else-if="message.content"
                :content="message.content"
                class="min-w-0 w-full overflow-hidden break-words"
              />

              <div v-else class="flex items-center gap-3 text-sm text-slate-500">
                <Loader class="text-slate-400" :size="14" />
                {{ copy.noContent }}
              </div>
            </MessageContent>

            <MessageAttachments
              v-if="message.role === 'user' && message.attachments.length"
              class="justify-end gap-2"
            >
              <Badge
                v-for="attachment in message.attachments"
                :key="attachment.id"
                variant="secondary"
                class="max-w-[220px] rounded-full px-3 py-1.5 text-xs font-normal"
              >
                <span class="truncate">{{ attachment.name }}</span>
              </Badge>
            </MessageAttachments>

            <Sources
              v-if="message.role !== 'user' && message.sources.length"
              class="min-w-0 rounded-[18px] bg-white px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
            >
              <SourcesTrigger :count="message.sources.length" />
              <SourcesContent class="mt-3 grid min-w-0 w-full gap-2">
                <Source
                  v-for="source in message.sources"
                  :key="`${source.title}-${source.url || ''}`"
                  :href="source.url || '#'"
                  :title="source.title"
                  class="min-w-0 rounded-2xl bg-[#f5f7fa] px-4 py-3 text-sm transition-colors hover:bg-slate-50"
                >
                  <div class="min-w-0">
                    <p class="truncate font-medium text-slate-800">{{ source.title }}</p>
                    <p v-if="source.url" class="mt-1 truncate text-xs text-slate-500">{{ source.url }}</p>
                  </div>
                </Source>
              </SourcesContent>
            </Sources>
          </div>
        </Message>
      </div>
    </ConversationContent>

    <ConversationScrollButton
      v-if="messages.length > 0 && !showIntro"
      class="z-30 bottom-4 border-slate-200 bg-white/95 text-slate-600 shadow-[0_10px_28px_rgba(15,23,42,0.1)] hover:bg-white"
      :class="props.compact ? 'bottom-3 right-3 left-auto translate-x-0' : ''"
    />
  </Conversation>
</template>
