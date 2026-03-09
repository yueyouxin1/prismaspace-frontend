<script setup lang="ts">
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@prismaspace/ui-shadcn/components/ui/resizable'
import type { JsonRecord, TenantTableRead } from '@prismaspace/contracts'
import TenantDbExplorerTree from './sections/TenantDbExplorerTree.vue'
import TenantDbDataWorkspace from './sections/TenantDbDataWorkspace.vue'
import type { TenantExplorerActionPayload, TenantWorkspaceTab } from './types/tenantdb-ide'

withDefaults(
  defineProps<{
    tables: TenantTableRead[]
    selectedTableUuid: string
    selectedTable: TenantTableRead | null
    searchText: string
    activeTab: TenantWorkspaceTab
    rowsLoading?: boolean
    tablesLoading?: boolean
    rows: JsonRecord[]
    visibleColumns: string[]
    totalCount: number
    page: number
    pageCount: number
    sqlText: string
    sqlRows: JsonRecord[]
    sqlColumns: string[]
    sqlError?: string
    sqlRunning?: boolean
  }>(),
  {
    rowsLoading: false,
    tablesLoading: false,
    sqlError: '',
    sqlRunning: false,
  },
)

const emit = defineEmits<{
  (event: 'update:searchText', value: string): void
  (event: 'select-table', tableUuid: string): void
  (event: 'open-action', payload: TenantExplorerActionPayload): void
  (event: 'create-table'): void
  (event: 'update:activeTab', value: TenantWorkspaceTab): void
  (event: 'goto-page', page: number): void
  (event: 'query-data'): void
  (event: 'insert-row'): void
  (event: 'edit-row', row: JsonRecord): void
  (event: 'delete-row', row: JsonRecord): void
  (event: 'update:sqlText', value: string): void
  (event: 'run-sql'): void
}>()
</script>

<template>
  <div class="relative flex h-full min-h-0 flex-1 overflow-hidden bg-background">
    <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,hsl(var(--muted))_0%,transparent_42%)] opacity-50" />

    <ResizablePanelGroup direction="horizontal" class="relative hidden h-full min-h-0 w-full xl:flex">
      <ResizablePanel :default-size="24" :min-size="18" :max-size="40" class="min-h-0">
        <div class="h-full overflow-hidden animate-in fade-in-0 duration-200">
          <TenantDbExplorerTree
            :tables="tables"
            :selected-table-uuid="selectedTableUuid"
            :loading="tablesLoading"
            :search-text="searchText"
            class="h-full"
            @update:search-text="emit('update:searchText', $event)"
            @select-table="emit('select-table', $event)"
            @open-action="emit('open-action', $event)"
            @create-table="emit('create-table')"
          />
        </div>
      </ResizablePanel>

      <ResizableHandle />

      <ResizablePanel :default-size="76" :min-size="50" class="min-h-0">
        <section class="flex h-full min-h-0 flex-col overflow-hidden animate-in fade-in-0 slide-in-from-right-1 duration-200">
          <TenantDbDataWorkspace
            :selected-table="selectedTable"
            :active-tab="activeTab"
            :rows-loading="rowsLoading"
            :rows="rows"
            :visible-columns="visibleColumns"
            :total-count="totalCount"
            :page="page"
            :page-count="pageCount"
            :sql-text="sqlText"
            :sql-rows="sqlRows"
            :sql-columns="sqlColumns"
            :sql-error="sqlError"
            :sql-running="sqlRunning"
            @update:active-tab="emit('update:activeTab', $event)"
            @goto-page="emit('goto-page', $event)"
            @query-data="emit('query-data')"
            @insert-row="emit('insert-row')"
            @edit-row="emit('edit-row', $event)"
            @delete-row="emit('delete-row', $event)"
            @update:sql-text="emit('update:sqlText', $event)"
            @run-sql="emit('run-sql')"
          />
        </section>
      </ResizablePanel>
    </ResizablePanelGroup>

    <div class="relative flex min-h-0 flex-1 flex-col gap-2 p-2 xl:hidden">
      <div class="h-[284px] min-h-[224px] overflow-hidden rounded-xl border bg-card shadow-sm">
        <TenantDbExplorerTree
          :tables="tables"
          :selected-table-uuid="selectedTableUuid"
          :loading="tablesLoading"
          :search-text="searchText"
          class="h-full"
          @update:search-text="emit('update:searchText', $event)"
          @select-table="emit('select-table', $event)"
          @open-action="emit('open-action', $event)"
          @create-table="emit('create-table')"
        />
      </div>
      <section class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
        <TenantDbDataWorkspace
          :selected-table="selectedTable"
          :active-tab="activeTab"
          :rows-loading="rowsLoading"
          :rows="rows"
          :visible-columns="visibleColumns"
          :total-count="totalCount"
          :page="page"
          :page-count="pageCount"
          :sql-text="sqlText"
          :sql-rows="sqlRows"
          :sql-columns="sqlColumns"
          :sql-error="sqlError"
          :sql-running="sqlRunning"
          @update:active-tab="emit('update:activeTab', $event)"
          @goto-page="emit('goto-page', $event)"
          @query-data="emit('query-data')"
          @insert-row="emit('insert-row')"
          @edit-row="emit('edit-row', $event)"
          @delete-row="emit('delete-row', $event)"
          @update:sql-text="emit('update:sqlText', $event)"
          @run-sql="emit('run-sql')"
        />
      </section>
    </div>
  </div>
</template>
