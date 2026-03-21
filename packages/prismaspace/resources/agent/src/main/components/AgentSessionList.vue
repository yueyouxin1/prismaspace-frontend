<script setup lang="ts">
import type { AgentSessionRead } from '@prismaspace/contracts'
import type { SessionGroup } from '../agent-chat.types'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@prismaspace/ui-shadcn/components/ui/sidebar'
import { Edit3Icon, MessageSquareTextIcon, PlusIcon, Trash2Icon } from 'lucide-vue-next'

const props = defineProps<{
  loading: boolean
  creating: boolean
  sessionGroups: SessionGroup[]
  activeThreadId: string | null
  renamingSessionId: string | null
  renamingTitle: string
  copy: Record<string, string>
}>()

const emit = defineEmits<{
  (event: 'create'): void
  (event: 'select', threadId: string): void
  (event: 'begin-rename', session: AgentSessionRead): void
  (event: 'submit-rename', session: AgentSessionRead): void
  (event: 'cancel-rename'): void
  (event: 'delete', session: AgentSessionRead): void
  (event: 'update:renamingTitle', value: string): void
}>()

const { isMobile, setOpenMobile } = useSidebar()

function closeMobileSidebar(): void {
  if (isMobile.value) {
    setOpenMobile(false)
  }
}

function handleCreate(): void {
  emit('create')
  closeMobileSidebar()
}

function handleSelect(threadId: string): void {
  emit('select', threadId)
  closeMobileSidebar()
}
</script>

<template>
  <Sidebar variant="inset" collapsible="offcanvas">
    <SidebarHeader class="gap-3 px-3 pt-3">
      <p class="px-2 text-sm font-medium tracking-[-0.01em] text-sidebar-foreground/70">
        {{ copy.session }}
      </p>

      <button
        type="button"
        class="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-sidebar-primary text-sm font-medium text-sidebar-primary-foreground transition-all duration-150 hover:opacity-95 active:scale-[0.99] disabled:opacity-60"
        :disabled="creating"
        @click="handleCreate"
      >
        <PlusIcon class="size-4" />
        {{ copy.newChat }}
      </button>
    </SidebarHeader>

    <SidebarContent class="px-3 pb-3">
      <div v-if="loading" class="px-2 py-3 text-sm text-sidebar-foreground/60">
        {{ copy.loadingSessions }}
      </div>

      <div v-else-if="sessionGroups.length === 0" class="px-2 py-4 text-sm leading-6 text-sidebar-foreground/60">
        {{ copy.noSessions }}
      </div>

      <div v-else class="space-y-5">
        <section v-for="group in sessionGroups" :key="group.key" class="space-y-2">
          <div class="px-2 text-[11px] font-medium uppercase tracking-[0.16em] text-sidebar-foreground/45">
            {{ group.label }}
          </div>

          <SidebarMenu>
            <SidebarMenuItem
              v-for="session in group.items"
              :key="session.uuid"
              class="group/menu-item"
            >
              <template v-if="renamingSessionId === session.uuid">
                <div class="rounded-xl bg-background px-3 py-2 shadow-sm ring-1 ring-sidebar-ring/30">
                  <input
                    :value="renamingTitle"
                    :placeholder="copy.renamePlaceholder"
                    class="w-full bg-transparent text-[13px] font-medium text-foreground outline-none"
                    @input="emit('update:renamingTitle', String(($event.target as HTMLInputElement).value || ''))"
                    @blur="emit('submit-rename', session)"
                    @keydown.enter.prevent="emit('submit-rename', session)"
                    @keydown.esc.prevent="emit('cancel-rename')"
                  >
                </div>
              </template>

              <template v-else>
                <SidebarMenuButton
                  :is-active="session.uuid === activeThreadId"
                  class="h-11 rounded-xl pr-18 shadow-none data-[active=true]:bg-background data-[active=true]:text-foreground data-[active=true]:shadow-sm"
                  @click="handleSelect(session.uuid)"
                >
                  <MessageSquareTextIcon class="size-3.5 text-sidebar-foreground/45" />
                  <span class="truncate text-[13px] font-medium">
                    {{ session.title || copy.untitledSession }}
                  </span>
                </SidebarMenuButton>

                <div class="pointer-events-none absolute inset-y-0 right-2 hidden items-center gap-1 opacity-0 transition-opacity duration-150 group-hover/menu-item:pointer-events-auto group-hover/menu-item:opacity-100 md:flex">
                  <button
                    type="button"
                    class="flex size-7 items-center justify-center rounded-full text-sidebar-foreground/45 transition-all duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:scale-95"
                    @click.stop="emit('begin-rename', session)"
                  >
                    <Edit3Icon class="size-3.5" />
                  </button>

                  <button
                    type="button"
                    class="flex size-7 items-center justify-center rounded-full text-sidebar-foreground/45 transition-all duration-150 hover:bg-sidebar-accent hover:text-rose-600 active:scale-95"
                    @click.stop="emit('delete', session)"
                  >
                    <Trash2Icon class="size-3.5" />
                  </button>
                </div>
              </template>
            </SidebarMenuItem>
          </SidebarMenu>
        </section>
      </div>
    </SidebarContent>
  </Sidebar>
</template>
