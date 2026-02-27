<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { IconChevronRight } from '@tabler/icons-vue'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@repo/ui-shadcn/components/ui/resizable'
import type { JsonRecord, TenantTableRead } from '@app/services/api/contracts'
import TenantDbExplorerTree from './sections/TenantDbExplorerTree.vue'
import TenantDbDataWorkspace from './sections/TenantDbDataWorkspace.vue'
import type { TenantExplorerActionPayload, TenantWorkspaceTab } from './types/tenantdb-ide'

const props = withDefaults(
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
    canPreviousPage: boolean
    canNextPage: boolean
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
  (event: 'previous-page'): void
  (event: 'next-page'): void
  (event: 'edit-row', row: JsonRecord): void
  (event: 'delete-row', row: JsonRecord): void
  (event: 'update:sqlText', value: string): void
  (event: 'run-sql'): void
}>()

const { t } = useI18n()

const activeWorkspaceLabel = computed(() => {
  return props.activeTab === 'sql'
    ? t('platform.workbench.tenantdb.ide.breadcrumbSql')
    : t('platform.workbench.tenantdb.ide.breadcrumbData')
})
</script>

<template>
  <div class="relative flex h-full min-h-0 flex-1 overflow-hidden bg-background">
    <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,hsl(var(--muted))_0%,transparent_42%)] opacity-50" />

    <ResizablePanelGroup direction="horizontal" class="relative hidden h-full min-h-0 w-full xl:flex">
      <ResizablePanel :default-size="24" :min-size="18" :max-size="40" class="min-h-0 px-2 pb-2 pt-2">
        <div class="h-full overflow-hidden rounded-xl border bg-card shadow-sm animate-in fade-in-0 duration-200">
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

      <ResizableHandle class="mx-0.5 my-2 w-1 rounded-full bg-border/70 transition-colors hover:bg-border" />

      <ResizablePanel :default-size="76" :min-size="50" class="min-h-0 pb-2 pr-2 pt-2">
        <section class="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border bg-card shadow-sm animate-in fade-in-0 slide-in-from-right-1 duration-200">
          <header class="border-b bg-background/90 px-5 py-3 backdrop-blur">
            <div class="flex items-center gap-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              <span>{{ t('platform.workbench.tenantdb.ide.breadcrumbSchema') }}</span>
              <IconChevronRight class="size-3.5" />
              <span>{{ activeWorkspaceLabel }}</span>
            </div>
            <div class="mt-2 flex items-start justify-between gap-3">
              <div class="min-w-0">
                <h3 class="truncate text-sm font-semibold">
                  {{ selectedTable?.label || selectedTable?.name || t('platform.workbench.tenantdb.noTableSelected') }}
                </h3>
                <p v-if="selectedTable" class="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                  {{ selectedTable.name }}
                </p>
              </div>
              <p class="hidden pt-0.5 text-[11px] text-muted-foreground xl:block">
                {{ t('platform.workbench.tenantdb.ide.contextMenuHint') }}
              </p>
            </div>
          </header>
          <TenantDbDataWorkspace
            :selected-table="selectedTable"
            :active-tab="activeTab"
            :rows-loading="rowsLoading"
            :rows="rows"
            :visible-columns="visibleColumns"
            :total-count="totalCount"
            :page="page"
            :page-count="pageCount"
            :can-previous-page="canPreviousPage"
            :can-next-page="canNextPage"
            :sql-text="sqlText"
            :sql-rows="sqlRows"
            :sql-columns="sqlColumns"
            :sql-error="sqlError"
            :sql-running="sqlRunning"
            @update:active-tab="emit('update:activeTab', $event)"
            @previous-page="emit('previous-page')"
            @next-page="emit('next-page')"
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
        <header class="border-b bg-background/90 px-4 py-2.5">
          <p class="mt-1 truncate text-[11px] text-muted-foreground">
            {{ selectedTable?.name || t('platform.workbench.tenantdb.noTableSelected') }}
          </p>
        </header>
        <TenantDbDataWorkspace
          :selected-table="selectedTable"
          :active-tab="activeTab"
          :rows-loading="rowsLoading"
          :rows="rows"
          :visible-columns="visibleColumns"
          :total-count="totalCount"
          :page="page"
          :page-count="pageCount"
          :can-previous-page="canPreviousPage"
          :can-next-page="canNextPage"
          :sql-text="sqlText"
          :sql-rows="sqlRows"
          :sql-columns="sqlColumns"
          :sql-error="sqlError"
          :sql-running="sqlRunning"
          @update:active-tab="emit('update:activeTab', $event)"
          @previous-page="emit('previous-page')"
          @next-page="emit('next-page')"
          @edit-row="emit('edit-row', $event)"
          @delete-row="emit('delete-row', $event)"
          @update:sql-text="emit('update:sqlText', $event)"
          @run-sql="emit('run-sql')"
        />
      </section>
    </div>
  </div>
</template>
