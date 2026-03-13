<script setup lang="ts">
import { computed, ref } from 'vue'
import type { WorkflowNodeDefRead } from '@prismaspace/contracts'
import { Badge } from '@prismaspace/ui-shadcn/components/ui/badge'
import { Button } from '@prismaspace/ui-shadcn/components/ui/button'
import { Card, CardContent } from '@prismaspace/ui-shadcn/components/ui/card'
import { Input } from '@prismaspace/ui-shadcn/components/ui/input'
import { resolveWorkflowIcon } from '../utils/workflow-icons'
import type { WorkflowPaletteGroup } from '../types/workflow-ide'

const props = defineProps<{
  groups: WorkflowPaletteGroup[]
}>()

const emit = defineEmits<{
  (event: 'add-node', definition: WorkflowNodeDefRead): void
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

const handleDragStart = (event: DragEvent, definition: WorkflowNodeDefRead): void => {
  if (!event.dataTransfer) {
    return
  }
  event.dataTransfer.effectAllowed = 'copy'
  event.dataTransfer.setData('application/prismaspace-workflow-node', definition.node_uid)
  event.dataTransfer.setData('text/plain', definition.node_uid)
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div class="space-y-3 border-b px-4 py-4">
      <div>
        <p class="text-sm font-semibold">Node Library</p>
        <p class="text-xs text-muted-foreground">按类别快速创建工作流节点与依赖资源节点。</p>
      </div>
      <Input v-model="keyword" placeholder="搜索节点、类别或 registry id" />
    </div>

    <div class="min-h-0 flex-1 space-y-5 overflow-auto px-4 py-4">
      <section v-for="group in filteredGroups" :key="group.key" class="space-y-3">
        <div class="flex items-center justify-between">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{{ group.label }}</p>
          <Badge variant="outline">{{ group.items.length }}</Badge>
        </div>

        <div class="space-y-3">
          <Card
            v-for="definition in group.items"
            :key="definition.id"
            class="border-border/80 bg-background/95 shadow-sm"
            draggable="true"
            @dragstart="handleDragStart($event, definition)"
          >
            <CardContent class="space-y-3 p-3">
              <div class="flex items-start gap-3">
                <div class="rounded-xl border bg-muted/60 p-2">
                  <component :is="resolveWorkflowIcon(definition.icon)" class="size-4" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between gap-2">
                    <p class="truncate text-sm font-medium">{{ definition.label }}</p>
                    <Badge variant="secondary">{{ definition.node_uid }}</Badge>
                  </div>
                  <p v-if="definition.description" class="mt-1 text-xs text-muted-foreground">
                    {{ definition.description }}
                  </p>
                </div>
              </div>

              <div class="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>{{ definition.forms.length }} forms · 可拖入画布</span>
                <Button size="sm" @click="emit('add-node', definition)">添加</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <div v-if="!filteredGroups.length" class="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
        没有匹配的节点定义。
      </div>
    </div>
  </div>
</template>
