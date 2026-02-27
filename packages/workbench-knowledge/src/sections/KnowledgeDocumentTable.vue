<script setup lang="ts">
import { computed, h, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type {
  ColumnDef,
  SortingState,
  VisibilityState,
} from '@tanstack/vue-table'
import {
  FlexRender,
  getCoreRowModel,
  getSortedRowModel,
  useVueTable,
} from '@tanstack/vue-table'
import {
  ChevronLeft,
  ChevronRight,
  Columns3,
  RefreshCcw,
  Trash2,
} from 'lucide-vue-next'
import { Badge } from '@repo/ui-shadcn/components/ui/badge'
import { Button } from '@repo/ui-shadcn/components/ui/button'
import { Checkbox } from '@repo/ui-shadcn/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui-shadcn/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@repo/ui-shadcn/components/ui/dropdown-menu'
import { Input } from '@repo/ui-shadcn/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui-shadcn/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/ui-shadcn/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui-shadcn/components/ui/table'
import KnowledgeDocumentActionsMenu from '../components/KnowledgeDocumentActionsMenu.vue'
import KnowledgeTaskStatusBadge from '../components/KnowledgeTaskStatusBadge.vue'
import type {
  KnowledgeDocumentItem,
  KnowledgeDocumentReplacePayload,
  KnowledgeTaskProgress,
} from '../types/knowledge-ide'

const props = withDefaults(
  defineProps<{
    documents: KnowledgeDocumentItem[]
    total: number
    page: number
    limit: number
    loading?: boolean
    mutating?: boolean
    selectedDocumentUuid?: string | null
    taskProgressMap?: Record<string, KnowledgeTaskProgress | undefined>
  }>(),
  {
    loading: false,
    mutating: false,
    selectedDocumentUuid: null,
    taskProgressMap: () => ({}),
  },
)

const emit = defineEmits<{
  (event: 'refresh'): void
  (event: 'select-document', documentUuid: string): void
  (event: 'rename-document', payload: { documentUuid: string; fileName: string }): void
  (event: 'replace-document-from-local', payload: { documentUuid: string }): void
  (event: 'replace-document-from-url', payload: KnowledgeDocumentReplacePayload): void
  (event: 'remove-document', documentUuid: string): void
  (event: 'remove-documents', documentUuids: string[]): void
  (event: 'update:page', value: number): void
  (event: 'update:limit', value: number): void
}>()
const { t } = useI18n()

const sorting = ref<SortingState>([])
const columnVisibility = ref<VisibilityState>({
  file_type: true,
  file_size: true,
})
const rowSelection = ref<Record<string, boolean>>({})

const rowActionDocument = ref<KnowledgeDocumentItem | null>(null)
const renameDialogOpen = ref(false)
const replaceDialogOpen = ref(false)
const replaceMode = ref<'local' | 'url'>('local')
const removeDialogOpen = ref(false)
const bulkRemoveDialogOpen = ref(false)
const renameValue = ref('')
const replaceSourceUri = ref('')
const replaceFileName = ref('')

const getTaskProgress = (documentUuid: string): KnowledgeTaskProgress | null => {
  return props.taskProgressMap[documentUuid] ?? null
}

const openRenameDialog = (document: KnowledgeDocumentItem): void => {
  rowActionDocument.value = document
  renameValue.value = document.file_name
  renameDialogOpen.value = true
}

const openReplaceDialog = (document: KnowledgeDocumentItem): void => {
  rowActionDocument.value = document
  replaceMode.value = 'local'
  replaceSourceUri.value = document.source_uri
  replaceFileName.value = document.file_name
  replaceDialogOpen.value = true
}

const openRemoveDialog = (document: KnowledgeDocumentItem): void => {
  rowActionDocument.value = document
  removeDialogOpen.value = true
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

const columns: ColumnDef<KnowledgeDocumentItem>[] = [
  {
    id: 'select',
    header: ({ table }) =>
      h(Checkbox, {
        modelValue: table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate'),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') => table.toggleAllPageRowsSelected(value === true),
        'aria-label': t('platform.workbench.knowledge.table.selectAll'),
      }),
    cell: ({ row }) =>
      h(Checkbox, {
        modelValue: row.getIsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(value === true),
        'aria-label': t('platform.workbench.knowledge.table.selectOne', { name: row.original.file_name }),
      }),
    enableSorting: false,
    enableHiding: false,
    size: 32,
  },
  {
    accessorKey: 'file_name',
    header: () => t('platform.workbench.knowledge.table.columns.fileName'),
    cell: ({ row }) =>
      h('button', {
        class: 'max-w-[280px] truncate text-left text-sm font-medium hover:underline',
        onClick: () => emit('select-document', row.original.uuid),
      }, row.original.file_name),
    enableHiding: false,
  },
  {
    id: 'status',
    accessorFn: row => row.status,
    header: () => t('platform.workbench.knowledge.table.columns.status'),
    cell: ({ row }) =>
      h(KnowledgeTaskStatusBadge, {
        status: row.original.status,
        progress: getTaskProgress(row.original.uuid),
        compact: true,
      }),
  },
  {
    accessorKey: 'chunk_count',
    header: () => t('platform.workbench.knowledge.table.columns.chunks'),
    cell: ({ row }) => h('span', { class: 'text-sm text-muted-foreground' }, `${row.original.chunk_count}`),
  },
  {
    accessorKey: 'file_type',
    header: () => t('platform.workbench.knowledge.table.columns.type'),
    cell: ({ row }) =>
      h(Badge, { variant: 'outline' }, () => row.original.file_type || '-'),
  },
  {
    accessorKey: 'file_size',
    header: () => t('platform.workbench.knowledge.table.columns.size'),
    cell: ({ row }) => h('span', { class: 'text-sm text-muted-foreground' }, formatFileSize(row.original.file_size)),
  },
  {
    accessorKey: 'created_at',
    header: () => t('platform.workbench.knowledge.table.columns.created'),
    cell: ({ row }) => h('span', { class: 'text-sm text-muted-foreground' }, formatDateTime(row.original.created_at)),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) =>
      h('div', { class: 'flex justify-end', onClick: (event: MouseEvent) => event.stopPropagation() }, [
        h(KnowledgeDocumentActionsMenu, {
          disabled: props.mutating,
          onRename: () => openRenameDialog(row.original),
          onReplace: () => openReplaceDialog(row.original),
          onRemove: () => openRemoveDialog(row.original),
        }),
      ]),
    enableSorting: false,
    enableHiding: false,
  },
]

const table = useVueTable({
  get data() {
    return props.documents
  },
  get columns() {
    return columns
  },
  enableRowSelection: true,
  getRowId: (row) => row.uuid,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  onSortingChange: (updaterOrValue) => {
    sorting.value = typeof updaterOrValue === 'function'
      ? updaterOrValue(sorting.value)
      : updaterOrValue
  },
  onColumnVisibilityChange: (updaterOrValue) => {
    columnVisibility.value = typeof updaterOrValue === 'function'
      ? updaterOrValue(columnVisibility.value)
      : updaterOrValue
  },
  onRowSelectionChange: (updaterOrValue) => {
    rowSelection.value = typeof updaterOrValue === 'function'
      ? updaterOrValue(rowSelection.value)
      : updaterOrValue
  },
  state: {
    get sorting() {
      return sorting.value
    },
    get columnVisibility() {
      return columnVisibility.value
    },
    get rowSelection() {
      return rowSelection.value
    },
  },
})

const selectedCount = computed(() => {
  return table.getFilteredSelectedRowModel().rows.length
})

const selectedDocumentUuids = computed(() => {
  return table.getSelectedRowModel().rows.map(row => row.original.uuid)
})

const pageCount = computed(() => {
  if (props.total <= 0) {
    return 1
  }
  return Math.max(1, Math.ceil(props.total / props.limit))
})

const canGoPrev = computed(() => props.page > 1)
const canGoNext = computed(() => props.page < pageCount.value)

const handleRenameConfirm = (): void => {
  if (!rowActionDocument.value) {
    return
  }
  const nextName = renameValue.value.trim()
  if (!nextName) {
    return
  }
  emit('rename-document', {
    documentUuid: rowActionDocument.value.uuid,
    fileName: nextName,
  })
  renameDialogOpen.value = false
}

const handleReplaceConfirm = (): void => {
  if (!rowActionDocument.value) {
    return
  }
  const sourceUri = replaceSourceUri.value.trim()
  if (!sourceUri) {
    return
  }
  emit('replace-document-from-url', {
    documentUuid: rowActionDocument.value.uuid,
    sourceUri,
    fileName: replaceFileName.value.trim() || undefined,
  })
  replaceDialogOpen.value = false
}

const handleReplaceFromLocal = (): void => {
  if (!rowActionDocument.value) {
    return
  }
  emit('replace-document-from-local', {
    documentUuid: rowActionDocument.value.uuid,
  })
  replaceDialogOpen.value = false
}

const handleRemoveConfirm = (): void => {
  if (!rowActionDocument.value) {
    return
  }
  emit('remove-document', rowActionDocument.value.uuid)
  removeDialogOpen.value = false
}

const handleBulkRemoveConfirm = (): void => {
  if (!selectedDocumentUuids.value.length) {
    return
  }
  emit('remove-documents', selectedDocumentUuids.value)
  bulkRemoveDialogOpen.value = false
  rowSelection.value = {}
}
</script>

<template>
  <div class="min-h-[540px] rounded-xl border bg-background">
    <div class="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
      <div class="flex items-center gap-2">
        <p class="text-sm font-medium">{{ t('platform.workbench.knowledge.table.title') }}</p>
        <Badge variant="outline">{{ total }}</Badge>
      </div>
      <div class="flex items-center gap-2">
        <Button size="sm" variant="outline" :disabled="loading" @click="emit('refresh')">
          <RefreshCcw class="mr-1 size-3.5" />
          {{ t('common.refresh') }}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button size="sm" variant="outline">
              <Columns3 class="mr-1 size-3.5" />
              {{ t('platform.workbench.knowledge.table.columnsTitle') }}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-44">
            <DropdownMenuCheckboxItem
              v-for="column in table.getAllColumns().filter(column => column.getCanHide())"
              :key="column.id"
              class="capitalize"
              :model-value="column.getIsVisible()"
              @update:model-value="(value) => column.toggleVisibility(!!value)"
            >
              {{ column.id }}
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>

    <div class="px-3 py-2">
      <div class="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{{ t('platform.workbench.knowledge.table.selected', { count: selectedCount }) }}</span>
        <Button
          size="sm"
          variant="destructive"
          :disabled="!selectedDocumentUuids.length || mutating"
          @click="bulkRemoveDialogOpen = true"
        >
          <Trash2 class="mr-1 size-3.5" />
          {{ t('platform.workbench.knowledge.table.deleteSelected') }}
        </Button>
      </div>

      <div class="overflow-hidden rounded-md border">
        <Table>
          <TableHeader class="bg-muted/50">
            <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
              <TableHead v-for="header in headerGroup.headers" :key="header.id" :col-span="header.colSpan">
                <FlexRender v-if="!header.isPlaceholder" :render="header.column.columnDef.header" :props="header.getContext()" />
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            <template v-if="!loading && table.getRowModel().rows.length">
              <TableRow
                v-for="row in table.getRowModel().rows"
                :key="row.id"
                class="cursor-pointer"
                :class="{
                  'bg-muted/40': selectedDocumentUuid === row.original.uuid,
                }"
                @click="emit('select-document', row.original.uuid)"
              >
                <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id">
                  <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
                </TableCell>
              </TableRow>
            </template>
            <template v-else-if="loading">
              <TableEmpty :colspan="columns.length">{{ t('platform.workbench.knowledge.table.loading') }}</TableEmpty>
            </template>
            <template v-else>
              <TableEmpty :colspan="columns.length">{{ t('platform.workbench.knowledge.table.empty') }}</TableEmpty>
            </template>
          </TableBody>
        </Table>
      </div>

      <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{{ t('platform.workbench.knowledge.table.rows') }}</span>
          <Select :model-value="String(limit)" @update:model-value="emit('update:limit', Number($event))">
            <SelectTrigger class="h-8 w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-muted-foreground">{{ t('platform.workbench.knowledge.table.page', { page, total: pageCount }) }}</span>
          <Button size="icon" variant="outline" class="size-8" :disabled="!canGoPrev" @click="emit('update:page', page - 1)">
            <ChevronLeft class="size-4" />
          </Button>
          <Button size="icon" variant="outline" class="size-8" :disabled="!canGoNext" @click="emit('update:page', page + 1)">
            <ChevronRight class="size-4" />
          </Button>
        </div>
      </div>
    </div>

    <Dialog :open="renameDialogOpen" @update:open="renameDialogOpen = $event">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('platform.workbench.knowledge.dialogs.renameTitle') }}</DialogTitle>
          <DialogDescription>{{ t('platform.workbench.knowledge.dialogs.renameDescription') }}</DialogDescription>
        </DialogHeader>
        <Input v-model="renameValue" placeholder="file_name" />
        <DialogFooter>
          <Button variant="outline" @click="renameDialogOpen = false">{{ t('common.cancel') }}</Button>
          <Button :disabled="mutating || !renameValue.trim()" @click="handleRenameConfirm">{{ t('platform.workbench.header.actions.save') }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="replaceDialogOpen" @update:open="replaceDialogOpen = $event">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('platform.workbench.knowledge.dialogs.replaceTitle') }}</DialogTitle>
          <DialogDescription>{{ t('platform.workbench.knowledge.dialogs.replaceDescription') }}</DialogDescription>
        </DialogHeader>
        <Tabs v-model="replaceMode" class="space-y-2">
          <TabsList class="w-full">
            <TabsTrigger value="local" class="flex-1">{{ t('platform.workbench.knowledge.sourceModes.local') }}</TabsTrigger>
            <TabsTrigger value="url" class="flex-1">{{ t('platform.workbench.knowledge.sourceModes.url') }}</TabsTrigger>
          </TabsList>

          <TabsContent value="local" class="space-y-2 rounded-md border border-dashed p-3">
            <p class="text-xs text-muted-foreground">{{ t('platform.workbench.knowledge.sourceModes.localDescription') }}</p>
            <Button class="w-full" :disabled="mutating" @click="handleReplaceFromLocal">
              {{ t('platform.workbench.knowledge.sourceModes.chooseLocal') }}
            </Button>
          </TabsContent>

          <TabsContent value="url" class="space-y-2">
            <Input v-model="replaceSourceUri" placeholder="source_uri" />
            <Input v-model="replaceFileName" :placeholder="t('platform.workbench.knowledge.fileNameOptional')" />
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="outline" @click="replaceDialogOpen = false">{{ t('common.cancel') }}</Button>
          <Button
            v-if="replaceMode === 'url'"
            :disabled="mutating || !replaceSourceUri.trim()"
            @click="handleReplaceConfirm"
          >
            {{ t('platform.workbench.knowledge.dialogs.replaceAction') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="removeDialogOpen" @update:open="removeDialogOpen = $event">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('platform.workbench.knowledge.dialogs.removeTitle') }}</DialogTitle>
          <DialogDescription>{{ t('platform.workbench.knowledge.dialogs.removeDescription') }}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="removeDialogOpen = false">{{ t('common.cancel') }}</Button>
          <Button variant="destructive" :disabled="mutating" @click="handleRemoveConfirm">{{ t('platform.workbench.knowledge.dialogs.removeAction') }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="bulkRemoveDialogOpen" @update:open="bulkRemoveDialogOpen = $event">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('platform.workbench.knowledge.dialogs.removeSelectedTitle') }}</DialogTitle>
          <DialogDescription>
            {{ t('platform.workbench.knowledge.dialogs.removeSelectedDescription', { count: selectedDocumentUuids.length }) }}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="bulkRemoveDialogOpen = false">{{ t('common.cancel') }}</Button>
          <Button variant="destructive" :disabled="mutating || !selectedDocumentUuids.length" @click="handleBulkRemoveConfirm">
            {{ t('platform.workbench.knowledge.dialogs.removeAction') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
