<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { IconChevronLeft, IconChevronRight, IconEdit, IconFileCode, IconTrash } from '@tabler/icons-vue'
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
import { Textarea } from '@repo/ui-shadcn/components/ui/textarea'
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

const dataCellColSpan = computed(() => Math.max(1, props.visibleColumns.length + 1))
const sqlCellColSpan = computed(() => Math.max(1, props.sqlColumns.length))
</script>

<template>
  <Tabs :model-value="activeTab" class="flex min-h-0 flex-1 flex-col" @update:model-value="emit('update:activeTab', $event as TenantWorkspaceTab)">
    <div class="border-b px-4 py-2.5">
      <div class="flex items-center justify-between gap-3">
        <TabsList class="h-8">
          <TabsTrigger value="data">{{ t('platform.workbench.tenantdb.tabs.data') }}</TabsTrigger>
          <TabsTrigger value="sql">{{ t('platform.workbench.tenantdb.tabs.sql') }}</TabsTrigger>
        </TabsList>
        <p class="text-xs text-muted-foreground">
          {{ t('platform.workbench.tenantdb.paginationHint') }}
        </p>
      </div>
    </div>

    <TabsContent value="data" class="mt-0 flex min-h-0 flex-1 flex-col">
      <div class="flex items-center justify-between border-b px-4 py-2 text-xs text-muted-foreground">
        <span>{{ t('platform.workbench.tenantdb.count', { count: totalCount }) }}</span>
        <span>{{ t('platform.workbench.tenantdb.page', { page, total: pageCount }) }}</span>
      </div>
      <div class="min-h-0 flex-1 overflow-auto p-4">
        <template v-if="rowsLoading">
          <div class="space-y-2">
            <Skeleton class="h-9 w-full" />
            <Skeleton class="h-9 w-full" />
            <Skeleton class="h-9 w-full" />
          </div>
        </template>
        <template v-else>
          <div class="overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead v-for="columnName in visibleColumns" :key="columnName" class="font-mono">
                    {{ columnName }}
                  </TableHead>
                  <TableHead class="w-[84px] text-right">{{ t('platform.workbench.tenantdb.actions') }}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="(row, rowIndex) in rows" :key="String(row.id ?? rowIndex)">
                  <TableCell
                    v-for="columnName in visibleColumns"
                    :key="`${String(row.id ?? rowIndex)}:${columnName}`"
                    class="max-w-[260px] truncate font-mono text-xs"
                  >
                    {{ formatCell(row[columnName]) }}
                  </TableCell>
                  <TableCell>
                    <div class="flex justify-end gap-1">
                      <Button size="icon" variant="outline" class="size-8" @click="emit('edit-row', row)">
                        <IconEdit class="size-3.5" />
                      </Button>
                      <Button size="icon" variant="outline" class="size-8" @click="emit('delete-row', row)">
                        <IconTrash class="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                <TableRow v-if="!rows.length">
                  <TableCell :col-span="dataCellColSpan" class="py-8 text-center text-sm text-muted-foreground">
                    {{ selectedTable ? t('platform.workbench.tenantdb.noDataReturned') : t('platform.workbench.tenantdb.noTableSelected') }}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </template>
      </div>
      <div class="flex items-center justify-end gap-2 border-t px-4 py-2">
        <Button size="icon" variant="outline" :disabled="!canPreviousPage" @click="emit('previous-page')">
          <IconChevronLeft class="size-4" />
        </Button>
        <Button size="icon" variant="outline" :disabled="!canNextPage" @click="emit('next-page')">
          <IconChevronRight class="size-4" />
        </Button>
      </div>
    </TabsContent>

    <TabsContent value="sql" class="mt-0 flex min-h-0 flex-1 flex-col">
      <div class="space-y-3 border-b p-4">
        <div class="flex items-center gap-2 text-sm font-medium">
          <IconFileCode class="size-4 text-muted-foreground" />
          <span>{{ t('platform.workbench.tenantdb.sqlConsoleTitle') }}</span>
        </div>
        <Textarea
          :model-value="sqlText"
          class="min-h-36 font-mono text-xs"
          :placeholder="t('platform.workbench.tenantdb.sqlPlaceholder')"
          @update:model-value="emit('update:sqlText', String($event))"
        />
        <div class="flex items-center justify-between">
          <Button :disabled="!selectedTable || sqlRunning" @click="emit('run-sql')">
            {{ sqlRunning ? t('platform.workbench.header.actions.running') : t('platform.workbench.tenantdb.runSql') }}
          </Button>
          <span class="text-xs text-muted-foreground">{{ t('platform.workbench.tenantdb.resultMaxRows') }}</span>
        </div>
        <p v-if="sqlError" class="text-xs text-destructive">{{ sqlError }}</p>
      </div>
      <div class="min-h-0 flex-1 overflow-auto p-4">
        <div class="overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead v-for="columnName in sqlColumns" :key="columnName" class="font-mono">
                  {{ columnName }}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="(row, index) in sqlRows" :key="index">
                <TableCell
                  v-for="columnName in sqlColumns"
                  :key="`${index}-${columnName}`"
                  class="max-w-[280px] truncate font-mono text-xs"
                >
                  {{ formatCell(row[columnName]) }}
                </TableCell>
              </TableRow>
              <TableRow v-if="!sqlRows.length">
                <TableCell :col-span="sqlCellColSpan" class="py-8 text-center text-sm text-muted-foreground">
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
