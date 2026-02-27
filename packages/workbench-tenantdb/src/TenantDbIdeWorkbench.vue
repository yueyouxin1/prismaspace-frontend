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
  <div class="flex h-full min-h-0 flex-1 overflow-hidden bg-background">
    <ResizablePanelGroup direction="horizontal" class="hidden h-full min-h-0 xl:flex">
      <ResizablePanel :default-size="24" :min-size="18" :max-size="40" class="min-h-0">
        <TenantDbExplorerTree
          :tables="tables"
          :selected-table-uuid="selectedTableUuid"
          :loading="tablesLoading"
          :search-text="searchText"
          class="h-full border-r"
          @update:search-text="emit('update:searchText', $event)"
          @select-table="emit('select-table', $event)"
          @open-action="emit('open-action', $event)"
          @create-table="emit('create-table')"
        />
      </ResizablePanel>

      <ResizableHandle />

      <ResizablePanel :default-size="76" :min-size="50" class="min-h-0">
        <section class="flex h-full min-h-0 flex-col">
          <header class="border-b bg-background/90 px-4 py-2.5">
            <div class="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{{ t('platform.workbench.tenantdb.ide.breadcrumbSchema') }}</span>
              <IconChevronRight class="size-3.5" />
              <span>{{ activeWorkspaceLabel }}</span>
            </div>
            <div class="mt-1 flex items-center justify-between gap-3">
              <div>
                <h3 class="text-sm font-semibold">
                  {{ selectedTable?.label || selectedTable?.name || t('platform.workbench.tenantdb.noTableSelected') }}
                </h3>
                <p v-if="selectedTable" class="font-mono text-xs text-muted-foreground">
                  {{ selectedTable.name }}
                </p>
              </div>
              <p class="text-xs text-muted-foreground">
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

    <div class="flex min-h-0 flex-1 flex-col xl:hidden">
      <div class="h-[280px] min-h-[220px] border-b">
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
      <section class="flex min-h-0 flex-1 flex-col">
        <header class="border-b bg-background/90 px-3 py-2">
          <div class="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{{ t('platform.workbench.tenantdb.ide.breadcrumbSchema') }}</span>
            <IconChevronRight class="size-3.5" />
            <span>{{ activeWorkspaceLabel }}</span>
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
    </div>
  </div>
</template>
