<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { useI18n } from 'vue-i18n'
import { useAssetUploader } from '../composables/useAssetUploader'
import type { AssetFolderTreeNodeRead, AssetHubAdapter, AssetRead, AssetType } from '../types/asset-hub'
import AssetFolderTree from './AssetFolderTree.vue'
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
import { ScrollArea } from '@repo/ui-shadcn/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableEmpty,
} from '@repo/ui-shadcn/components/ui/table'

const props = defineProps<{
  workspaceUuid: string
  adapter: AssetHubAdapter
}>()

const { t } = useI18n()
const queryClient = useQueryClient()

const keyword = ref('')
const typeFilter = ref<'all' | AssetType>('all')
const includeSubfolders = ref(true)
const page = ref(1)
const limit = ref(20)
const sortBy = ref<'updated_desc' | 'updated_asc' | 'name_asc' | 'name_desc'>('updated_desc')

const selectedFolderUuid = ref<string | null>(null)
const selectedAssetMap = ref<Record<string, boolean>>({})
const focusedAssetUuid = ref<string | null>(null)
const expandedFolders = ref<Record<string, boolean>>({})
const operationError = ref<string | null>(null)
const folderDialogOpen = ref(false)
const mobileFoldersOpen = ref(false)
const folderDialogMode = ref<'create' | 'rename' | 'move' | 'delete'>('create')
const folderNameInput = ref('')
const folderParentInput = ref<string>('root')
const inspectorName = ref('')
const inspectorFolder = ref<string>('root')

const fileInputRef = ref<HTMLInputElement | null>(null)

const uploader = useAssetUploader({
  adapter: props.adapter,
  workspaceUuid: props.workspaceUuid,
})

const uploaderTasks = computed(() => uploader.tasks.value)

const assetQuerySignature = computed(() => JSON.stringify({
  workspaceUuid: props.workspaceUuid,
  folderUuid: selectedFolderUuid.value,
  includeSubfolders: includeSubfolders.value,
  keyword: keyword.value.trim(),
  type: typeFilter.value,
  page: page.value,
  limit: limit.value,
}))

const folderTreeQuery = useQuery({
  queryKey: computed(() => ['asset-hub', props.workspaceUuid, 'folders', 'tree']),
  queryFn: async () => props.adapter.listFolderTree(props.workspaceUuid),
})

const assetsQuery = useQuery({
  queryKey: computed(() => ['asset-hub', props.workspaceUuid, 'assets', assetQuerySignature.value]),
  queryFn: async () => props.adapter.listAssets({
    workspace_uuid: props.workspaceUuid,
    folder_uuid: selectedFolderUuid.value,
    include_subfolders: includeSubfolders.value,
    keyword: keyword.value.trim() || undefined,
    type: typeFilter.value === 'all' ? undefined : typeFilter.value,
    page: page.value,
    limit: limit.value,
  }),
})

const flattenFolders = (
  nodes: AssetFolderTreeNodeRead[],
  depth = 0,
  result: Array<{ uuid: string; name: string; depth: number }> = [],
): Array<{ uuid: string; name: string; depth: number }> => {
  nodes.forEach((node) => {
    result.push({ uuid: node.uuid, name: node.name, depth })
    flattenFolders(node.children ?? [], depth + 1, result)
  })
  return result
}

const folderList = computed(() => flattenFolders(folderTreeQuery.data.value ?? []))

const folderOptions = computed(() => {
  return [
    { uuid: 'root', name: t('platform.pages.assets.folders.root'), depth: 0 },
    ...folderList.value,
  ]
})
const moveFolderOptions = computed(() => {
  if (!currentFolder.value) {
    return folderOptions.value
  }
  return folderOptions.value.filter(option => option.uuid !== currentFolder.value?.uuid)
})

const currentFolder = computed(() => {
  if (!selectedFolderUuid.value) {
    return null
  }
  return folderList.value.find(folder => folder.uuid === selectedFolderUuid.value) ?? null
})

const selectedFolderLabel = computed(() => {
  if (!currentFolder.value) {
    return t('platform.pages.assets.folders.root')
  }
  return currentFolder.value.name
})

const assets = computed(() => {
  const items = [...(assetsQuery.data.value?.items ?? [])]
  if (sortBy.value === 'name_asc') {
    return items.sort((left, right) => left.name.localeCompare(right.name))
  }
  if (sortBy.value === 'name_desc') {
    return items.sort((left, right) => right.name.localeCompare(left.name))
  }
  if (sortBy.value === 'updated_asc') {
    return items.sort((left, right) => Date.parse(left.updated_at) - Date.parse(right.updated_at))
  }
  return items.sort((left, right) => Date.parse(right.updated_at) - Date.parse(left.updated_at))
})

const selectedAssetUuids = computed(() => {
  return Object.entries(selectedAssetMap.value)
    .filter(([, checked]) => checked)
    .map(([uuid]) => uuid)
})

const selectedAsset = computed<AssetRead | null>(() => {
  if (!focusedAssetUuid.value) {
    return null
  }
  return assets.value.find(asset => asset.uuid === focusedAssetUuid.value) ?? null
})

const allCurrentPageSelected = computed(() => {
  if (!assets.value.length) {
    return false
  }
  return assets.value.every(asset => selectedAssetMap.value[asset.uuid])
})

const total = computed(() => assetsQuery.data.value?.total ?? 0)
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / limit.value)))

watch([keyword, typeFilter, includeSubfolders, limit], () => {
  page.value = 1
})

watch(selectedAsset, (asset) => {
  if (!asset) {
    inspectorName.value = ''
    inspectorFolder.value = 'root'
    return
  }
  inspectorName.value = asset.name
  inspectorFolder.value = asset.folder_uuid ?? 'root'
})

watch(assets, (items) => {
  const validMap: Record<string, boolean> = {}
  items.forEach((asset) => {
    if (selectedAssetMap.value[asset.uuid]) {
      validMap[asset.uuid] = true
    }
  })
  selectedAssetMap.value = validMap

  if (focusedAssetUuid.value && !items.some(asset => asset.uuid === focusedAssetUuid.value)) {
    focusedAssetUuid.value = items[0]?.uuid ?? null
  }
})

watch(folderTreeQuery.data, (tree) => {
  if (!tree) {
    return
  }
  tree.forEach((root) => {
    if (expandedFolders.value[root.uuid] === undefined) {
      expandedFolders.value[root.uuid] = true
    }
  })

  if (selectedFolderUuid.value && !folderList.value.some(folder => folder.uuid === selectedFolderUuid.value)) {
    selectedFolderUuid.value = null
  }
})

const invalidateAll = async (): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['asset-hub', props.workspaceUuid, 'assets'] }),
    queryClient.invalidateQueries({ queryKey: ['asset-hub', props.workspaceUuid, 'folders'] }),
  ])
  await Promise.all([assetsQuery.refetch(), folderTreeQuery.refetch()])
}

const createFolderMutation = useMutation({
  mutationFn: async (payload: { name: string; parentUuid: string | null }) => props.adapter.createFolder(props.workspaceUuid, {
    name: payload.name,
    parent_uuid: payload.parentUuid,
  }),
  onSuccess: async () => {
    operationError.value = null
    await invalidateAll()
  },
  onError: (error) => {
    operationError.value = error instanceof Error ? error.message : t('platform.pages.assets.errors.operationFailed')
  },
})

const updateFolderMutation = useMutation({
  mutationFn: async (payload: { folderUuid: string; name?: string; parentUuid?: string | null }) => {
    return props.adapter.patchFolder(payload.folderUuid, {
      name: payload.name,
      parent_uuid: payload.parentUuid,
    })
  },
  onSuccess: async () => {
    operationError.value = null
    await invalidateAll()
  },
  onError: (error) => {
    operationError.value = error instanceof Error ? error.message : t('platform.pages.assets.errors.operationFailed')
  },
})

const deleteFolderMutation = useMutation({
  mutationFn: async (folderUuid: string) => props.adapter.deleteFolder(folderUuid),
  onSuccess: async () => {
    operationError.value = null
    selectedFolderUuid.value = null
    await invalidateAll()
  },
  onError: (error) => {
    operationError.value = error instanceof Error ? error.message : t('platform.pages.assets.errors.operationFailed')
  },
})

const patchAssetMutation = useMutation({
  mutationFn: async (payload: { assetUuid: string; name?: string; folderUuid?: string | null }) => {
    return props.adapter.patchAsset(payload.assetUuid, {
      name: payload.name,
      folder_uuid: payload.folderUuid,
    })
  },
  onSuccess: async () => {
    operationError.value = null
    await assetsQuery.refetch()
  },
  onError: (error) => {
    operationError.value = error instanceof Error ? error.message : t('platform.pages.assets.errors.operationFailed')
  },
})

const deleteAssetsMutation = useMutation({
  mutationFn: async (assetUuids: string[]) => {
    await Promise.all(assetUuids.map(assetUuid => props.adapter.deleteAsset(assetUuid)))
  },
  onSuccess: async () => {
    operationError.value = null
    selectedAssetMap.value = {}
    focusedAssetUuid.value = null
    await assetsQuery.refetch()
  },
  onError: (error) => {
    operationError.value = error instanceof Error ? error.message : t('platform.pages.assets.errors.operationFailed')
  },
})

const openFolderDialog = (mode: 'create' | 'rename' | 'move' | 'delete'): void => {
  folderDialogMode.value = mode
  folderDialogOpen.value = true
  folderNameInput.value = currentFolder.value?.name ?? ''
  folderParentInput.value = 'root'
}

const submitFolderDialog = async (): Promise<void> => {
  if (folderDialogMode.value === 'create') {
    const name = folderNameInput.value.trim()
    if (!name) {
      return
    }
    await createFolderMutation.mutateAsync({
      name,
      parentUuid: selectedFolderUuid.value,
    })
    folderDialogOpen.value = false
    return
  }

  if (!currentFolder.value) {
    return
  }

  if (folderDialogMode.value === 'rename') {
    const name = folderNameInput.value.trim()
    if (!name) {
      return
    }
    await updateFolderMutation.mutateAsync({
      folderUuid: currentFolder.value.uuid,
      name,
    })
    folderDialogOpen.value = false
    return
  }

  if (folderDialogMode.value === 'move') {
    await updateFolderMutation.mutateAsync({
      folderUuid: currentFolder.value.uuid,
      parentUuid: folderParentInput.value === 'root' ? null : folderParentInput.value,
    })
    folderDialogOpen.value = false
    return
  }

  await deleteFolderMutation.mutateAsync(currentFolder.value.uuid)
  folderDialogOpen.value = false
}

const openFileDialog = (): void => {
  fileInputRef.value?.click()
}

const onUploadFiles = async (event: Event): Promise<void> => {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) {
    return
  }

  await uploader.uploadFiles(files, {
    folderUuid: selectedFolderUuid.value,
  })

  if (input) {
    input.value = ''
  }
  await invalidateAll()
}

const formatFileSize = (value?: number | null): string => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '-'
  }
  if (value < 1024) {
    return `${value} B`
  }
  const kb = value / 1024
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`
  }
  const mb = kb / 1024
  if (mb < 1024) {
    return `${mb.toFixed(1)} MB`
  }
  const gb = mb / 1024
  return `${gb.toFixed(1)} GB`
}

const formatDateTime = (value: string): string => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

const toggleSelectAsset = (assetUuid: string): void => {
  selectedAssetMap.value = {
    ...selectedAssetMap.value,
    [assetUuid]: !selectedAssetMap.value[assetUuid],
  }
}

const toggleSelectAll = (): void => {
  if (allCurrentPageSelected.value) {
    selectedAssetMap.value = {}
    return
  }
  const nextMap: Record<string, boolean> = {}
  assets.value.forEach((asset) => {
    nextMap[asset.uuid] = true
  })
  selectedAssetMap.value = nextMap
}

const saveInspector = async (): Promise<void> => {
  if (!selectedAsset.value) {
    return
  }

  await patchAssetMutation.mutateAsync({
    assetUuid: selectedAsset.value.uuid,
    name: inspectorName.value.trim() || selectedAsset.value.name,
    folderUuid: inspectorFolder.value === 'root' ? null : inspectorFolder.value,
  })
}

const removeFocusedAsset = async (): Promise<void> => {
  if (!selectedAsset.value) {
    return
  }
  await deleteAssetsMutation.mutateAsync([selectedAsset.value.uuid])
}

const removeSelectedAssets = async (): Promise<void> => {
  if (!selectedAssetUuids.value.length) {
    return
  }
  await deleteAssetsMutation.mutateAsync(selectedAssetUuids.value)
}

const toggleFolderExpand = (folderUuid: string): void => {
  expandedFolders.value = {
    ...expandedFolders.value,
    [folderUuid]: !expandedFolders.value[folderUuid],
  }
}

const renderAssetKind = (asset: AssetRead): string => {
  if (asset.type === 'image') {
    return t('platform.pages.assets.preview.image')
  }
  if (asset.type === 'video') {
    return t('platform.pages.assets.preview.video')
  }
  if (asset.type === 'audio') {
    return t('platform.pages.assets.preview.audio')
  }
  return t('platform.pages.assets.preview.file')
}

const openAssetInNewTab = (url: string): void => {
  window.open(url, '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <div class="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-slate-50 via-white to-blue-50 p-3 md:p-4 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
    <div class="mb-3 flex flex-wrap items-center gap-2 rounded-xl border bg-background/90 p-2 backdrop-blur">
      <input
        ref="fileInputRef"
        type="file"
        class="hidden"
        multiple
        @change="onUploadFiles"
      >

      <Button class="h-9" @click="openFileDialog">
        {{ t('platform.pages.assets.toolbar.upload') }}
      </Button>
      <Button class="h-9" variant="outline" @click="openFolderDialog('create')">
        {{ t('platform.pages.assets.toolbar.newFolder') }}
      </Button>
      <Button class="h-9 md:hidden" variant="outline" @click="mobileFoldersOpen = true">
        {{ t('platform.pages.assets.folders.title') }}
      </Button>

      <div class="min-w-[220px] flex-1">
        <Input
          v-model="keyword"
          :placeholder="t('platform.pages.assets.toolbar.searchPlaceholder')"
          @keyup.enter="assetsQuery.refetch()"
        />
      </div>

      <Select v-model="typeFilter">
        <SelectTrigger class="h-9 w-[140px]">
          <SelectValue :placeholder="t('platform.pages.assets.toolbar.typeFilter')" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{{ t('platform.pages.assets.filters.allTypes') }}</SelectItem>
          <SelectItem value="image">image</SelectItem>
          <SelectItem value="video">video</SelectItem>
          <SelectItem value="audio">audio</SelectItem>
          <SelectItem value="document">document</SelectItem>
          <SelectItem value="other">other</SelectItem>
        </SelectContent>
      </Select>

      <Select v-model="sortBy">
        <SelectTrigger class="h-9 w-[160px]">
          <SelectValue :placeholder="t('platform.pages.assets.toolbar.sortBy')" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="updated_desc">{{ t('platform.pages.assets.sort.updatedDesc') }}</SelectItem>
          <SelectItem value="updated_asc">{{ t('platform.pages.assets.sort.updatedAsc') }}</SelectItem>
          <SelectItem value="name_asc">{{ t('platform.pages.assets.sort.nameAsc') }}</SelectItem>
          <SelectItem value="name_desc">{{ t('platform.pages.assets.sort.nameDesc') }}</SelectItem>
        </SelectContent>
      </Select>

      <Button class="h-9" variant="outline" @click="invalidateAll">
        {{ t('common.refresh') }}
      </Button>
    </div>

    <p v-if="operationError" class="mb-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
      {{ operationError }}
    </p>

    <div class="grid gap-3 md:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)_320px]">
      <aside class="hidden min-h-[620px] rounded-xl border bg-background/90 p-3 md:block">
        <div class="mb-3 flex items-center justify-between">
          <p class="text-sm font-semibold">{{ t('platform.pages.assets.folders.title') }}</p>
          <Badge variant="outline">{{ folderList.length }}</Badge>
        </div>

        <div class="mb-2 flex gap-2">
          <Button size="sm" variant="outline" class="flex-1" :disabled="!currentFolder" @click="openFolderDialog('rename')">
            {{ t('platform.pages.assets.folders.rename') }}
          </Button>
          <Button size="sm" variant="outline" class="flex-1" :disabled="!currentFolder" @click="openFolderDialog('move')">
            {{ t('platform.pages.assets.folders.move') }}
          </Button>
        </div>

        <Button size="sm" variant="outline" class="mb-3 w-full" :disabled="!currentFolder" @click="openFolderDialog('delete')">
          {{ t('platform.pages.assets.folders.delete') }}
        </Button>

        <button
          type="button"
          class="mb-2 flex h-8 w-full items-center rounded px-2 text-left text-sm hover:bg-muted"
          :class="{ 'bg-primary/10 font-medium text-primary': !selectedFolderUuid }"
          @click="selectedFolderUuid = null"
        >
          {{ t('platform.pages.assets.folders.root') }}
        </button>

        <ScrollArea class="h-[460px] pr-2">
          <AssetFolderTree
            :nodes="folderTreeQuery.data.value ?? []"
            :expanded="expandedFolders"
            :active-folder-uuid="selectedFolderUuid"
            @toggle="toggleFolderExpand"
            @select="selectedFolderUuid = $event"
          />
        </ScrollArea>

        <label class="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <input v-model="includeSubfolders" type="checkbox" class="size-3.5">
          <span>{{ t('platform.pages.assets.folders.includeSubfolders') }}</span>
        </label>
      </aside>

      <section class="min-h-[620px] rounded-xl border bg-background/95">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
          <div class="flex items-center gap-2">
            <p class="text-sm font-semibold">{{ selectedFolderLabel }}</p>
            <Badge variant="outline">{{ total }}</Badge>
          </div>

          <div class="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              :disabled="!selectedAssetUuids.length || deleteAssetsMutation.isPending.value"
              @click="removeSelectedAssets"
            >
              {{ t('platform.pages.assets.toolbar.deleteSelected') }}
            </Button>
          </div>
        </div>

        <div class="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead class="w-10">
                  <input type="checkbox" :checked="allCurrentPageSelected" @change="toggleSelectAll">
                </TableHead>
                <TableHead>{{ t('platform.pages.assets.table.columns.name') }}</TableHead>
                <TableHead>{{ t('platform.pages.assets.table.columns.type') }}</TableHead>
                <TableHead>{{ t('platform.pages.assets.table.columns.size') }}</TableHead>
                <TableHead>{{ t('platform.pages.assets.table.columns.status') }}</TableHead>
                <TableHead>{{ t('platform.pages.assets.table.columns.updatedAt') }}</TableHead>
                <TableHead class="text-right">{{ t('platform.pages.assets.table.columns.actions') }}</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              <template v-if="!assetsQuery.isLoading.value && assets.length">
                <TableRow
                  v-for="asset in assets"
                  :key="asset.uuid"
                  class="cursor-pointer"
                  :class="{ 'bg-muted/40': focusedAssetUuid === asset.uuid }"
                  @click="focusedAssetUuid = asset.uuid"
                >
                  <TableCell>
                    <input type="checkbox" :checked="Boolean(selectedAssetMap[asset.uuid])" @click.stop @change="toggleSelectAsset(asset.uuid)">
                  </TableCell>
                  <TableCell>
                    <div class="flex items-center gap-3">
                      <div class="flex size-10 items-center justify-center overflow-hidden rounded border bg-muted">
                        <img v-if="asset.type === 'image'" :src="asset.url" :alt="asset.name" class="h-full w-full object-cover">
                        <span v-else class="text-[10px] uppercase text-muted-foreground">{{ renderAssetKind(asset) }}</span>
                      </div>
                      <div class="min-w-0">
                        <p class="truncate text-sm font-medium">{{ asset.name }}</p>
                        <p class="truncate text-xs text-muted-foreground">{{ asset.mime_type || '-' }}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{{ asset.type }}</Badge></TableCell>
                  <TableCell class="text-sm text-muted-foreground">{{ formatFileSize(asset.size) }}</TableCell>
                  <TableCell><Badge variant="secondary">{{ asset.status }}</Badge></TableCell>
                  <TableCell class="text-sm text-muted-foreground">{{ formatDateTime(asset.updated_at) }}</TableCell>
                  <TableCell>
                    <div class="flex justify-end gap-2" @click.stop>
                      <Button size="sm" variant="outline" @click="openAssetInNewTab(asset.url)">
                        {{ t('platform.pages.assets.table.preview') }}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        :disabled="deleteAssetsMutation.isPending.value"
                        @click="deleteAssetsMutation.mutate([asset.uuid])"
                      >
                        {{ t('platform.pages.assets.table.delete') }}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              </template>

              <template v-else-if="assetsQuery.isLoading.value">
                <TableEmpty :colspan="7">{{ t('platform.pages.assets.table.loading') }}</TableEmpty>
              </template>

              <template v-else>
                <TableEmpty :colspan="7">{{ t('platform.pages.assets.table.empty') }}</TableEmpty>
              </template>
            </TableBody>
          </Table>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2">
          <div class="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{{ t('platform.pages.assets.table.pageInfo', { page, total: pageCount }) }}</span>
            <Select v-model="limit">
              <SelectTrigger class="h-8 w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="20">20</SelectItem>
                <SelectItem :value="50">50</SelectItem>
                <SelectItem :value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="flex items-center gap-2">
            <Button size="sm" variant="outline" :disabled="page <= 1" @click="page -= 1">Prev</Button>
            <Button size="sm" variant="outline" :disabled="page >= pageCount" @click="page += 1">Next</Button>
          </div>
        </div>

        <div v-if="uploaderTasks.length" class="space-y-2 border-t px-3 py-2">
          <div class="flex items-center justify-between">
            <p class="text-xs font-medium text-muted-foreground">{{ t('platform.pages.assets.upload.tasks') }}</p>
            <Button size="sm" variant="ghost" @click="uploader.clearFinished">
              {{ t('platform.pages.assets.upload.clearFinished') }}
            </Button>
          </div>
          <div class="space-y-1">
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
        </div>
      </section>

      <aside class="hidden min-h-[620px] rounded-xl border bg-background/90 p-3 xl:block">
        <p class="mb-3 text-sm font-semibold">{{ t('platform.pages.assets.inspector.title') }}</p>

        <div v-if="selectedAsset" class="space-y-3">
          <div class="overflow-hidden rounded-lg border bg-muted">
            <img
              v-if="selectedAsset.type === 'image'"
              :src="selectedAsset.url"
              :alt="selectedAsset.name"
              class="max-h-52 w-full object-contain"
            >
            <video v-else-if="selectedAsset.type === 'video'" controls class="max-h-52 w-full">
              <source :src="selectedAsset.url">
            </video>
            <audio v-else-if="selectedAsset.type === 'audio'" controls class="w-full px-2 py-4">
              <source :src="selectedAsset.url">
            </audio>
            <div v-else class="flex h-28 items-center justify-center text-sm text-muted-foreground">
              {{ t('platform.pages.assets.preview.noPreview') }}
            </div>
          </div>

          <div class="space-y-2">
            <Label>{{ t('platform.pages.assets.inspector.rename') }}</Label>
            <Input v-model="inspectorName" />
          </div>

          <div class="space-y-2">
            <Label>{{ t('platform.pages.assets.inspector.moveTo') }}</Label>
            <Select v-model="inspectorFolder">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="folder in folderOptions" :key="folder.uuid" :value="folder.uuid">
                  {{ `${'  '.repeat(folder.depth)}${folder.name}` }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <Button :disabled="patchAssetMutation.isPending.value" @click="saveInspector">
              {{ t('platform.pages.assets.inspector.save') }}
            </Button>
            <Button variant="destructive" :disabled="deleteAssetsMutation.isPending.value" @click="removeFocusedAsset">
              {{ t('platform.pages.assets.inspector.delete') }}
            </Button>
          </div>

          <div class="rounded-md border bg-muted/20 p-2 text-xs text-muted-foreground">
            <p>{{ t('platform.pages.assets.inspector.type') }}: {{ selectedAsset.type }}</p>
            <p>{{ t('platform.pages.assets.inspector.size') }}: {{ formatFileSize(selectedAsset.size) }}</p>
            <p>{{ t('platform.pages.assets.inspector.updatedAt') }}: {{ formatDateTime(selectedAsset.updated_at) }}</p>
            <p class="truncate">URL: {{ selectedAsset.url }}</p>
          </div>
        </div>

        <p v-else class="text-sm text-muted-foreground">{{ t('platform.pages.assets.inspector.empty') }}</p>
      </aside>
    </div>

    <Dialog :open="mobileFoldersOpen" @update:open="mobileFoldersOpen = $event">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('platform.pages.assets.folders.title') }}</DialogTitle>
          <DialogDescription>{{ t('platform.pages.assets.folders.mobileHint') }}</DialogDescription>
        </DialogHeader>

        <button
          type="button"
          class="mb-2 flex h-8 w-full items-center rounded px-2 text-left text-sm hover:bg-muted"
          :class="{ 'bg-primary/10 font-medium text-primary': !selectedFolderUuid }"
          @click="selectedFolderUuid = null"
        >
          {{ t('platform.pages.assets.folders.root') }}
        </button>

        <ScrollArea class="h-72 pr-2">
          <AssetFolderTree
            :nodes="folderTreeQuery.data.value ?? []"
            :expanded="expandedFolders"
            :active-folder-uuid="selectedFolderUuid"
            @toggle="toggleFolderExpand"
            @select="selectedFolderUuid = $event"
          />
        </ScrollArea>
      </DialogContent>
    </Dialog>

    <Dialog :open="folderDialogOpen" @update:open="folderDialogOpen = $event">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <template v-if="folderDialogMode === 'create'">{{ t('platform.pages.assets.folders.createTitle') }}</template>
            <template v-else-if="folderDialogMode === 'rename'">{{ t('platform.pages.assets.folders.renameTitle') }}</template>
            <template v-else-if="folderDialogMode === 'move'">{{ t('platform.pages.assets.folders.moveTitle') }}</template>
            <template v-else>{{ t('platform.pages.assets.folders.deleteTitle') }}</template>
          </DialogTitle>
          <DialogDescription>
            <template v-if="folderDialogMode === 'create'">{{ t('platform.pages.assets.folders.createDescription') }}</template>
            <template v-else-if="folderDialogMode === 'rename'">{{ t('platform.pages.assets.folders.renameDescription') }}</template>
            <template v-else-if="folderDialogMode === 'move'">{{ t('platform.pages.assets.folders.moveDescription') }}</template>
            <template v-else>{{ t('platform.pages.assets.folders.deleteDescription') }}</template>
          </DialogDescription>
        </DialogHeader>

        <div v-if="folderDialogMode === 'create' || folderDialogMode === 'rename'" class="space-y-2">
          <Label>{{ t('platform.pages.assets.folders.name') }}</Label>
          <Input v-model="folderNameInput" />
        </div>

        <div v-if="folderDialogMode === 'move'" class="space-y-2">
          <Label>{{ t('platform.pages.assets.folders.parent') }}</Label>
          <Select v-model="folderParentInput">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="folder in moveFolderOptions" :key="folder.uuid" :value="folder.uuid">
                {{ `${'  '.repeat(folder.depth)}${folder.name}` }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div v-if="folderDialogMode === 'delete'" class="rounded-md border bg-destructive/5 p-3 text-sm text-destructive">
          {{ t('platform.pages.assets.folders.deleteConfirm', { name: currentFolder?.name || '-' }) }}
        </div>

        <DialogFooter>
          <Button variant="outline" @click="folderDialogOpen = false">{{ t('common.cancel') }}</Button>
          <Button
            :variant="folderDialogMode === 'delete' ? 'destructive' : 'default'"
            :disabled="createFolderMutation.isPending.value || updateFolderMutation.isPending.value || deleteFolderMutation.isPending.value"
            @click="submitFolderDialog"
          >
            {{ t('platform.pages.assets.actions.confirm') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
