<script setup lang="ts">
import { computed } from 'vue'
import {
  ChevronLeft,
  CheckCircle2,
  Clock3,
  Copy,
  Ellipsis,
} from 'lucide-vue-next'
import { Button } from '@prismaspace/ui-shadcn/components/ui/button'

const props = withDefaults(defineProps<{
  title: string
  lastSavedAt?: string | null
  latestRunStatus?: string | null
  dirty?: boolean
  validating?: boolean
  publishing?: boolean
}>(), {
  lastSavedAt: null,
  latestRunStatus: null,
  dirty: false,
  validating: false,
  publishing: false,
})

const emit = defineEmits<{
  (event: 'back'): void
  (event: 'validate'): void
  (event: 'publish'): void
}>()

const saveLabel = computed(() => {
  if (!props.lastSavedAt) {
    return props.dirty ? '未保存' : '等待保存'
  }
  return `自动保存于 ${new Date(props.lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
})
</script>

<template>
  <header class="relative z-20 flex h-[74px] items-center justify-between border-b border-black/6 bg-[#f8f8fc]/96 px-5 backdrop-blur">
    <div class="flex min-w-0 items-center gap-3">
      <Button size="icon-sm" variant="ghost" class="rounded-xl text-[#656b7f]" @click="emit('back')">
        <ChevronLeft class="size-4" />
      </Button>
      <div class="flex size-10 items-center justify-center rounded-2xl bg-[#54c15f] shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]">
        <div class="grid grid-cols-2 gap-0.5">
          <span class="size-2 rounded-[3px] bg-white/95" />
          <span class="size-2 rounded-[3px] bg-white/95" />
          <span class="size-2 rounded-[3px] bg-white/95" />
          <span class="size-2 rounded-[3px] bg-white/95" />
        </div>
      </div>
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <h1 class="truncate text-[18px] font-semibold tracking-[-0.01em] text-[#1f2335]">{{ title }}</h1>
        </div>
        <div class="mt-0.5 flex flex-wrap items-center gap-2 text-xs">
          <span class="text-[#81879b]">{{ saveLabel }}</span>
          <span
            v-if="latestRunStatus"
            class="inline-flex items-center gap-1 rounded-full bg-[#eaf8ef] px-2.5 py-1 font-medium text-[#1aa34b]"
          >
            <Clock3 class="size-3.5" />
            {{ latestRunStatus }}
          </span>
        </div>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <Button size="icon-sm" variant="ghost" class="rounded-xl text-[#73798d]">
        <Copy class="size-4" />
      </Button>
      <Button
        variant="outline"
        class="h-11 rounded-2xl border-[#e6e7f1] bg-white px-4 text-sm text-[#4f5568] hover:bg-[#f6f7fb]"
        :disabled="validating"
        @click="emit('validate')"
      >
        <CheckCircle2 class="mr-1.5 size-4" />
        {{ validating ? '校验中' : '校验' }}
      </Button>
      <Button
        class="h-11 rounded-2xl bg-[#5d55ff] px-6 text-base text-white shadow-[0_10px_24px_rgba(93,85,255,0.28)] hover:bg-[#4f47f5]"
        :disabled="publishing"
        @click="emit('publish')"
      >
        {{ publishing ? '发布中' : '发布' }}
      </Button>
      <Button size="icon-sm" variant="ghost" class="rounded-xl text-[#73798d]">
        <Ellipsis class="size-4" />
      </Button>
    </div>
  </header>
</template>
