<script setup lang="ts">
import { computed, ref } from 'vue'
import { Search } from 'lucide-vue-next'
import type { WorkflowNodeDefRead } from '@prismaspace/contracts'
import { Badge } from '@prismaspace/ui-shadcn/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@prismaspace/ui-shadcn/components/ui/dialog'
import { Input } from '@prismaspace/ui-shadcn/components/ui/input'
import { ScrollArea } from '@prismaspace/ui-shadcn/components/ui/scroll-area'
import type { WorkflowPaletteGroup } from '../types/workflow-ide'
import { resolveWorkflowIcon } from '../utils/workflow-icons'

const props = withDefaults(defineProps<{
  open: boolean
  groups: WorkflowPaletteGroup[]
}>(), {
  open: false,
})

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'select', definition: WorkflowNodeDefRead): void
}>()

const keyword = ref('')

const filteredGroups = computed(() => {
  const search = keyword.value.trim().toLowerCase()
  if (!search) {
    return props.groups
  }
  return props.groups
    .map(group => ({
      ...group,
      items: group.items.filter(item =>
        [item.label, item.description, item.node_uid, item.category]
          .filter(Boolean)
          .some(value => String(value).toLowerCase().includes(search)),
      ),
    }))
    .filter(group => group.items.length > 0)
})

const handleSelect = (definition: WorkflowNodeDefRead): void => {
  emit('select', definition)
  emit('update:open', false)
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="overflow-hidden border-0 bg-transparent p-0 shadow-none sm:max-w-[440px]">
      <div class="overflow-hidden rounded-[12px] border border-[#e4e7ef] bg-white shadow-[0_2px_6px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.02)]">
        <DialogHeader class="px-3 py-3">
          <DialogTitle class="sr-only">添加节点</DialogTitle>
          <div class="relative">
            <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9298ad]" />
            <Input
              v-model="keyword"
              class="h-8 rounded-[8px] border-[#ececf4] bg-white pl-9 text-sm shadow-none"
              placeholder="搜索节点、插件、工作流"
            />
          </div>
        </DialogHeader>

        <ScrollArea class="h-[580px]">
          <div class="space-y-3 px-3 pb-4 pt-0">
            <section v-for="group in filteredGroups" :key="group.key" class="space-y-1.5">
              <div class="flex items-center gap-2 px-1">
                <p class="text-sm font-medium text-[#70778c]">{{ group.label }}</p>
                <Badge variant="outline" class="h-5 rounded-full border-[#e7e7f3] bg-[#f7f7fb] px-2 text-[10px] text-[#7d8296]">{{ group.items.length }}</Badge>
              </div>
              <div class="grid grid-cols-2 gap-x-2 gap-y-1">
                <button
                  v-for="definition in group.items"
                  :key="definition.id"
                  type="button"
                  class="flex h-8 items-center gap-2 rounded-[8px] border border-transparent px-1.5 text-left transition-colors hover:bg-[#f4f5fb]"
                  @click="handleSelect(definition)"
                >
                  <div class="flex size-5 items-center justify-center rounded-[4px] border border-[#e4e7ef] bg-white">
                    <component :is="resolveWorkflowIcon(definition.icon || definition.node.registryId)" class="size-3.5 text-[#5f66ff]" />
                  </div>
                  <p class="truncate text-sm text-[#1f2335]">{{ definition.label }}</p>
                </button>
              </div>
            </section>

            <div v-if="!filteredGroups.length" class="rounded-[8px] border border-dashed border-[#e4e5ef] bg-[#fafafc] px-4 py-10 text-center text-sm text-[#8d93a6]">
              没有匹配的节点定义
            </div>
          </div>
        </ScrollArea>
      </div>
    </DialogContent>
  </Dialog>
</template>
