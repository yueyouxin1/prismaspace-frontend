<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ArrowDown, ArrowUp, FilePenLine, Save, Trash2, X } from 'lucide-vue-next'
import { Badge } from '@prismaspace/ui-shadcn/components/ui/badge'
import { Button } from '@prismaspace/ui-shadcn/components/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@prismaspace/ui-shadcn/components/ui/context-menu'
import { Textarea } from '@prismaspace/ui-shadcn/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@prismaspace/ui-shadcn/components/ui/tooltip'
import type { KnowledgeChunkItem } from '../types/knowledge-ide'

const props = withDefaults(defineProps<{
  index: number
  chunk: KnowledgeChunkItem
  updating?: boolean
}>(), {
  updating: false,
})

const emit = defineEmits<{
  (event: 'update', payload: { chunkUuid: string; content: string }): void
}>()

const editing = ref(false)
const draftContent = ref('')

watch(
  () => props.chunk.content,
  (content) => {
    if (!editing.value) {
      draftContent.value = content
    }
  },
  { immediate: true },
)

const statusVariant = computed<'outline' | 'secondary' | 'destructive'>(() => {
  const status = String(props.chunk.status || '').toLowerCase()
  if (status === 'failed') {
    return 'destructive'
  }
  if (status === 'completed') {
    return 'secondary'
  }
  return 'outline'
})

const charCount = computed(() => props.chunk.content.length)

const startEdit = (): void => {
  editing.value = true
  draftContent.value = props.chunk.content
}

const cancelEdit = (): void => {
  editing.value = false
  draftContent.value = props.chunk.content
}

const save = (): void => {
  const nextContent = draftContent.value.trim()
  if (!nextContent || nextContent === props.chunk.content) {
    editing.value = false
    return
  }
  emit('update', {
    chunkUuid: props.chunk.uuid,
    content: nextContent,
  })
  editing.value = false
}
</script>

<template>
  <ContextMenu>
    <ContextMenuTrigger as-child>
      <article class="chunk-card group/chunk relative rounded-lg border bg-background p-4 transition hover:border-foreground/25">
        <div class="action-menu absolute right-2 top-2 z-10 flex items-center gap-1 rounded-md border bg-background/80 p-1 backdrop-blur">
          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                size="icon-sm"
                variant="ghost"
                class="h-7 w-7"
                :disabled="updating"
                @click.stop="startEdit"
              >
                <FilePenLine class="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>编辑</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger as-child>
              <Button size="icon-sm" variant="ghost" class="h-7 w-7" disabled @click.stop>
                <ArrowUp class="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>上方添加（即将开放）</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger as-child>
              <Button size="icon-sm" variant="ghost" class="h-7 w-7" disabled @click.stop>
                <ArrowDown class="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>下方添加（即将开放）</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger as-child>
              <Button size="icon-sm" variant="ghost" class="h-7 w-7 text-destructive" disabled @click.stop>
                <Trash2 class="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>删除（即将开放）</TooltipContent>
          </Tooltip>
        </div>

        <header class="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <div class="flex items-center gap-2">
            <span class="font-medium text-foreground">Chunk #{{ index + 1 }}</span>
            <Badge :variant="statusVariant">{{ chunk.status }}</Badge>
          </div>
          <div class="flex items-center gap-2">
            <span>{{ charCount }} chars</span>
            <span>{{ chunk.token_count }} tokens</span>
          </div>
        </header>

        <div v-if="editing" class="space-y-2">
          <Textarea
            v-model="draftContent"
            class="min-h-32 text-sm"
            autofocus
          />
          <div class="flex items-center justify-end gap-2">
            <Button size="sm" variant="outline" :disabled="updating" @click="cancelEdit">
              <X class="mr-1 size-3.5" />
              取消
            </Button>
            <Button size="sm" :disabled="updating" @click="save">
              <Save class="mr-1 size-3.5" />
              保存
            </Button>
          </div>
        </div>

        <p
          v-else
          class="cursor-text whitespace-pre-wrap break-words text-sm leading-6"
          @dblclick="startEdit"
        >
          {{ chunk.content || '（空内容）' }}
        </p>

        <p v-if="chunk.error_message" class="mt-2 text-xs text-destructive">
          {{ chunk.error_message }}
        </p>
      </article>
    </ContextMenuTrigger>

    <ContextMenuContent class="w-44">
      <ContextMenuItem @select.prevent="startEdit">编辑</ContextMenuItem>
      <ContextMenuItem disabled>上方添加</ContextMenuItem>
      <ContextMenuItem disabled>下方添加</ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem class="text-destructive" disabled>删除</ContextMenuItem>
    </ContextMenuContent>
  </ContextMenu>
</template>

<style scoped>
.action-menu {
  opacity: 0;
  transform: translateY(-4px);
  transition: all 150ms cubic-bezier(0.16, 1, 0.3, 1);
}

.chunk-card:hover .action-menu,
.chunk-card:focus-within .action-menu {
  opacity: 1;
  transform: translateY(0);
}
</style>
