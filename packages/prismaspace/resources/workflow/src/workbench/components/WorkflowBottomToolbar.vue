<script setup lang="ts">
import {
  Blend,
  Bot,
  ChevronDown,
  Clock3,
  Focus,
  MessageSquareText,
  Plus,
} from 'lucide-vue-next'
import { Button } from '@prismaspace/ui-shadcn/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@prismaspace/ui-shadcn/components/ui/dropdown-menu'

const props = withDefaults(defineProps<{
  zoomLabel?: string
  running?: boolean
  leftInset?: number
  rightInset?: number
  bottomOffset?: number
}>(), {
  zoomLabel: '100%',
  running: false,
  leftInset: 0,
  rightInset: 0,
  bottomOffset: 0,
})

const emit = defineEmits<{
  (event: 'auto-layout'): void
  (event: 'open-add-node'): void
  (event: 'open-test-run'): void
  (event: 'open-history'): void
  (event: 'toggle-problems'): void
  (event: 'zoom-in'): void
  (event: 'zoom-out'): void
  (event: 'fit-view'): void
  (event: 'set-zoom', zoom: number): void
}>()
</script>

<template>
  <div
    class="pointer-events-none absolute left-0 z-30 flex justify-center px-2"
    :style="{ left: `${leftInset}px`, right: `${rightInset}px`, bottom: `${16 + bottomOffset}px` }"
  >
    <div class="flex flex-wrap-reverse items-center gap-2">
      <div class="pointer-events-auto flex h-10 items-center gap-0.5 rounded-[10px] border border-[#e4e7ef] bg-white px-1 shadow-[0_2px_6px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.02)]">
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <button
              type="button"
              class="flex h-8 w-[72px] items-center justify-between rounded-[8px] border border-[#e4e7ef] px-2 text-xs text-[#4f5568]"
            >
              <span>{{ zoomLabel }}</span>
              <ChevronDown class="size-3.5 text-[#7f8599]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" side="top" class="w-32">
            <DropdownMenuItem @select="emit('zoom-out')">缩小</DropdownMenuItem>
            <DropdownMenuItem @select="emit('zoom-in')">放大</DropdownMenuItem>
            <DropdownMenuItem @select="emit('fit-view')">适应画布</DropdownMenuItem>
            <DropdownMenuItem @select="emit('set-zoom', 0.5)">50%</DropdownMenuItem>
            <DropdownMenuItem @select="emit('set-zoom', 1)">100%</DropdownMenuItem>
            <DropdownMenuItem @select="emit('set-zoom', 1.5)">150%</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button size="icon-sm" variant="ghost" class="h-8 w-8 rounded-[8px] text-[#7f8599]" @click="emit('fit-view')">
          <Focus class="size-4" />
        </Button>
        <Button size="icon-sm" variant="ghost" class="h-8 w-8 rounded-[8px] text-[#7f8599]" @click="emit('auto-layout')">
          <Blend class="size-4" />
        </Button>
        <Button size="icon-sm" variant="ghost" class="h-8 w-8 rounded-[8px] text-[#7f8599]" @click="emit('toggle-problems')">
          <MessageSquareText class="size-4" />
        </Button>
        <Button size="icon-sm" variant="ghost" class="h-8 w-8 rounded-[8px] text-[#7f8599]" @click="emit('open-history')">
          <Clock3 class="size-4" />
        </Button>
        <span class="mx-1 h-4 w-px bg-[#e4e7ef]" />
        <Button
          size="sm"
          class="h-8 rounded-[8px] bg-[#f4f1ff] px-3 text-xs text-[#6e57ff] shadow-none hover:bg-[#ece7ff]"
          @click="emit('open-add-node')"
        >
          <Plus class="mr-1 size-3.5" />
          添加节点
        </Button>
      </div>

      <div class="pointer-events-auto flex h-10 items-center gap-1 rounded-[10px] border border-[#e4e7ef] bg-white px-1 shadow-[0_2px_6px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.02)]">
        <Button
          size="sm"
          class="h-8 rounded-[8px] bg-[#14ae5c] px-4 text-xs text-white shadow-none hover:bg-[#11994f]"
          :disabled="running"
          @click="emit('open-test-run')"
        >
          <Bot class="mr-1 size-3.5" />
          {{ running ? '试运行中' : '试运行' }}
        </Button>
      </div>
    </div>
  </div>
</template>
