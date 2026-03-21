<script setup lang="ts">
import { SidebarTrigger } from '@prismaspace/ui-shadcn/components/ui/sidebar'
import { PlusIcon } from 'lucide-vue-next'

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
</script>

<template>
  <header class="flex h-15 items-center bg-transparent px-4 md:h-16 md:px-8">
    <div class="mx-auto flex w-full max-w-6xl items-center gap-2 text-slate-900">
      <template v-if="showSidebarTrigger">
        <SidebarTrigger
          class="size-10 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 [&>svg]:size-4.5"
          :aria-label="sidebarLabel"
        />
        <button
          v-if="canCreateSession"
          type="button"
          class="flex size-10 items-center justify-center rounded-full text-slate-500 transition-all duration-150 hover:bg-slate-100 hover:text-slate-900 active:scale-95 disabled:opacity-50 md:hidden"
          :aria-label="newChatLabel"
          :disabled="creatingSession"
          @click="emit('new-session')"
        >
          <PlusIcon class="size-4" />
        </button>

        <div class="mx-1 h-5 w-px bg-slate-200" />
      </template>

      <p class="min-w-0 truncate text-[15px] font-semibold tracking-[-0.02em] text-slate-900 md:text-base md:font-semibold">
        {{ title }}
      </p>
    </div>
  </header>
</template>
