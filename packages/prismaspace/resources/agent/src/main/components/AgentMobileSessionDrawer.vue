<script setup lang="ts">
import type { AgentSessionRead } from '@prismaspace/contracts'
import { Button } from '@prismaspace/ui-shadcn/components/ui/button'
import { Drawer, DrawerHeader, DrawerTitle } from '@prismaspace/ui-shadcn/components/ui/drawer'
import { Input } from '@prismaspace/ui-shadcn/components/ui/input'
import type { SessionGroup } from '../agent-chat.types'
import { DrawerContent, DrawerOverlay, DrawerPortal } from 'vaul-vue'
import { Edit3Icon, MessageSquareTextIcon, PlusIcon, Trash2Icon } from 'lucide-vue-next'

const props = defineProps<{
  open: boolean
  loading: boolean
  creating: boolean
  sessionGroups: SessionGroup[]
  activeThreadId: string | null
  renamingSessionId: string | null
  renamingTitle: string
  copy: Record<string, string>
}>()

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'create'): void
  (event: 'select', threadId: string): void
  (event: 'begin-rename', session: AgentSessionRead): void
  (event: 'submit-rename', session: AgentSessionRead): void
  (event: 'cancel-rename'): void
  (event: 'delete', session: AgentSessionRead): void
  (event: 'update:renamingTitle', value: string): void
}>()

function closeDrawer(): void {
  emit('update:open', false)
}

function handleCreate(): void {
  emit('create')
  closeDrawer()
}

function handleSelect(threadId: string): void {
  emit('select', threadId)
  closeDrawer()
}
</script>

<template>
  <Drawer
    direction="left"
    :open="open"
    @update:open="emit('update:open', $event)"
  >
    <DrawerPortal :disabled="true">
      <DrawerOverlay class="absolute inset-0 z-30 bg-slate-950/18 backdrop-blur-[1px]" />
      <DrawerContent
        class="absolute inset-y-0 left-0 z-40 flex w-[86%] max-w-[320px] flex-col border-r border-slate-200 bg-background outline-none"
      >
        <DrawerHeader class="gap-3 border-b border-slate-100 px-3 pt-3">
          <div class="flex items-center justify-between">
            <DrawerTitle class="text-sm font-medium tracking-[-0.01em] text-slate-700">
              {{ copy.session }}
            </DrawerTitle>
          </div>

          <Button
            class="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-sm font-medium text-white transition-all duration-150 hover:bg-slate-950 active:scale-[0.99] disabled:opacity-60"
            :disabled="creating"
            @click="handleCreate"
          >
            <PlusIcon class="size-4" />
            {{ copy.newChat }}
          </Button>
        </DrawerHeader>

        <div class="min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-3">
          <div v-if="loading" class="px-2 py-3 text-sm text-slate-500">
            {{ copy.loadingSessions }}
          </div>

          <div v-else-if="sessionGroups.length === 0" class="px-2 py-4 text-sm leading-6 text-slate-500">
            {{ copy.noSessions }}
          </div>

          <div v-else class="space-y-5">
            <section v-for="group in sessionGroups" :key="group.key" class="space-y-2">
              <div class="px-2 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
                {{ group.label }}
              </div>

              <div class="space-y-1">
                <div
                  v-for="session in group.items"
                  :key="session.uuid"
                  class="group relative"
                >
                  <template v-if="renamingSessionId === session.uuid">
                    <div class="rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
                      <Input
                        :value="renamingTitle"
                        :placeholder="copy.renamePlaceholder"
                        class="h-8 border-0 bg-transparent px-0 py-0 text-[13px] font-medium text-foreground shadow-none focus-visible:ring-0"
                        @input="emit('update:renamingTitle', String(($event.target as HTMLInputElement).value || ''))"
                        @blur="emit('submit-rename', session)"
                        @keydown.enter.prevent="emit('submit-rename', session)"
                        @keydown.esc.prevent="emit('cancel-rename')"
                      />
                    </div>
                  </template>

                  <template v-else>
                    <Button
                      type="button"
                      variant="ghost"
                      class="flex h-11 w-full items-center gap-2 rounded-xl px-3 text-left transition-all duration-150"
                      :class="session.uuid === activeThreadId
                        ? 'bg-slate-50 text-slate-900 shadow-sm ring-1 ring-slate-200'
                        : 'text-slate-700 hover:bg-slate-50'"
                      @click="handleSelect(session.uuid)"
                    >
                      <MessageSquareTextIcon class="size-3.5 shrink-0 text-slate-400" />
                      <span class="truncate text-[13px] font-medium">
                        {{ session.title || copy.untitledSession }}
                      </span>
                    </Button>

                    <div class="absolute inset-y-0 right-2 flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        class="size-7 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                        @click.stop="emit('begin-rename', session)"
                      >
                        <Edit3Icon class="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        class="size-7 rounded-full text-slate-400 hover:bg-slate-100 hover:text-rose-600"
                        @click.stop="emit('delete', session)"
                      >
                        <Trash2Icon class="size-3.5" />
                      </Button>
                    </div>
                  </template>
                </div>
              </div>
            </section>
          </div>
        </div>
      </DrawerContent>
    </DrawerPortal>
  </Drawer>
</template>
