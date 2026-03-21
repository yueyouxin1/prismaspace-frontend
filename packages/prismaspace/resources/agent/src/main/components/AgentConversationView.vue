<script setup lang="ts">
import type { DisplayMessage } from '../agent-chat.types'
import { MessageResponse } from '@prismaspace/ui-ai-elements/components/ai-elements/message'
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@prismaspace/ui-ai-elements/components/ai-elements/conversation'
import {
  AlertCircleIcon,
  CheckCheckIcon,
  ChevronDownIcon,
  GlobeIcon,
  Loader2Icon,
  TerminalSquareIcon,
  WandSparklesIcon,
  WrenchIcon,
} from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

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
}>()

const messageFeedRef = ref<HTMLElement | null>(null)

const renderedSignature = computed(() => {
  return props.messages
    .map(message => `${message.id}:${message.content.length}:${message.reasoning.length}:${message.toolCalls.length}:${message.streaming ? 1 : 0}`)
    .join('|')
})

let codeEnhanceTimer: number | undefined

function detectToolIcon(name: string) {
  const value = name.toLowerCase()
  if (value.includes('search') || value.includes('web')) {
    return GlobeIcon
  }
  if (value.includes('code') || value.includes('terminal') || value.includes('exec')) {
    return TerminalSquareIcon
  }
  if (value.includes('agent') || value.includes('workflow')) {
    return WandSparklesIcon
  }
  return WrenchIcon
}

function queueEnhancements(): void {
  if (typeof window === 'undefined') {
    return
  }
  if (codeEnhanceTimer) {
    window.clearTimeout(codeEnhanceTimer)
  }
  codeEnhanceTimer = window.setTimeout(() => {
    enhanceCodeBlocks()
  }, 0)
}

function enhanceCodeBlocks(): void {
  const root = messageFeedRef.value
  if (!root || typeof document === 'undefined') {
    return
  }

  const blocks = root.querySelectorAll<HTMLElement>('.agent-chat-markdown pre')
  blocks.forEach((pre) => {
    if (pre.parentElement?.classList.contains('agent-code-shell')) {
      return
    }

    const wrapper = document.createElement('div')
    wrapper.className = 'agent-code-shell'

    const toolbar = document.createElement('div')
    toolbar.className = 'agent-code-toolbar'

    const language = document.createElement('span')
    language.className = 'agent-code-language'
    const code = pre.querySelector('code')
    const className = code?.className || ''
    const match = className.match(/language-([\w-]+)/)
    language.textContent = (match?.[1] || 'text').toUpperCase()

    const copyButton = document.createElement('button')
    copyButton.type = 'button'
    copyButton.className = 'agent-code-copy'
    copyButton.textContent = props.copy.copy ?? 'Copy'
    copyButton.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(code?.textContent || pre.textContent || '')
        copyButton.textContent = props.copy.copied ?? 'Copied'
        window.setTimeout(() => {
          copyButton.textContent = props.copy.copy ?? 'Copy'
        }, 1500)
      } catch {
        copyButton.textContent = props.copy.copy ?? 'Copy'
      }
    })

    toolbar.append(language, copyButton)
    pre.parentElement?.insertBefore(wrapper, pre)
    wrapper.append(toolbar, pre)
  })
}

watch(renderedSignature, async () => {
  await nextTick()
  queueEnhancements()
}, { flush: 'post' })

onBeforeUnmount(() => {
  if (codeEnhanceTimer && typeof window !== 'undefined') {
    window.clearTimeout(codeEnhanceTimer)
  }
})
</script>

<template>
  <Conversation
    :key="conversationKey"
    class="agent-chat-scroll relative min-h-0 flex-1"
    initial="instant"
    :resize="{ damping: 0.72, stiffness: 0.08, mass: 1.02 }"
  >
    <ConversationContent class="gap-0 px-4 pb-28 pt-0 md:px-8 md:pb-32">
      <div ref="messageFeedRef" class="mx-auto flex w-full max-w-4xl flex-col gap-8 py-4 md:py-6">
        <div
          v-if="shellError"
          class="rounded-[20px] bg-rose-50 px-5 py-4 text-sm text-rose-700 shadow-[0_10px_24px_rgba(244,63,94,0.06)]"
        >
          <div class="flex items-start gap-3">
            <AlertCircleIcon class="mt-0.5 size-4 shrink-0" />
            <p class="font-medium">{{ shellError }}</p>
          </div>
        </div>

        <div
          v-if="showAuthFallbackNotice"
          class="rounded-[18px] bg-white px-4 py-3 text-xs leading-6 text-slate-500 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
        >
          {{ copy.authFallback }}
        </div>

        <section
          v-if="showIntro"
          class="flex min-h-[40vh] flex-col items-center justify-center px-4 text-center md:min-h-[48vh]"
        >
          <h2 class="max-w-3xl text-[28px] font-semibold tracking-[-0.045em] text-slate-900 md:text-[44px]">
            {{ emptyTitle }}
          </h2>
          <p v-if="emptySubtitle" class="mt-4 max-w-2xl text-sm leading-7 text-slate-500 md:text-[15px]">
            {{ emptySubtitle }}
          </p>
        </section>

        <div
          v-if="loadingMessages"
          class="rounded-[18px] bg-white px-5 py-4 text-sm text-slate-500 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
        >
          {{ copy.loadingMessages }}
        </div>

        <template v-for="message in messages" :key="message.id">
          <div v-if="message.role === 'user'" class="flex justify-end">
            <div class="max-w-[85%] space-y-2 md:max-w-[70%]">
              <div class="inline-flex rounded-[22px] bg-[#eff1f4] px-5 py-3 text-left shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                <p
                  v-if="message.content"
                  class="whitespace-pre-wrap text-[15px] leading-7 text-slate-900"
                >
                  {{ message.content }}
                </p>
                <p v-else class="text-[15px] leading-7 text-slate-500">
                  {{ copy.attachmentOnlyLabel }}
                </p>
              </div>

              <div v-if="message.attachments.length" class="flex flex-wrap justify-end gap-2">
                <span
                  v-for="attachment in message.attachments"
                  :key="attachment.id"
                  class="inline-flex max-w-[220px] items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs text-slate-600 shadow-[0_6px_16px_rgba(15,23,42,0.04)]"
                >
                  <span class="truncate">{{ attachment.name }}</span>
                </span>
              </div>
            </div>
          </div>

          <div v-else class="max-w-3xl space-y-4">
            <div v-if="message.reasoning" class="space-y-3">
              <button
                type="button"
                class="flex items-center gap-2 text-sm text-slate-500 transition-colors duration-150 hover:text-slate-800"
                @click="message.reasoningOpen = !message.reasoningOpen"
              >
                <span
                  class="flex size-6 items-center justify-center rounded-full"
                  :class="message.streaming ? 'bg-slate-200 text-slate-600' : 'bg-slate-900 text-white'"
                >
                  <Loader2Icon v-if="message.streaming" class="size-3.5 animate-spin" />
                  <CheckCheckIcon v-else class="size-3.5" />
                </span>
                <span>{{ message.streaming ? `${copy.thinking}...` : copy.analyzed }}</span>
                <ChevronDownIcon class="size-4 transition-transform duration-200" :class="message.reasoningOpen ? 'rotate-180' : ''" />
              </button>

              <transition
                enter-active-class="transition-all duration-200 ease-out"
                enter-from-class="translate-y-1 opacity-0"
                enter-to-class="translate-y-0 opacity-100"
                leave-active-class="transition-all duration-150 ease-in"
                leave-from-class="translate-y-0 opacity-100"
                leave-to-class="-translate-y-1 opacity-0"
              >
                <div v-if="message.reasoningOpen" class="border-l border-slate-200 pl-4 text-[14px] leading-8 text-slate-500 whitespace-pre-wrap">
                  {{ message.reasoning }}
                </div>
              </transition>
            </div>

            <div v-if="message.toolCalls.length" class="flex flex-wrap gap-2">
              <div
                v-for="tool in message.toolCalls"
                :key="tool.id"
                class="rounded-full bg-white px-3 py-2 shadow-[0_6px_18px_rgba(15,23,42,0.04)]"
                :class="tool.status === 'error'
                  ? 'text-rose-600'
                  : tool.status === 'success'
                    ? 'text-slate-700'
                    : 'text-slate-500'"
              >
                <div class="flex items-center gap-2 text-xs font-medium">
                  <component
                    :is="detectToolIcon(tool.name)"
                    class="size-3.5"
                    :class="tool.status === 'running' ? 'animate-pulse' : ''"
                  />
                  <span class="truncate max-w-[180px]">{{ tool.name }}</span>
                </div>
                <p v-if="tool.args" class="mt-1 max-w-[260px] truncate font-mono text-[11px] opacity-70">
                  {{ tool.args }}
                </p>
                <p v-if="tool.result" class="mt-1 max-w-[260px] truncate text-[11px] opacity-80">
                  {{ tool.result }}
                </p>
                <p v-if="tool.error" class="mt-1 max-w-[260px] truncate text-[11px] text-rose-600">
                  {{ tool.error }}
                </p>
              </div>
            </div>

            <div class="space-y-4">
              <div
                v-if="message.error"
                class="rounded-[18px] bg-rose-50 px-4 py-3 text-sm text-rose-700"
              >
                {{ message.error }}
              </div>

              <MessageResponse
                v-if="message.content"
                :content="message.content"
                class="agent-chat-markdown"
              />

              <div v-else class="flex items-center gap-3 text-sm text-slate-500">
                <span class="agent-chat-dots" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
                {{ copy.noContent }}
              </div>
            </div>

            <div
              v-if="message.sources.length"
              class="overflow-hidden rounded-[18px] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
            >
              <button
                type="button"
                class="flex w-full items-center justify-between px-4 py-3 text-left"
                @click="message.sourcesOpen = !message.sourcesOpen"
              >
                <span class="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">{{ copy.sources }}</span>
                <span class="flex items-center gap-2 text-xs text-slate-500">
                  {{ message.sourcesOpen ? copy.hideSources : copy.showSources }}
                  <ChevronDownIcon class="size-4 transition-transform duration-200" :class="message.sourcesOpen ? 'rotate-180' : ''" />
                </span>
              </button>

              <div v-if="message.sourcesOpen" class="grid gap-2 px-4 pb-4">
                <a
                  v-for="source in message.sources"
                  :key="`${source.title}-${source.url || ''}`"
                  :href="source.url || '#'"
                  :target="source.url ? '_blank' : undefined"
                  :rel="source.url ? 'noreferrer' : undefined"
                  class="rounded-2xl bg-[#f5f7fa] px-4 py-3 text-sm transition-all duration-150 hover:bg-slate-50"
                >
                  <p class="truncate font-medium text-slate-800">{{ source.title }}</p>
                  <p v-if="source.url" class="mt-1 truncate text-xs text-slate-500">{{ source.url }}</p>
                </a>
              </div>
            </div>
          </div>
        </template>
      </div>
    </ConversationContent>

    <ConversationScrollButton class="bottom-6 border-slate-200 bg-white/95 text-slate-600 shadow-[0_10px_28px_rgba(15,23,42,0.1)] hover:bg-white" />
  </Conversation>
</template>

<style scoped>
.agent-chat-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.35) transparent;
}

.agent-chat-scroll::-webkit-scrollbar {
  width: 6px;
}

.agent-chat-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.agent-chat-scroll::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.3);
}

.agent-chat-dots {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.agent-chat-dots span {
  display: block;
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: currentColor;
  opacity: 0.35;
  animation: agent-dot-breathe 1.2s ease-in-out infinite;
}

.agent-chat-dots span:nth-child(2) {
  animation-delay: 0.15s;
}

.agent-chat-dots span:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes agent-dot-breathe {
  0%,
  80%,
  100% {
    opacity: 0.35;
    transform: translateY(0);
  }

  40% {
    opacity: 1;
    transform: translateY(-3px);
  }
}

:deep(.agent-chat-markdown) {
  font-size: 15px;
  line-height: 1.75;
  color: #0f172a;
}

:deep(.agent-chat-markdown > *:first-child) {
  margin-top: 0;
}

:deep(.agent-chat-markdown > *:last-child) {
  margin-bottom: 0;
}

:deep(.agent-chat-markdown h1),
:deep(.agent-chat-markdown h2),
:deep(.agent-chat-markdown h3),
:deep(.agent-chat-markdown h4) {
  margin-top: 1.4em;
  margin-bottom: 0.6em;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: #0f172a;
}

:deep(.agent-chat-markdown p + p),
:deep(.agent-chat-markdown ul + p),
:deep(.agent-chat-markdown ol + p),
:deep(.agent-chat-markdown p + ul),
:deep(.agent-chat-markdown p + ol),
:deep(.agent-chat-markdown pre + p) {
  margin-top: 1rem;
}

:deep(.agent-chat-markdown ul),
:deep(.agent-chat-markdown ol) {
  padding-left: 1.25rem;
}

:deep(.agent-chat-markdown li + li) {
  margin-top: 0.35rem;
}

:deep(.agent-chat-markdown p code),
:deep(.agent-chat-markdown li code) {
  border-radius: 10px;
  background: #f1f5f9;
  padding: 0.18rem 0.45rem;
  font-size: 0.92em;
  color: #0f172a;
}

:deep(.agent-chat-markdown a) {
  color: #334155;
  text-decoration: underline;
  text-decoration-color: rgba(100, 116, 139, 0.35);
  text-underline-offset: 3px;
}

:deep(.agent-chat-markdown blockquote) {
  margin-top: 1rem;
  border-left: 2px solid #e2e8f0;
  padding-left: 1rem;
  color: #475569;
}

:deep(.agent-chat-markdown pre) {
  margin-top: 1.15rem;
  overflow-x: auto;
  background: transparent !important;
  padding: 1rem;
  color: #e7e5e4;
}

:deep(.agent-code-shell) {
  overflow: hidden;
  border-radius: 20px;
  background: #0f172a;
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.22);
}

:deep(.agent-code-toolbar) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(15, 23, 42, 0.96);
  padding: 0.8rem 1rem;
}

:deep(.agent-code-language) {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  color: rgba(226, 232, 240, 0.78);
}

:deep(.agent-code-copy) {
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  padding: 0.42rem 0.8rem;
  font-size: 0.72rem;
  color: #e2e8f0;
  opacity: 0.65;
  transition: opacity 150ms ease, background-color 150ms ease, transform 150ms ease;
}

:deep(.agent-code-shell:hover .agent-code-copy) {
  opacity: 1;
}

:deep(.agent-code-copy:hover) {
  background: rgba(255, 255, 255, 0.14);
}

:deep(.agent-code-copy:active) {
  transform: scale(0.95);
}
</style>
