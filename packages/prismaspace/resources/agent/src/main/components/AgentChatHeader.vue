<script setup lang="ts">
import { Button } from '@prismaspace/ui-shadcn/components/ui/button'
import { SidebarTrigger, useSidebar } from '@prismaspace/ui-shadcn/components/ui/sidebar'
import { EllipsisIcon, PlusIcon, Share2Icon } from 'lucide-vue-next'
import { computed } from 'vue'

defineProps<{
  title: string
  showSidebarTrigger: boolean
  canCreateSession: boolean
  creatingSession: boolean
  sidebarLabel: string
  newChatLabel: string
}>()

const emit = defineEmits<{
  (event: 'new-session'): void
}>()

const { isMobile, state } = useSidebar()

const isOverlayMode = computed(() => !isMobile.value && state.value === 'collapsed')
const rootClass = computed(() => (
  isOverlayMode.value
    ? 'h-0'
    : 'h-10 md:h-11'
))
const shellClass = computed(() => (
  isOverlayMode.value
    ? 'pointer-events-none absolute inset-x-0 top-0 px-3 md:px-4 h-10 md:h-11'
    : 'pointer-events-auto relative h-full'
))
const backdropClass = computed(() => (
  isOverlayMode.value
    ? 'pointer-events-none bg-transparent opacity-0'
    : 'pointer-events-auto bg-background/94 opacity-100 backdrop-blur-sm'
))
</script>

<template>
  <header class="sticky top-0 z-20 px-3 md:px-4" :class="rootClass">
    <div class="grid grid-cols-3 items-center" :class="shellClass">
      <div class="absolute inset-0 transition-all duration-200" :class="backdropClass" />

      <div class="relative z-10 flex min-w-0 items-center gap-2" :class="isOverlayMode ? 'pointer-events-auto' : ''">
        <template v-if="showSidebarTrigger">
          <SidebarTrigger
            class="size-8 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 [&>svg]:size-4"
            :aria-label="sidebarLabel"
          />
          <Button
            v-if="canCreateSession"
            type="button"
            variant="ghost"
            size="icon"
            class="flex size-8 items-center justify-center rounded-full text-slate-500 transition-all duration-150 hover:bg-slate-100 hover:text-slate-900 active:scale-95 disabled:opacity-50 md:hidden"
            :aria-label="newChatLabel"
            :disabled="creatingSession"
            @click="emit('new-session')"
          >
            <PlusIcon class="size-3.5" />
          </Button>

          <div class="mx-1 h-4 w-px bg-slate-200" />
        </template>

        <p class="min-w-0 truncate text-[15px] font-semibold tracking-[-0.02em] text-slate-900">
          {{ title }}
        </p>
      </div>

      <div class="relative z-10 h-full" :class="isOverlayMode ? 'pointer-events-none opacity-0' : ''" />

      <div class="relative z-10 flex items-center justify-end gap-1" :class="isOverlayMode ? 'pointer-events-auto' : ''">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          class="size-8 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          disabled
          aria-label="Share"
        >
          <Share2Icon class="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          class="size-8 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          disabled
          aria-label="More actions"
        >
          <EllipsisIcon class="size-3.5" />
        </Button>
      </div>
    </div>
  </header>
</template>
