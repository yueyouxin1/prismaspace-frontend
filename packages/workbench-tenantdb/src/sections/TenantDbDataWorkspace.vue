<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  IconEdit,
  IconFileCode,
  IconPlayerPlay,
  IconBell,
  IconPlus,
  IconSearch,
  IconTrash,
} from '@tabler/icons-vue'
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-vue-next"
import type * as monaco from 'monaco-editor'
import { MonacoEditor } from '@repo/editor'
import { Button } from '@repo/ui-shadcn/components/ui/button'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@repo/ui-shadcn/components/ui/pagination'
import { Skeleton } from '@repo/ui-shadcn/components/ui/skeleton'
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@repo/ui-shadcn/components/ui/empty'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui-shadcn/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/ui-shadcn/components/ui/tabs'
import type { JsonRecord, TenantTableRead } from '@app/services/api/contracts'
import type { TenantWorkspaceTab } from '../types/tenantdb-ide'

const props = withDefaults(
  defineProps<{
    selectedTable: TenantTableRead | null
    activeTab: TenantWorkspaceTab
    rows: JsonRecord[]
    visibleColumns: string[]
    rowsLoading?: boolean
    totalCount: number
    page: number
    pageCount: number
    sqlText: string
    sqlRows: JsonRecord[]
    sqlColumns: string[]
    sqlError?: string
    sqlRunning?: boolean
    formatCell?: (value: unknown) => string
  }>(),
  {
    rowsLoading: false,
    sqlError: '',
    sqlRunning: false,
    formatCell: (value: unknown) => {
      if (value === null) {
        return 'null'
      }
      if (value === undefined) {
        return ''
      }
      if (typeof value === 'object') {
        try {
          return JSON.stringify(value)
        } catch {
          return '[object]'
        }
      }
      return String(value)
    },
  },
)

const emit = defineEmits<{
  (event: 'update:activeTab', value: TenantWorkspaceTab): void
  (event: 'goto-page', value: number): void
  (event: 'query-data'): void
  (event: 'insert-row'): void
  (event: 'edit-row', row: JsonRecord): void
  (event: 'delete-row', row: JsonRecord): void
  (event: 'update:sqlText', value: string): void
  (event: 'run-sql'): void
}>()

const { t } = useI18n()

const monacoTheme = ref<'vs-light' | 'vs-dark'>('vs-light')
let themeObserver: MutationObserver | null = null

const syncMonacoTheme = (): void => {
  if (typeof document === 'undefined') {
    return
  }
  monacoTheme.value = document.documentElement.classList.contains('dark') ? 'vs-dark' : 'vs-light'
}

onMounted(() => {
  if (typeof document === 'undefined') {
    return
  }
  syncMonacoTheme()
  themeObserver = new MutationObserver(syncMonacoTheme)
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  })
})

onBeforeUnmount(() => {
  themeObserver?.disconnect()
  themeObserver = null
})

const handleSqlEditorReady = (payload: { editor: monaco.editor.IStandaloneCodeEditor; monaco: typeof monaco }): void => {
  payload.editor.addCommand(payload.monaco.KeyMod.CtrlCmd | payload.monaco.KeyCode.Enter, () => {
    if (!props.selectedTable || props.sqlRunning) {
      return
    }
    emit('run-sql')
  })
}

const sqlCellColSpan = computed(() => Math.max(1, props.sqlColumns.length + 1))
const dataPaginationTotal = computed(() => Math.max(1, props.pageCount))
const sqlItemsPerPage = 20
const sqlPage = ref(1)

const sqlPageCount = computed(() => Math.max(1, Math.ceil(props.sqlRows.length / sqlItemsPerPage)))
const sqlPaginationTotal = computed(() => Math.max(1, sqlPageCount.value))

const sqlPagedRows = computed(() => {
  const start = (sqlPage.value - 1) * sqlItemsPerPage
  return props.sqlRows.slice(start, start + sqlItemsPerPage)
})

watch(
  () => props.sqlRows,
  () => {
    sqlPage.value = 1
  },
)

watch(sqlPageCount, (count) => {
  if (sqlPage.value > count) {
    sqlPage.value = count
  }
})

const handleQueryAction = (): void => {
  if (!props.selectedTable) {
    return
  }
  emit('update:activeTab', 'data')
  emit('query-data')
}

const handleInsertAction = (): void => {
  if (!props.selectedTable) {
    return
  }
  emit('insert-row')
}

const handleExecuteAction = (): void => {
  if (!props.selectedTable || props.sqlRunning) {
    return
  }
  emit('update:activeTab', 'sql')
  emit('run-sql')
}

const handleDataPageUpdate = (nextPage: number): void => {
  if (nextPage === props.page) {
    return
  }
  emit('goto-page', nextPage)
}
</script>

<template>
  <Tabs :model-value="activeTab" class="gap-0 flex min-h-0 flex-1 flex-col"
    @update:model-value="emit('update:activeTab', $event as TenantWorkspaceTab)">
    <div class="border-b bg-muted/20 px-4 py-2.5">
      <div class="grid gap-2 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] xl:items-center">
        <div class="min-w-0">
          <h3 class="truncate text-sm font-semibold">
            {{ selectedTable?.label || selectedTable?.name || t('platform.workbench.tenantdb.noTableSelected') }}
          </h3>
          <p v-if="selectedTable" class="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
            {{ selectedTable.name }}
          </p>
        </div>

        <div class="flex justify-start xl:justify-center">
          <TabsList class="h-8 rounded-lg bg-background/70 p-1 shadow-xs">
            <TabsTrigger value="data" class="px-3 text-xs">
              {{ t('platform.workbench.tenantdb.tabs.data') }}
            </TabsTrigger>
            <TabsTrigger value="sql" class="px-3 text-xs">
              {{ t('platform.workbench.tenantdb.tabs.sql') }}
            </TabsTrigger>
          </TabsList>
        </div>

        <div class="flex flex-wrap items-center justify-start gap-2 xl:justify-end">
          <Button size="sm" variant="outline" :disabled="!selectedTable" class="h-8 gap-1.5" @click="handleQueryAction">
            <IconSearch class="size-3.5" />
            {{ t('platform.workbench.actions.query') }}
          </Button>
          <Button size="sm" variant="outline" :disabled="!selectedTable" class="h-8 gap-1.5"
            @click="handleInsertAction">
            <IconPlus class="size-3.5" />
            {{ t('platform.workbench.tenantdb.insert') }}
          </Button>
        </div>
      </div>
    </div>

    <TabsContent value="data" class="mt-0 flex min-h-0 flex-1 flex-col">
      <div class="min-h-0 flex-1 overflow-auto">
        <template v-if="rowsLoading">
          <div class="space-y-2">
            <Skeleton class="h-8 w-full rounded-lg" />
            <Skeleton class="h-8 w-full rounded-lg" />
            <Skeleton class="h-8 w-full rounded-lg" />
            <Skeleton class="h-8 w-full rounded-lg" />
          </div>
        </template>
        <template v-else>
          <div class="h-full overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow class="bg-muted/45">
                  <TableHead class="sticky top-0 left-0 z-20 w-14 bg-muted/85 text-center text-[11px]">#</TableHead>
                  <TableHead v-for="columnName in visibleColumns" :key="columnName"
                    class="sticky top-0 z-10 bg-muted/85 font-mono text-[11px] tracking-wide">
                    {{ columnName }}
                  </TableHead>
                  <TableHead class="sticky top-0 z-10 w-[92px] bg-muted/85 text-right text-[11px]">
                    {{ t('platform.workbench.tenantdb.actions') }}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="(row, rowIndex) in rows" :key="String(row.id ?? rowIndex)"
                  :class="rowIndex % 2 === 0 ? 'bg-background' : 'bg-muted/[0.22]'">
                  <TableCell
                    class="sticky left-0 z-10 w-14 bg-inherit text-center font-mono text-[11px] text-muted-foreground">
                    {{ rowIndex + 1 }}
                  </TableCell>
                  <TableCell v-for="columnName in visibleColumns" :key="`${String(row.id ?? rowIndex)}:${columnName}`"
                    class="max-w-[260px] truncate font-mono text-[12px]">
                    {{ formatCell(row[columnName]) }}
                  </TableCell>
                  <TableCell>
                    <div class="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" class="size-7" @click="emit('edit-row', row)">
                        <IconEdit class="size-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" class="size-7 text-destructive hover:text-destructive"
                        @click="emit('delete-row', row)">
                        <IconTrash class="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <div className="bg-muted/30 h-full flex items-center" v-if="!rows.length">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <IconBell />
                  </EmptyMedia>
                  <EmptyTitle>{{ selectedTable ? t('platform.workbench.tenantdb.noDataReturned') :
                    t('platform.workbench.tenantdb.noTableSelected') }}</EmptyTitle>
                </EmptyHeader>
              </Empty>
            </div>
          </div>
        </template>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/15 px-4 py-2.5">
        <div class="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span>{{ t('platform.workbench.tenantdb.count', { count: totalCount }) }}</span>
          <span>{{ t('platform.workbench.tenantdb.page', { page, total: pageCount }) }}</span>
        </div>
        <Pagination class="mx-0 w-auto" :page="page" :total="dataPaginationTotal" :items-per-page="1" :sibling-count="1"
          show-edges @update:page="handleDataPageUpdate">
          <PaginationContent v-slot="{ items }">
            <PaginationPrevious>
              <ChevronLeftIcon />
            </PaginationPrevious>
            <template v-for="(item, index) in items"
              :key="`data-pagination-${index}-${item.type === 'page' ? item.value : 'ellipsis'}`">
              <PaginationItem v-if="item.type === 'page'" :value="item.value" :is-active="item.value === page">
                {{ item.value }}
              </PaginationItem>
              <PaginationEllipsis v-else />
            </template>
            <PaginationNext>
              <ChevronRightIcon />
            </PaginationNext>
          </PaginationContent>
        </Pagination>
      </div>
    </TabsContent>

    <TabsContent value="sql" class="mt-0 flex min-h-0 flex-1 flex-col">
      <div class="space-y-3 border-b bg-muted/20 p-4">
        <div class="flex items-center gap-2 text-sm font-semibold">
          <IconFileCode class="size-4 text-muted-foreground" />
          <span>{{ t('platform.workbench.tenantdb.sqlConsoleTitle') }}</span>
        </div>

        <div class="overflow-hidden rounded-lg border bg-card shadow-xs">
          <MonacoEditor :model-value="sqlText" language="sql" :theme="monacoTheme" :height="220" :font-size="13"
            :minimap="false" line-numbers="on" :path="`tenantdb/sql/${selectedTable?.uuid || 'unselected'}.sql`"
            :placeholder="t('platform.workbench.tenantdb.sqlPlaceholder')" :options="{
              scrollBeyondLastLine: false,
              smoothScrolling: true,
              automaticLayout: true,
              roundedSelection: false,
              renderLineHighlight: 'line',
            }" @update:model-value="emit('update:sqlText', String($event))" @ready="handleSqlEditorReady" />
        </div>

        <div class="flex items-center justify-between gap-3">
          <Button class="h-8 gap-1.5" size="sm" :disabled="!selectedTable || sqlRunning" @click="emit('run-sql')">
            <IconPlayerPlay class="size-3.5" />
            {{ sqlRunning ? t('platform.workbench.header.actions.running') : t('platform.workbench.tenantdb.runSql') }}
          </Button>
          <div class="text-right text-[11px] text-muted-foreground">
            <p>{{ t('platform.workbench.tenantdb.resultMaxRows') }}</p>
            <p>Ctrl/Cmd + Enter</p>
          </div>
        </div>
        <p v-if="sqlError" class="text-xs text-destructive">{{ sqlError }}</p>
      </div>

      <div class="min-h-0 flex-1 overflow-auto">
        <div class="h-full overflow-hidden">
          <Table v-if="sqlPagedRows.length">
            <TableHeader>
              <TableRow class="bg-muted/45">
                <TableHead class="w-14 text-center text-[11px]">#</TableHead>
                <TableHead v-for="columnName in sqlColumns" :key="columnName" class="font-mono text-[11px]">
                  {{ columnName }}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="(row, rowIndex) in sqlPagedRows" :key="rowIndex"
                :class="rowIndex % 2 === 0 ? 'bg-background' : 'bg-muted/[0.22]'">
                <TableCell class="w-14 text-center font-mono text-[11px] text-muted-foreground">
                  {{ (sqlPage - 1) * sqlItemsPerPage + rowIndex + 1 }}
                </TableCell>
                <TableCell v-for="columnName in sqlColumns" :key="`${rowIndex}-${columnName}`"
                  class="max-w-[280px] truncate font-mono text-[12px]">
                  {{ formatCell(row[columnName]) }}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <div className="bg-muted/30 h-full flex items-center" v-else>
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <IconBell />
                </EmptyMedia>
                <EmptyTitle>{{ t('platform.workbench.tenantdb.noSqlRows') }}</EmptyTitle>
              </EmptyHeader>
            </Empty>
          </div>
        </div>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/15 px-4 py-2.5">
        <div class="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span>{{ t('platform.workbench.tenantdb.count', { count: sqlRows.length }) }}</span>
          <span>{{ t('platform.workbench.tenantdb.page', { page: sqlPage, total: sqlPageCount }) }}</span>
        </div>

        <Pagination class="mx-0 w-auto" :page="sqlPage" :total="sqlPaginationTotal" :items-per-page="1"
          :sibling-count="1" show-edges @update:page="sqlPage = Number($event)">
          <PaginationContent v-slot="{ items }">
            <PaginationPrevious>
              <ChevronLeftIcon />
            </PaginationPrevious>
            <template v-for="(item, index) in items"
              :key="`sql-pagination-${index}-${item.type === 'page' ? item.value : 'ellipsis'}`">
              <PaginationItem v-if="item.type === 'page'" :value="item.value" :is-active="item.value === sqlPage">
                {{ item.value }}
              </PaginationItem>
              <PaginationEllipsis v-else />
            </template>
            <PaginationNext>
              <ChevronRightIcon />
            </PaginationNext>
          </PaginationContent>
        </Pagination>
      </div>
    </TabsContent>
  </Tabs>
</template>
