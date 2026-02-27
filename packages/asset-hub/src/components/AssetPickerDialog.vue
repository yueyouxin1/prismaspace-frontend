<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAssetUploader } from '../composables/useAssetUploader'
import type { AssetFolderTreeNodeRead, AssetHubAdapter, AssetRead } from '../types/asset-hub'
import { Badge } from '@repo/ui-shadcn/components/ui/badge'
import { Button } from '@repo/ui-shadcn/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui-shadcn/components/ui/dialog'
import { Input } from '@repo/ui-shadcn/components/ui/input'
import { Label } from '@repo/ui-shadcn/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui-shadcn/components/ui/select'
import { Separator } from '@repo/ui-shadcn/components/ui/separator'
import { ScrollArea } from '@repo/ui-shadcn/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/ui-shadcn/components/ui/tabs'

const props = withDefaults(
  defineProps<{
    open: boolean
    workspaceUuid: string | null
    adapter: AssetHubAdapter
    title?: string
    description?: string
    multiple?: boolean
  }>(),
  {
    title: '',
    description: '',
    multiple: false,
  },
)

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'selected', value: AssetRead[]): void
}>()

const { t } = useI18n()

const mode = ref<'local' | 'library'>('local')
const keyword = ref('')
const selectedFolderUuid = ref<string>('root')
const assets = ref<AssetRead[]>([])
const folderTree = ref<AssetFolderTreeNodeRead[]>([])
const selectedMap = ref<Record<string, boolean>>({})
const loading = ref(false)
const uploadPending = ref(false)

const fileInputRef = ref<HTMLInputElement | null>(null)

const uploader = useAssetUploader({
  adapter: props.adapter,
  workspaceUuid: props.workspaceUuid ?? '',
})

const uploaderTasks = computed(() => uploader.tasks.value)

const flattenFolders = (nodes: AssetFolderTreeNodeRead[], depth = 0): Array<{ uuid: string; label: string }> => {
  return nodes.flatMap((node) => {
    const prefix = depth > 0 ? `${'  '.repeat(depth)}- ` : ''
    return [
      { uuid: node.uuid, label: `${prefix}${node.name}` },
      ...flattenFolders(node.children ?? [], depth + 1),
    ]
  })
}

const folderOptions = computed(() => {
  return [
    { uuid: 'root', label: t('platform.pages.assets.folders.root') },
    ...flattenFolders(folderTree.value),
  ]
})

const selectedAssets = computed(() => {
  return assets.value.filter(asset => selectedMap.value[asset.uuid])
})

const currentFolderUuid = computed<string | null>(() => {
  return selectedFolderUuid.value === 'root' ? null : selectedFolderUuid.value
})

const openFileDialog = (): void => {
  fileInputRef.value?.click()
}

const loadFolders = async (): Promise<void> => {
  if (!props.workspaceUuid) {
    folderTree.value = []
    return
  }

  folderTree.value = await props.adapter.listFolderTree(props.workspaceUuid)
}

const loadAssets = async (): Promise<void> => {
  if (!props.workspaceUuid) {
    assets.value = []
    return
  }

  loading.value = true
  try {
    const result = await props.adapter.listAssets({
      workspace_uuid: props.workspaceUuid,
      folder_uuid: currentFolderUuid.value,
      include_subfolders: false,
      keyword: keyword.value.trim() || undefined,
      page: 1,
      limit: 80,
    })
    assets.value = result.items
  } finally {
    loading.value = false
  }
}

const onPickFiles = async (event: Event): Promise<void> => {
  if (!props.workspaceUuid) {
    return
  }

  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) {
    return
  }

  uploadPending.value = true
  try {
    const uploaded = await uploader.uploadFiles(files, {
      folderUuid: currentFolderUuid.value,
    })
    if (uploaded.length) {
      emit('selected', props.multiple ? uploaded : [uploaded[0] as AssetRead])
      emit('update:open', false)
      return
    }

    await Promise.all([loadAssets(), loadFolders()])
    mode.value = 'library'
  } finally {
    uploadPending.value = false
    if (input) {
      input.value = ''
    }
  }
}

const toggleSelected = (asset: AssetRead): void => {
  if (!props.multiple) {
    selectedMap.value = { [asset.uuid]: true }
    return
  }

  selectedMap.value = {
    ...selectedMap.value,
    [asset.uuid]: !selectedMap.value[asset.uuid],
  }
}

const confirmSelect = (): void => {
  if (!selectedAssets.value.length) {
    return
  }
  emit('selected', selectedAssets.value)
  emit('update:open', false)
}

watch(
  () => props.open,
  async (open) => {
    if (!open) {
      return
    }

    mode.value = 'local'
    keyword.value = ''
    selectedMap.value = {}
    selectedFolderUuid.value = 'root'

    await Promise.all([loadFolders(), loadAssets()])
  },
)

watch(currentFolderUuid, async () => {
  if (!props.open || mode.value !== 'library') {
    return
  }
  await loadAssets()
})
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-4xl">
      <DialogHeader>
        <DialogTitle>
          {{ title || t('platform.workbench.knowledge.assetPicker.title') }}
        </DialogTitle>
        <DialogDescription>
          {{ description || t('platform.workbench.knowledge.assetPicker.description') }}
        </DialogDescription>
      </DialogHeader>

      <Tabs v-model="mode" class="space-y-4">
        <TabsList>
          <TabsTrigger value="local">
            {{ t('platform.workbench.knowledge.sourceModes.local') }}
          </TabsTrigger>
          <TabsTrigger value="library">
            {{ t('platform.workbench.knowledge.assetPicker.libraryTab') }}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="local" class="space-y-4">
          <div class="rounded-xl border border-dashed bg-muted/20 p-8 text-center">
            <p class="text-sm text-muted-foreground">
              {{ t('platform.workbench.knowledge.assetPicker.localHint') }}
            </p>
            <input
              ref="fileInputRef"
              type="file"
              class="hidden"
              :multiple="multiple"
              @change="onPickFiles"
            >
            <Button class="mt-4" :disabled="uploadPending || !workspaceUuid" @click="openFileDialog">
              {{ uploadPending ? t('platform.workbench.knowledge.assetPicker.uploading') : t('platform.workbench.knowledge.assetPicker.chooseFiles') }}
            </Button>
            <p v-if="!workspaceUuid" class="mt-2 text-xs text-muted-foreground">
              {{ t('platform.workbench.errors.noWorkspaceInstance') }}
            </p>
          </div>

          <div v-if="uploaderTasks.length" class="space-y-2 rounded-md border p-3">
            <div class="flex items-center justify-between">
              <p class="text-xs font-medium text-muted-foreground">
                {{ t('platform.workbench.knowledge.assetPicker.tasks') }}
              </p>
              <Button size="sm" variant="ghost" @click="uploader.clearFinished">
                {{ t('platform.workbench.knowledge.assetPicker.clearFinished') }}
              </Button>
            </div>
            <div v-for="task in uploaderTasks" :key="task.id" class="flex items-center justify-between rounded border px-2 py-1 text-xs">
              <span class="truncate">{{ task.file.name }}</span>
              <div class="flex items-center gap-2">
                <Badge variant="outline">{{ task.status }}</Badge>
                <Button
                  v-if="task.status === 'uploading' || task.status === 'confirming'"
                  size="sm"
                  variant="ghost"
                  @click="uploader.cancelTask(task.id)"
                >
                  {{ t('common.cancel') }}
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="library" class="space-y-3">
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-[220px_minmax(0,1fr)_auto] sm:items-center">
            <Select v-model="selectedFolderUuid">
              <SelectTrigger>
                <SelectValue :placeholder="t('platform.pages.assets.folders.filterLabel')" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="folder in folderOptions" :key="folder.uuid" :value="folder.uuid">
                  {{ folder.label }}
                </SelectItem>
              </SelectContent>
            </Select>

            <div>
              <Label class="sr-only" for="asset-picker-search">{{ t('platform.pages.assets.toolbar.search') }}</Label>
              <Input
                id="asset-picker-search"
                v-model="keyword"
                :placeholder="t('platform.pages.assets.toolbar.searchPlaceholder')"
                @keyup.enter="loadAssets"
              />
            </div>

            <Button variant="outline" :disabled="loading" @click="loadAssets">
              {{ t('common.refresh') }}
            </Button>
          </div>

          <ScrollArea class="h-72 rounded-md border">
            <div v-if="loading" class="p-4 text-sm text-muted-foreground">
              {{ t('platform.pages.assets.table.loading') }}
            </div>
            <div v-else-if="!assets.length" class="p-4 text-sm text-muted-foreground">
              {{ t('platform.pages.assets.table.empty') }}
            </div>
            <div v-else class="divide-y">
              <button
                v-for="asset in assets"
                :key="asset.uuid"
                type="button"
                class="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted/50"
                @click="toggleSelected(asset)"
              >
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium">{{ asset.name }}</p>
                  <p class="truncate text-xs text-muted-foreground">{{ asset.type }} · {{ asset.mime_type || '-' }}</p>
                </div>
                <Badge :variant="selectedMap[asset.uuid] ? 'default' : 'outline'">
                  {{ selectedMap[asset.uuid] ? t('platform.workbench.knowledge.assetPicker.selected') : t('platform.workbench.knowledge.assetPicker.select') }}
                </Badge>
              </button>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      <Separator />

      <DialogFooter>
        <Button variant="outline" @click="emit('update:open', false)">{{ t('common.cancel') }}</Button>
        <Button :disabled="!selectedAssets.length" @click="confirmSelect">
          {{ t('platform.workbench.knowledge.assetPicker.useSelected') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
