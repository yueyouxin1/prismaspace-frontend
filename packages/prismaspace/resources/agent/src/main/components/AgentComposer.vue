<script setup lang="ts">
import type { PromptInputMessage } from '@prismaspace/ui-ai-elements/components/ai-elements/prompt-input'
import {
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputTextarea,
  usePromptInputProvider,
} from '@prismaspace/ui-ai-elements/components/ai-elements/prompt-input'
import { ArrowUpIcon, GlobeIcon, PlusIcon, SquareIcon } from 'lucide-vue-next'
import { computed } from 'vue'

interface SuggestionCard {
  raw: string
  title: string
  subtitle: string
}

const props = defineProps<{
  copy: Record<string, string>
  placeholder: string
  suggestions: string[]
  showSuggestions: boolean
  useWebSearch: boolean
  isStreaming: boolean
}>()

const emit = defineEmits<{
  (event: 'submit', payload: PromptInputMessage): void
  (event: 'error', payload: { code: string, message: string }): void
  (event: 'toggle-web-search'): void
  (event: 'stop-streaming'): void
  (event: 'suggestion-click', suggestion: string): void
}>()

const prompt = usePromptInputProvider({
  onSubmit: message => emit('submit', message),
  onError: error => emit('error', error),
})

const canSubmit = computed(() => {
  return prompt.textInput.value.trim().length > 0 || prompt.files.value.length > 0
})

function handleSubmit(event: Event): void {
  event.preventDefault()
  void prompt.submitForm()
}

function handleFileChange(event: Event): void {
  const input = event.target as HTMLInputElement
  if (input.files) {
    prompt.addFiles(input.files)
  }
  input.value = ''
}

const suggestionCards = computed<SuggestionCard[]>(() => {
  return props.suggestions.slice(0, 4).map((suggestion) => {
    const cleaned = suggestion.replace(/\s+/g, ' ').trim()
    const sentenceParts = cleaned.split(/(?<=[。！？.!?])/).map(item => item.trim()).filter(Boolean)

    if (sentenceParts.length > 1) {
      return {
        raw: cleaned,
        title: sentenceParts[0] || cleaned,
        subtitle: sentenceParts.slice(1).join(' '),
      }
    }

    const pivot = cleaned.length <= 12 ? cleaned.length : Math.min(12, Math.ceil(cleaned.length / 2))
    return {
      raw: cleaned,
      title: cleaned.slice(0, pivot),
      subtitle: cleaned.slice(pivot).trim(),
    }
  })
})
</script>

<template>
  <div class="agent-chat-composer-shell sticky bottom-0 z-20 mt-auto px-4 pb-4 md:px-8 md:pb-6">
    <div class="pointer-events-none absolute inset-x-0 bottom-full z-0 h-10 bg-gradient-to-t from-background via-background/92 to-transparent" />

    <div class="mx-auto flex w-full max-w-4xl flex-col gap-3">
      <div v-if="showSuggestions && suggestionCards.length" class="space-y-2">
        <div class="hidden gap-3 md:grid md:grid-cols-3">
          <button
            v-for="suggestion in suggestionCards"
            :key="suggestion.raw"
            type="button"
            class="rounded-[18px] bg-[#f3f4f6] px-4 py-3 text-left transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#eceff3] active:scale-[0.98]"
            @click="emit('suggestion-click', suggestion.raw)"
          >
            <p class="text-[14px] font-medium leading-5 text-slate-900">{{ suggestion.title }}</p>
            <p v-if="suggestion.subtitle" class="mt-1 text-xs leading-5 text-slate-500">
              {{ suggestion.subtitle }}
            </p>
          </button>
        </div>

        <div class="agent-chat-suggestion-scroll flex gap-3 overflow-x-auto pb-1 md:hidden">
          <button
            v-for="suggestion in suggestionCards"
            :key="`${suggestion.raw}-mobile`"
            type="button"
            class="w-[176px] shrink-0 rounded-[18px] bg-[#f3f4f6] px-4 py-3 text-left transition-all duration-150 active:scale-[0.98]"
            @click="emit('suggestion-click', suggestion.raw)"
          >
            <p class="text-[14px] font-medium leading-5 text-slate-900">{{ suggestion.title }}</p>
            <p v-if="suggestion.subtitle" class="mt-1 text-xs leading-5 text-slate-500">
              {{ suggestion.subtitle }}
            </p>
          </button>
        </div>
      </div>

      <div class="relative z-10 rounded-[24px] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.07)] ring-1 ring-slate-200">
        <input
          :ref="prompt.fileInputRef"
          type="file"
          class="hidden"
          multiple
          @change="handleFileChange"
        >

        <PromptInputAttachments class="w-full px-4 pt-3">
          <template #default="{ file }">
            <PromptInputAttachment :file="file" class="rounded-full border-slate-200 bg-slate-50" />
          </template>
        </PromptInputAttachments>

        <form class="flex flex-col" @submit="handleSubmit">
          <PromptInputTextarea
            :placeholder="placeholder"
            rows="1"
            class="min-h-[44px] max-h-[112px] resize-none border-0 bg-transparent px-5 pt-3 text-[15px] leading-7 text-slate-900 shadow-none outline-none focus-visible:ring-0 md:text-[15px]"
          />

          <div class="flex items-center justify-between px-4 pb-3 pt-1">
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="flex size-9 items-center justify-center rounded-full transition-all duration-150 active:scale-95"
                :class="useWebSearch
                  ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'"
                :title="copy.webSearchEnabled"
                @click="emit('toggle-web-search')"
              >
                <GlobeIcon class="size-4" />
              </button>
            </div>

            <div class="flex items-center gap-2">
              <button
                type="button"
                class="flex size-9 items-center justify-center rounded-full text-slate-500 transition-all duration-150 hover:bg-slate-100 hover:text-slate-900 active:scale-95"
                :title="copy.attachFile"
                @click="prompt.openFileDialog"
              >
                <PlusIcon class="size-4" />
              </button>

              <button
                v-if="isStreaming"
                type="button"
                class="flex size-10 items-center justify-center rounded-full bg-slate-900 text-white transition-all duration-150 hover:bg-slate-950 active:scale-95"
                @click="emit('stop-streaming')"
              >
                <SquareIcon class="size-3.5" />
              </button>

              <button
                v-else
                type="submit"
                class="flex size-10 items-center justify-center rounded-full transition-all duration-150 active:scale-95 disabled:cursor-not-allowed"
                :class="canSubmit
                  ? 'bg-slate-900 text-white hover:bg-slate-950'
                  : 'bg-slate-100 text-slate-300'"
                :disabled="!canSubmit"
              >
                <ArrowUpIcon class="size-3.5" />
              </button>
            </div>
          </div>
        </form>
      </div>

      <p class="pt-1 text-center text-xs text-slate-400">
        {{ copy.disclaimer }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.agent-chat-suggestion-scroll {
  scrollbar-width: none;
}

.agent-chat-suggestion-scroll::-webkit-scrollbar {
  display: none;
}

:deep(textarea::placeholder) {
  color: #9ca3af;
}
</style>
