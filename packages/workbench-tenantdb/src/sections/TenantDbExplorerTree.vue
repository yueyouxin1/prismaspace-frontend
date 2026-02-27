<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { HTMLAttributes } from 'vue'
import { useI18n } from 'vue-i18n'
import { IconChevronRight, IconDatabase, IconPlus, IconSearch, IconTable } from '@tabler/icons-vue'
import { Badge } from '@repo/ui-shadcn/components/ui/badge'
import { Button } from '@repo/ui-shadcn/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@repo/ui-shadcn/components/ui/collapsible'
import { Input } from '@repo/ui-shadcn/components/ui/input'
import { ScrollArea } from '@repo/ui-shadcn/components/ui/scroll-area'
import { Skeleton } from '@repo/ui-shadcn/components/ui/skeleton'
import { cn } from '@repo/ui-shadcn/lib/utils'
import type { TenantTableRead } from '@app/services/api/contracts'
import TenantDbTableContextMenu from '../components/TenantDbTableContextMenu.vue'
import type { TenantExplorerActionPayload } from '../types/tenantdb-ide'

const props = withDefaults(
  defineProps<{
    tables: TenantTableRead[]
    selectedTableUuid: string
    loading?: boolean
    searchText?: string
    class?: HTMLAttributes['class']
  }>(),
  {
    loading: false,
    searchText: '',
    class: undefined,
  },
)

const emit = defineEmits<{
  (event: 'update:searchText', value: string): void
  (event: 'select-table', tableUuid: string): void
  (event: 'open-action', payload: TenantExplorerActionPayload): void
  (event: 'create-table'): void
}>()

const { t } = useI18n()

const expandedTableSet = ref<Set<string>>(new Set())

const filteredTables = computed(() => {
  const text = props.searchText.trim().toLowerCase()
  if (!text) {
    return props.tables
  }
  return props.tables.filter((table) =>
    table.name.toLowerCase().includes(text)
    || (table.label ?? '').toLowerCase().includes(text)
    || (table.description ?? '').toLowerCase().includes(text),
  )
})

const handleToggleExpand = (tableUuid: string, nextOpen: boolean): void => {
  const next = new Set(expandedTableSet.value)
  if (nextOpen) {
    next.add(tableUuid)
  } else {
    next.delete(tableUuid)
  }
  expandedTableSet.value = next
}

const isOpen = (tableUuid: string): boolean => expandedTableSet.value.has(tableUuid)

const openAction = (payload: TenantExplorerActionPayload): void => {
  emit('open-action', payload)
}

watch(
  () => props.selectedTableUuid,
  (tableUuid) => {
    if (!tableUuid) {
      return
    }
    const next = new Set(expandedTableSet.value)
    next.add(tableUuid)
    expandedTableSet.value = next
  },
  { immediate: true },
)
</script>

<template>
  <section :class="cn('flex h-full min-h-0 flex-col bg-muted/20', props.class)">
    <div class="border-b bg-background/60 px-3 py-3">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <IconDatabase class="size-4 text-muted-foreground" />
          <h3 class="text-sm font-semibold">{{ t('platform.workbench.tenantdb.databaseExplorer') }}</h3>
        </div>
        <Button size="sm" class="h-8 gap-1 px-2" @click="emit('create-table')">
          <IconPlus class="size-4" />
          <span class="text-xs">{{ t('platform.workbench.tenantdb.table') }}</span>
        </Button>
      </div>
      <div class="relative mt-3">
        <IconSearch class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          :model-value="searchText"
          class="h-8 pl-8"
          :placeholder="t('platform.workbench.tenantdb.searchTable')"
          @update:model-value="emit('update:searchText', String($event))"
        />
      </div>
    </div>

    <ScrollArea class="min-h-0 flex-1">
      <div class="space-y-1 p-2">
        <template v-if="loading">
          <Skeleton class="h-8 w-full" />
          <Skeleton class="h-8 w-full" />
          <Skeleton class="h-8 w-full" />
        </template>
        <template v-else-if="filteredTables.length">
          <Collapsible
            v-for="table in filteredTables"
            :key="table.uuid"
            :open="isOpen(table.uuid)"
            @update:open="handleToggleExpand(table.uuid, $event)"
          >
            <TenantDbTableContextMenu
              :table-uuid="table.uuid"
              @action="openAction"
            >
              <div class="group/tree-item rounded-md border border-transparent bg-background/90 transition-colors hover:bg-accent/60">
                <CollapsibleTrigger as-child>
                  <button
                    type="button"
                    class="flex h-9 w-full items-center gap-2 px-2 text-left"
                    :class="selectedTableUuid === table.uuid ? 'bg-accent text-accent-foreground' : ''"
                    @click="emit('select-table', table.uuid)"
                  >
                    <IconChevronRight
                      class="size-4 shrink-0 text-muted-foreground transition-transform"
                      :class="isOpen(table.uuid) ? 'rotate-90' : ''"
                    />
                    <IconTable class="size-4 shrink-0 text-muted-foreground" />
                    <span class="min-w-0 flex-1 truncate font-mono text-xs">{{ table.name }}</span>
                    <Badge variant="secondary" class="h-5 shrink-0 px-1.5 text-[10px]">
                      {{ table.columns.length }}
                    </Badge>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ul class="space-y-1 px-2 pb-2">
                    <li
                      v-for="column in table.columns"
                      :key="column.uuid"
                      class="flex items-center justify-between rounded-sm px-2 py-1 text-[11px] text-muted-foreground"
                    >
                      <span class="truncate font-mono">{{ column.name }}</span>
                      <span class="ml-2 shrink-0 uppercase opacity-70">{{ column.data_type }}</span>
                    </li>
                  </ul>
                </CollapsibleContent>
              </div>
            </TenantDbTableContextMenu>
          </Collapsible>
        </template>
        <p v-else class="px-2 py-4 text-xs text-muted-foreground">
          {{ t('platform.workbench.tenantdb.noTableFound') }}
        </p>
      </div>
    </ScrollArea>
  </section>
</template>
