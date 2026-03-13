<script setup lang="ts">
import { computed } from 'vue'
import { CheckCircle2, TriangleAlert, X } from 'lucide-vue-next'
import { Button } from '@prismaspace/ui-shadcn/components/ui/button'
import { ScrollArea } from '@prismaspace/ui-shadcn/components/ui/scroll-area'
import type { WorkflowValidationResult } from '../types/workflow-ide'

const props = withDefaults(defineProps<{
  open: boolean
  leftInset?: number
  rightInset?: number
  validationResult?: WorkflowValidationResult | null
}>(), {
  open: true,
  leftInset: 16,
  rightInset: 16,
  validationResult: null,
})

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
}>()

const errors = computed(() => props.validationResult?.errors ?? [])
</script>

<template>
  <div
    v-if="open"
    class="absolute bottom-2 z-20 overflow-hidden rounded-[8px] border border-[#e4e7ef] bg-white shadow-[0_2px_6px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.02)]"
    :style="{ left: `${leftInset}px`, right: `${rightInset}px` }"
  >
    <div class="flex h-12 items-center justify-between border-b border-[#ececf4] px-3">
      <div class="flex items-center gap-2">
        <p class="text-[14px] font-semibold text-[#1f2335]">错误列表</p>
        <span
          class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs"
          :class="errors.length ? 'bg-[#fff2f0] text-[#e45b53]' : 'bg-[#edf9f1] text-[#12a150]'"
        >
          <TriangleAlert v-if="errors.length" class="size-3.5" />
          <CheckCircle2 v-else class="size-3.5" />
          {{ errors.length ? `${errors.length} 个问题` : '无错误' }}
        </span>
      </div>
      <Button size="icon-sm" variant="ghost" class="rounded-[8px] text-[#767c8f]" @click="emit('update:open', false)">
        <X class="size-4" />
      </Button>
    </div>

    <ScrollArea class="h-[230px]">
      <div v-if="errors.length" class="space-y-3 px-4 py-4">
        <div
          v-for="errorItem in errors"
          :key="errorItem"
          class="rounded-[8px] border border-[#ffe0dc] bg-[#fff8f7] px-4 py-3 text-sm text-[#c0463e]"
        >
          {{ errorItem }}
        </div>
      </div>

      <div v-else class="flex h-[230px] flex-col items-center justify-center gap-3 text-[#9aa0b2]">
        <div class="flex size-14 items-center justify-center rounded-full bg-[#f2f3ff] text-[#7f73ff]">
          <CheckCircle2 class="size-7" />
        </div>
        <p class="text-sm">当前没有校验错误</p>
      </div>
    </ScrollArea>
  </div>
</template>
