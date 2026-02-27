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
  <section :class="cn('flex h-full min-h-0 flex-col bg-background', props.class)">
    <div class="border-b bg-muted/30 px-3 py-3">
      <div class="flex items-center justify-between gap-2">
        <div class="flex min-w-0 items-center gap-2">
          <div class="inline-flex size-7 items-center justify-center rounded-md bg-background shadow-xs">
            <IconDatabase class="size-4 text-muted-foreground" />
          </div>
          <div class="min-w-0">
            <h3 class="truncate text-sm font-semibold">{{ t('platform.workbench.tenantdb.databaseExplorer') }}</h3>
            <p class="text-[11px] text-muted-foreground">{{ filteredTables.length }}/{{ tables.length }}</p>
          </div>
        </div>
        <Button size="sm" class="h-8 gap-1.5 px-2.5 shadow-xs" @click="emit('create-table')">
          <IconPlus class="size-3.5" />
          <span class="text-xs">{{ t('platform.workbench.tenantdb.table') }}</span>
        </Button>
      </div>
      <div class="relative mt-3">
        <IconSearch class="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          :model-value="searchText"
          class="h-8 rounded-lg border-border/80 bg-background pl-8 text-xs"
          :placeholder="t('platform.workbench.tenantdb.searchTable')"
          @update:model-value="emit('update:searchText', String($event))"
        />
      </div>
    </div>

    <ScrollArea class="min-h-0 flex-1">
      <div class="space-y-1.5 p-2">
        <template v-if="loading">
          <Skeleton class="h-9 w-full rounded-lg" />
          <Skeleton class="h-9 w-full rounded-lg" />
          <Skeleton class="h-9 w-full rounded-lg" />
          <Skeleton class="h-9 w-full rounded-lg" />
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
              <div
                class="group/tree-item overflow-hidden rounded-lg border bg-card transition-all duration-150"
                :class="selectedTableUuid === table.uuid
                  ? 'border-primary/35 bg-primary/10 shadow-[0_0_0_1px_hsl(var(--primary)/0.15)]'
                  : 'border-border/80 hover:border-border hover:bg-muted/30'"
              >
                <CollapsibleTrigger as-child>
                  <button
                    type="button"
                    class="flex h-8 w-full items-center gap-1.5 px-2.5 text-left"
                    @click="emit('select-table', table.uuid)"
                  >
                    <IconChevronRight
                      class="size-3.5 shrink-0 text-muted-foreground transition-transform duration-150"
                      :class="isOpen(table.uuid) ? 'rotate-90' : ''"
                    />
                    <IconTable class="size-3.5 shrink-0 text-muted-foreground" />
                    <span class="min-w-0 flex-1 truncate font-mono text-[12px]">{{ table.name }}</span>
                    <Badge variant="secondary" class="h-4 shrink-0 rounded-sm px-1.5 text-[10px]">
                      {{ table.columns.length }}
                    </Badge>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ul class="space-y-0.5 px-2 pb-2">
                    <li
                      v-for="column in table.columns"
                      :key="column.uuid"
                      class="grid grid-cols-[1fr_auto] items-center gap-2 rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted/45"
                    >
                      <span class="truncate font-mono">{{ column.name }}</span>
                      <span class="rounded-sm bg-muted px-1.5 py-0.5 font-medium tracking-wide uppercase">{{ column.data_type }}</span>
                    </li>
                  </ul>
                </CollapsibleContent>
              </div>
            </TenantDbTableContextMenu>
          </Collapsible>
        </template>
        <p v-else class="rounded-lg border border-dashed px-3 py-4 text-xs text-muted-foreground">
          {{ t('platform.workbench.tenantdb.noTableFound') }}
        </p>
      </div>
    </ScrollArea>
  </section>
</template>
