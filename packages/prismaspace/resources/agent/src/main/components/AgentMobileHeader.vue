<script setup lang="ts">
import { Button } from '@prismaspace/ui-shadcn/components/ui/button'
import { PanelLeftIcon, PlusIcon, Share2Icon } from 'lucide-vue-next'

defineProps<{
  title: string
  canCreateSession: boolean
  creatingSession: boolean
  drawerLabel: string
  newChatLabel: string
}>()

const emit = defineEmits<{
  (event: 'toggle-drawer'): void
  (event: 'new-session'): void
}>()
</script>

<template>
  <header class="sticky top-0 z-20 grid h-11 grid-cols-3 items-center bg-background px-2">
    <div class="flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        class="size-8 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        :aria-label="drawerLabel"
        @click="emit('toggle-drawer')"
      >
        <PanelLeftIcon class="size-3.5" />
      </Button>
      <Button
        v-if="canCreateSession"
        type="button"
        variant="ghost"
        size="icon"
        class="size-8 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
        :aria-label="newChatLabel"
        :disabled="creatingSession"
        @click="emit('new-session')"
      >
        <PlusIcon class="size-3.5" />
      </Button>
    </div>

    <p class="truncate text-center text-[14px] font-semibold tracking-[-0.02em] text-slate-900">
      {{ title }}
    </p>

    <div class="flex items-center justify-end">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        class="size-8 rounded-full text-slate-400"
        disabled
        aria-label="Share"
      >
        <Share2Icon class="size-3.5" />
      </Button>
    </div>
  </header>
</template>
