<script setup lang="ts">
import type { AssetFolderTreeNodeRead } from '../types/asset-hub'

const props = withDefaults(
  defineProps<{
    nodes: AssetFolderTreeNodeRead[]
    activeFolderUuid?: string | null
    expanded: Record<string, boolean>
    depth?: number
  }>(),
  {
    activeFolderUuid: null,
    depth: 0,
  },
)

const emit = defineEmits<{
  (event: 'toggle', folderUuid: string): void
  (event: 'select', folderUuid: string): void
}>()
</script>

<template>
  <ul class="space-y-1">
    <li v-for="node in nodes" :key="node.uuid">
      <div class="flex items-center gap-1" :style="{ paddingLeft: `${depth * 12}px` }">
        <button
          type="button"
          class="flex h-6 w-6 items-center justify-center rounded text-xs text-muted-foreground hover:bg-muted"
          @click="emit('toggle', node.uuid)"
        >
          <span v-if="node.children.length">{{ expanded[node.uuid] ? '-' : '+' }}</span>
        </button>

        <button
          type="button"
          class="flex h-8 min-w-0 flex-1 items-center rounded px-2 text-left text-sm hover:bg-muted"
          :class="{ 'bg-primary/10 font-medium text-primary': activeFolderUuid === node.uuid }"
          @click="emit('select', node.uuid)"
        >
          <span class="truncate">{{ node.name }}</span>
        </button>
      </div>

      <AssetFolderTree
        v-if="node.children.length && expanded[node.uuid]"
        :nodes="node.children"
        :expanded="expanded"
        :active-folder-uuid="activeFolderUuid"
        :depth="depth + 1"
        @toggle="emit('toggle', $event)"
        @select="emit('select', $event)"
      />
    </li>
  </ul>
</template>
