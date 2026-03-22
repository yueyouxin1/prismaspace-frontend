<script setup lang="ts">
import type { PromptInputMessage } from '@prismaspace/ui-ai-elements/components/ai-elements/prompt-input'
import {
  PromptInput,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputTextarea,
  usePromptInputProvider,
} from '@prismaspace/ui-ai-elements/components/ai-elements/prompt-input'
import { Suggestion, Suggestions } from '@prismaspace/ui-ai-elements/components/ai-elements/suggestion'
import { Button } from '@prismaspace/ui-shadcn/components/ui/button'
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
  compact?: boolean
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
  <div
    class="agent-chat-composer-shell sticky bottom-0 z-20 mt-auto px-4 pb-2 md:px-8 md:pb-3"
    :class="props.compact ? 'px-3 pb-1.5 md:px-3 md:pb-1.5' : ''"
  >
    <div class="pointer-events-none absolute inset-x-0 bottom-full z-0 h-8 bg-gradient-to-t from-background via-background/90 to-transparent" />

    <div class="mx-auto flex w-full max-w-4xl flex-col gap-3" :class="props.compact ? 'max-w-full gap-2' : ''">
      <div v-if="showSuggestions && suggestionCards.length" class="space-y-2">
        <div class="hidden md:block">
          <Suggestions class="grid w-full grid-cols-3 gap-3">
            <Suggestion
              v-for="suggestion in suggestionCards"
              :key="suggestion.raw"
              :suggestion="suggestion.raw"
              variant="ghost"
              class="h-auto rounded-[18px] bg-[#f3f4f6] px-4 py-3 text-left transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#eceff3] active:scale-[0.98]"
              :class="props.compact ? 'rounded-[14px] px-3 py-2.5' : ''"
              @click="emit('suggestion-click', suggestion.raw)"
            >
              <div class="w-full">
                <p class="text-[14px] font-medium leading-5 text-slate-900">{{ suggestion.title }}</p>
                <p v-if="suggestion.subtitle" class="mt-1 text-xs leading-5 text-slate-500">
                  {{ suggestion.subtitle }}
                </p>
              </div>
            </Suggestion>
          </Suggestions>
        </div>

        <Suggestions class="agent-chat-suggestion-scroll flex gap-3 overflow-x-auto pb-1 md:hidden">
          <Suggestion
            v-for="suggestion in suggestionCards"
            :key="`${suggestion.raw}-mobile`"
            :suggestion="suggestion.raw"
            variant="ghost"
            class="h-auto w-[176px] shrink-0 rounded-[18px] bg-[#f3f4f6] px-4 py-3 text-left transition-all duration-150 active:scale-[0.98]"
            :class="props.compact ? 'w-[148px] rounded-[14px] px-3 py-2.5' : ''"
            @click="emit('suggestion-click', suggestion.raw)"
          >
            <div class="w-full">
              <p class="text-[14px] font-medium leading-5 text-slate-900">{{ suggestion.title }}</p>
              <p v-if="suggestion.subtitle" class="mt-1 text-xs leading-5 text-slate-500">
                {{ suggestion.subtitle }}
              </p>
            </div>
          </Suggestion>
        </Suggestions>
      </div>

      <PromptInput
        class="relative z-10 w-full [&_[data-slot=input-group]]:rounded-[24px] [&_[data-slot=input-group]]:border-slate-200 [&_[data-slot=input-group]]:bg-white [&_[data-slot=input-group]]:shadow-[0_12px_30px_rgba(15,23,42,0.07)]"
        multiple
        global-drop
        @submit="emit('submit', $event)"
        @error="emit('error', $event)"
      >
        <PromptInputHeader v-if="prompt.files.value.length" class="w-full px-3 pt-2.5" :class="props.compact ? 'px-2 pt-2' : ''">
          <PromptInputAttachments class="w-full p-0">
            <template #default="{ file }">
              <PromptInputAttachment :file="file" class="rounded-full border-slate-200 bg-slate-50" />
            </template>
          </PromptInputAttachments>
        </PromptInputHeader>

        <PromptInputBody>
          <PromptInputTextarea
            :placeholder="placeholder"
            rows="1"
            class="min-h-[32px] max-h-[max(30svh,5rem)] max-h-52 px-4 pt-3 pb-0 text-[15px] leading-6 text-slate-900 shadow-none outline-none focus-visible:ring-0 md:text-[15px]"
            :class="props.compact ? 'min-h-[30px] max-h-40 px-3 pt-2 pb-0 text-[14px] leading-6' : ''"
          />
        </PromptInputBody>

        <PromptInputFooter class="border-0 px-3 pb-2.5 pt-0.5" :class="props.compact ? 'px-2 pb-2 pt-0' : ''">
          <div class="flex items-center gap-2">
            <PromptInputButton
              :title="copy.webSearchEnabled"
              variant="ghost"
              class="size-8 rounded-full transition-all duration-150 active:scale-95"
              :class="[
                props.compact ? 'size-7' : '',
                useWebSearch
                  ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900',
              ]"
              @click="emit('toggle-web-search')"
            >
              <GlobeIcon class="size-3.5" :class="props.compact ? 'size-3' : ''" />
            </PromptInputButton>
          </div>

          <div class="flex items-center gap-2">
            <PromptInputButton
              :title="copy.attachFile"
              variant="ghost"
              class="size-8 rounded-full text-slate-500 transition-all duration-150 hover:bg-slate-100 hover:text-slate-900 active:scale-95"
              :class="props.compact ? 'size-7' : ''"
              @click="prompt.openFileDialog"
            >
              <PlusIcon class="size-3.5" :class="props.compact ? 'size-3' : ''" />
            </PromptInputButton>

            <Button
              v-if="isStreaming"
              type="button"
              size="icon"
              class="size-9 rounded-full bg-slate-900 text-white shadow-none hover:bg-slate-950"
              :class="props.compact ? 'size-8' : ''"
              @click="emit('stop-streaming')"
            >
              <SquareIcon class="size-3" :class="props.compact ? 'size-2.5' : ''" />
            </Button>

            <Button
              v-else
              type="submit"
              size="icon"
              class="size-9 rounded-full shadow-none"
              :class="[
                props.compact ? 'size-8' : '',
                canSubmit
                  ? 'bg-slate-900 text-white hover:bg-slate-950'
                  : 'bg-slate-100 text-slate-300 hover:bg-slate-100',
              ]"
              :disabled="!canSubmit"
            >
              <ArrowUpIcon class="size-3" :class="props.compact ? 'size-2.5' : ''" />
            </Button>
          </div>
        </PromptInputFooter>
      </PromptInput>

      <p class="pt-0.5 text-center text-xs text-slate-400" :class="props.compact ? 'pt-0 text-[11px]' : ''">
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
</style>
