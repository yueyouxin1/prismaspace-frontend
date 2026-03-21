<script setup lang="ts">
import type { AgentSessionRead } from '@prismaspace/contracts'
import type { SessionGroup } from '../agent-chat.types'
import { Edit3Icon, MessageSquareTextIcon, PlusIcon, Trash2Icon, XIcon } from 'lucide-vue-next'
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  drawer?: boolean
  visible?: boolean
  loading: boolean
  creating: boolean
  sessionGroups: SessionGroup[]
  activeThreadId: string | null
  renamingSessionId: string | null
  renamingTitle: string
  copy: Record<string, string>
}>(), {
  drawer: false,
  visible: true,
})

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'create'): void
  (event: 'select', threadId: string): void
  (event: 'begin-rename', session: AgentSessionRead): void
  (event: 'submit-rename', session: AgentSessionRead): void
  (event: 'cancel-rename'): void
  (event: 'delete', session: AgentSessionRead): void
  (event: 'update:renamingTitle', value: string): void
}>()

const wrapperClass = computed(() => (
  props.drawer
    ? 'fixed inset-0 z-40 md:hidden'
    : 'contents'
))

const panelClass = computed(() => (
  props.drawer
    ? 'relative z-10 flex h-full w-[86vw] max-w-[320px] flex-col bg-[#f7f8fa] px-4 pb-4 pt-5 shadow-[0_20px_60px_rgba(15,23,42,0.12)]'
    : 'relative z-10 flex h-full w-[280px] shrink-0 flex-col bg-[#f7f8fa] px-4 pb-4 pt-5'
))
</script>

<template>
  <div v-if="!drawer || visible" :class="wrapperClass">
    <button
      v-if="drawer"
      type="button"
      class="absolute inset-0 bg-stone-950/20 backdrop-blur-[2px]"
      aria-label="Close sessions"
      @click="emit('close')"
    />

    <aside :class="panelClass">
      <div class="flex items-center justify-between px-1">
        <p class="text-sm font-medium tracking-[-0.01em] text-slate-600">
          {{ copy.session }}
        </p>

        <button
          v-if="drawer"
          type="button"
          class="flex size-9 items-center justify-center rounded-full text-slate-500 transition-all duration-150 hover:bg-slate-100 hover:text-slate-900 active:scale-95"
          aria-label="Close sessions"
          @click="emit('close')"
        >
          <XIcon class="size-4.5" />
        </button>
      </div>

      <button
        type="button"
        class="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 text-sm font-medium text-white transition-all duration-150 hover:bg-slate-950 active:scale-[0.99] disabled:opacity-60"
        :disabled="creating"
        @click="emit('create')"
      >
        <PlusIcon class="size-4" />
        {{ copy.newChat }}
      </button>

      <div class="agent-chat-scroll mt-6 min-h-0 flex-1 overflow-y-auto pr-1">
        <div v-if="loading" class="px-2 py-3 text-sm text-slate-500">
          {{ copy.loadingSessions }}
        </div>

        <div v-else-if="sessionGroups.length === 0" class="px-2 py-4 text-sm leading-6 text-slate-500">
          {{ copy.noSessions }}
        </div>

        <div v-else class="space-y-6">
          <section v-for="group in sessionGroups" :key="group.key" class="space-y-2">
            <div class="px-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
              {{ group.label }}
            </div>

            <button
              v-for="session in group.items"
              :key="session.uuid"
              type="button"
              class="group flex min-h-11 w-full items-center gap-2 rounded-2xl px-3 py-2 text-left transition-all duration-150 hover:bg-white"
              :class="session.uuid === activeThreadId
                ? 'bg-white text-slate-950 shadow-[0_10px_24px_rgba(15,23,42,0.06)]'
                : 'text-slate-700'"
              @click="emit('select', session.uuid)"
            >
              <MessageSquareTextIcon class="size-3.5 shrink-0 text-slate-400" />

              <div class="min-w-0 flex-1">
                <template v-if="renamingSessionId === session.uuid">
                  <input
                    :value="renamingTitle"
                    :placeholder="copy.renamePlaceholder"
                    class="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-medium outline-none transition-colors focus:border-slate-300"
                    @input="emit('update:renamingTitle', String(($event.target as HTMLInputElement).value || ''))"
                    @blur="emit('submit-rename', session)"
                    @keydown.enter.prevent="emit('submit-rename', session)"
                    @keydown.esc.prevent="emit('cancel-rename')"
                  >
                </template>

                <template v-else>
                  <p class="truncate text-[13px]" :class="session.uuid === activeThreadId ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'">
                    {{ session.title || copy.untitledSession }}
                  </p>
                </template>
              </div>

              <div class="hidden items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 md:flex">
                <button
                  type="button"
                  class="flex size-8 items-center justify-center rounded-full text-slate-400 transition-all duration-150 hover:bg-slate-100 hover:text-slate-900 active:scale-95"
                  @click.stop="emit('begin-rename', session)"
                >
                  <Edit3Icon class="size-3.5" />
                </button>

                <button
                  type="button"
                  class="flex size-8 items-center justify-center rounded-full text-slate-400 transition-all duration-150 hover:bg-slate-100 hover:text-rose-600 active:scale-95"
                  @click.stop="emit('delete', session)"
                >
                  <Trash2Icon class="size-3.5" />
                </button>
              </div>
            </button>
          </section>
        </div>
      </div>
    </aside>
  </div>
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
</style>
