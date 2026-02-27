<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { IconChevronLeft, IconChevronRight, IconEdit, IconFileCode, IconTrash } from '@tabler/icons-vue'
import type * as monaco from 'monaco-editor'
import { MonacoEditor } from '@repo/editor'
import { Button } from '@repo/ui-shadcn/components/ui/button'
import { Skeleton } from '@repo/ui-shadcn/components/ui/skeleton'
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
    canPreviousPage: boolean
    canNextPage: boolean
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
  (event: 'previous-page'): void
  (event: 'next-page'): void
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

const dataCellColSpan = computed(() => Math.max(1, props.visibleColumns.length + 2))
const sqlCellColSpan = computed(() => Math.max(1, props.sqlColumns.length + 1))
</script>

<template>
  <Tabs :model-value="activeTab" class="flex min-h-0 flex-1 flex-col" @update:model-value="emit('update:activeTab', $event as TenantWorkspaceTab)">
    <div class="border-b bg-muted/25 px-4 py-2">
      <div class="flex items-center justify-between gap-3">
        <TabsList class="h-8 rounded-lg bg-background/70 p-1 shadow-xs">
          <TabsTrigger value="data" class="px-3 text-xs">
            {{ t('platform.workbench.tenantdb.tabs.data') }}
          </TabsTrigger>
          <TabsTrigger value="sql" class="px-3 text-xs">
            {{ t('platform.workbench.tenantdb.tabs.sql') }}
          </TabsTrigger>
        </TabsList>
        <p class="text-[11px] text-muted-foreground">
          {{ t('platform.workbench.tenantdb.paginationHint') }}
        </p>
      </div>
    </div>

    <TabsContent value="data" class="mt-0 flex min-h-0 flex-1 flex-col">
      <div class="flex items-center justify-between border-b px-4 py-2 text-[11px] text-muted-foreground">
        <span>{{ t('platform.workbench.tenantdb.count', { count: totalCount }) }}</span>
        <span>{{ t('platform.workbench.tenantdb.page', { page, total: pageCount }) }}</span>
      </div>
      <div class="min-h-0 flex-1 overflow-auto p-4">
        <template v-if="rowsLoading">
          <div class="space-y-2">
            <Skeleton class="h-8 w-full rounded-lg" />
            <Skeleton class="h-8 w-full rounded-lg" />
            <Skeleton class="h-8 w-full rounded-lg" />
            <Skeleton class="h-8 w-full rounded-lg" />
          </div>
        </template>
        <template v-else>
          <div class="overflow-hidden rounded-lg border bg-background shadow-xs">
            <Table>
              <TableHeader>
                <TableRow class="bg-muted/45">
                  <TableHead class="sticky top-0 left-0 z-20 w-14 bg-muted/85 text-center text-[11px]">#</TableHead>
                  <TableHead
                    v-for="columnName in visibleColumns"
                    :key="columnName"
                    class="sticky top-0 z-10 bg-muted/85 font-mono text-[11px] tracking-wide"
                  >
                    {{ columnName }}
                  </TableHead>
                  <TableHead class="sticky top-0 z-10 w-[92px] bg-muted/85 text-right text-[11px]">
                    {{ t('platform.workbench.tenantdb.actions') }}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  v-for="(row, rowIndex) in rows"
                  :key="String(row.id ?? rowIndex)"
                  :class="rowIndex % 2 === 0 ? 'bg-background' : 'bg-muted/[0.22]'"
                >
                  <TableCell class="sticky left-0 z-10 w-14 bg-inherit text-center font-mono text-[11px] text-muted-foreground">
                    {{ rowIndex + 1 }}
                  </TableCell>
                  <TableCell
                    v-for="columnName in visibleColumns"
                    :key="`${String(row.id ?? rowIndex)}:${columnName}`"
                    class="max-w-[260px] truncate font-mono text-[12px]"
                  >
                    {{ formatCell(row[columnName]) }}
                  </TableCell>
                  <TableCell>
                    <div class="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" class="size-7" @click="emit('edit-row', row)">
                        <IconEdit class="size-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" class="size-7 text-destructive hover:text-destructive" @click="emit('delete-row', row)">
                        <IconTrash class="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                <TableRow v-if="!rows.length">
                  <TableCell :col-span="dataCellColSpan" class="py-10 text-center text-sm text-muted-foreground">
                    {{ selectedTable ? t('platform.workbench.tenantdb.noDataReturned') : t('platform.workbench.tenantdb.noTableSelected') }}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </template>
      </div>
      <div class="flex items-center justify-between border-t bg-muted/15 px-4 py-2">
        <p class="text-[11px] text-muted-foreground">{{ t('platform.workbench.tenantdb.page', { page, total: pageCount }) }}</p>
        <div class="flex items-center gap-2">
          <Button size="icon" variant="outline" class="size-8" :disabled="!canPreviousPage" @click="emit('previous-page')">
            <IconChevronLeft class="size-4" />
          </Button>
          <Button size="icon" variant="outline" class="size-8" :disabled="!canNextPage" @click="emit('next-page')">
            <IconChevronRight class="size-4" />
          </Button>
        </div>
      </div>
    </TabsContent>

    <TabsContent value="sql" class="mt-0 flex min-h-0 flex-1 flex-col">
      <div class="space-y-3 border-b bg-muted/20 p-4">
        <div class="flex items-center gap-2 text-sm font-semibold">
          <IconFileCode class="size-4 text-muted-foreground" />
          <span>{{ t('platform.workbench.tenantdb.sqlConsoleTitle') }}</span>
        </div>

        <div class="overflow-hidden rounded-lg border bg-card shadow-xs">
          <MonacoEditor
            :model-value="sqlText"
            language="sql"
            :theme="monacoTheme"
            :height="220"
            :font-size="13"
            :minimap="false"
            line-numbers="on"
            :path="`tenantdb/sql/${selectedTable?.uuid || 'unselected'}.sql`"
            :placeholder="t('platform.workbench.tenantdb.sqlPlaceholder')"
            :options="{
              scrollBeyondLastLine: false,
              smoothScrolling: true,
              automaticLayout: true,
              roundedSelection: false,
              renderLineHighlight: 'line',
            }"
            @update:model-value="emit('update:sqlText', String($event))"
            @ready="handleSqlEditorReady"
          />
        </div>

        <div class="flex items-center justify-between gap-3">
          <Button :disabled="!selectedTable || sqlRunning" @click="emit('run-sql')">
            {{ sqlRunning ? t('platform.workbench.header.actions.running') : t('platform.workbench.tenantdb.runSql') }}
          </Button>
          <div class="text-right text-[11px] text-muted-foreground">
            <p>{{ t('platform.workbench.tenantdb.resultMaxRows') }}</p>
            <p>Ctrl/Cmd + Enter</p>
          </div>
        </div>
        <p v-if="sqlError" class="text-xs text-destructive">{{ sqlError }}</p>
      </div>

      <div class="min-h-0 flex-1 overflow-auto p-4">
        <div class="overflow-hidden rounded-lg border bg-background shadow-xs">
          <Table>
            <TableHeader>
              <TableRow class="bg-muted/45">
                <TableHead class="w-14 text-center text-[11px]">#</TableHead>
                <TableHead v-for="columnName in sqlColumns" :key="columnName" class="font-mono text-[11px]">
                  {{ columnName }}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="(row, rowIndex) in sqlRows"
                :key="rowIndex"
                :class="rowIndex % 2 === 0 ? 'bg-background' : 'bg-muted/[0.22]'"
              >
                <TableCell class="w-14 text-center font-mono text-[11px] text-muted-foreground">
                  {{ rowIndex + 1 }}
                </TableCell>
                <TableCell
                  v-for="columnName in sqlColumns"
                  :key="`${rowIndex}-${columnName}`"
                  class="max-w-[280px] truncate font-mono text-[12px]"
                >
                  {{ formatCell(row[columnName]) }}
                </TableCell>
              </TableRow>
              <TableRow v-if="!sqlRows.length">
                <TableCell :col-span="sqlCellColSpan" class="py-10 text-center text-sm text-muted-foreground">
                  {{ t('platform.workbench.tenantdb.noSqlRows') }}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </TabsContent>
  </Tabs>
</template>
