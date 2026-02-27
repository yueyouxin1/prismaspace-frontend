<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { IconPlus, IconTrash } from '@tabler/icons-vue'
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
import { Input } from '@repo/ui-shadcn/components/ui/input'
import { Label } from '@repo/ui-shadcn/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui-shadcn/components/ui/select'
import type { TenantDbFilterOperator, TenantTableRead } from '@app/services/api/contracts'
import type { TenantDataFilterDraft } from '../types/tenantdb-ide'

const props = withDefaults(
  defineProps<{
    open: boolean
    selectedTable: TenantTableRead | null
    dataLimitDraft: number
    dataOrderColumnDraft: string
    dataOrderDirectionDraft: 'ASC' | 'DESC'
    dataColumnDrafts: string[]
    dataFilterDrafts: TenantDataFilterDraft[]
    filterOperators: TenantDbFilterOperator[]
    applying?: boolean
  }>(),
  {
    applying: false,
  },
)

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'update:limit', value: number): void
  (event: 'update:orderColumn', value: string): void
  (event: 'update:orderDirection', value: 'ASC' | 'DESC'): void
  (event: 'toggle-column', payload: { name: string; checked: boolean }): void
  (event: 'add-filter'): void
  (event: 'remove-filter', id: string): void
  (event: 'update-filter', payload: { id: string; column?: string; operator?: TenantDbFilterOperator; value?: string }): void
  (event: 'apply'): void
}>()

const { t } = useI18n()

const toggleAll = (): void => {
  const allColumns = props.selectedTable?.columns ?? []
  const shouldSelectAll = props.dataColumnDrafts.length !== allColumns.length
  allColumns.forEach((column) => {
    emit('toggle-column', {
      name: column.name,
      checked: shouldSelectAll,
    })
  })
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="flex h-[90vh] max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[980px]">
      <DialogHeader>
        <div class="border-b bg-muted/20 px-6 py-4">
          <DialogTitle>{{ t('platform.workbench.tenantdb.queryBuilder') }}</DialogTitle>
          <DialogDescription class="mt-1 font-mono text-xs">
            {{ selectedTable ? selectedTable.name : t('platform.workbench.tenantdb.noTableSelected') }}
          </DialogDescription>
        </div>
      </DialogHeader>

      <div class="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        <div class="space-y-4">
          <div class="rounded-lg border bg-card p-3">
            <div class="grid gap-3 md:grid-cols-3">
              <div class="space-y-1">
                <Label>{{ t('platform.workbench.tenantdb.limit') }}</Label>
                <Select
                  :model-value="String(dataLimitDraft)"
                  @update:model-value="emit('update:limit', Number($event))"
                >
                  <SelectTrigger>
                    <SelectValue :placeholder="t('platform.workbench.tenantdb.rowsPerPage')" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div class="space-y-1">
                <Label>{{ t('platform.workbench.tenantdb.orderBy') }}</Label>
                <Select
                  :model-value="dataOrderColumnDraft"
                  @update:model-value="emit('update:orderColumn', String($event))"
                >
                  <SelectTrigger>
                    <SelectValue :placeholder="t('platform.workbench.tenantdb.none')" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="column in selectedTable?.columns ?? []"
                      :key="column.uuid"
                      :value="column.name"
                    >
                      {{ column.name }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div class="space-y-1">
                <Label>{{ t('platform.workbench.tenantdb.direction') }}</Label>
                <Select
                  :model-value="dataOrderDirectionDraft"
                  @update:model-value="emit('update:orderDirection', $event as 'ASC' | 'DESC')"
                >
                  <SelectTrigger>
                    <SelectValue :placeholder="t('platform.workbench.tenantdb.direction')" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ASC">ASC</SelectItem>
                    <SelectItem value="DESC">DESC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div class="rounded-lg border bg-card p-3">
            <div class="mb-2 flex items-center justify-between">
              <Label>{{ t('platform.workbench.tenantdb.projectionColumns') }}</Label>
              <Button size="sm" variant="outline" class="h-7 px-2.5 text-xs" @click="toggleAll">
                {{ t('platform.workbench.tenantdb.all') }}
              </Button>
            </div>
            <div class="flex flex-wrap gap-2">
              <label
                v-for="column in selectedTable?.columns ?? []"
                :key="column.uuid"
                class="inline-flex items-center gap-2 rounded-md border border-border/80 bg-background px-2 py-1 text-[11px]"
              >
                <Checkbox
                  :model-value="dataColumnDrafts.includes(column.name)"
                  @update:model-value="emit('toggle-column', { name: column.name, checked: Boolean($event) })"
                />
                <span class="font-mono">{{ column.name }}</span>
              </label>
            </div>
          </div>

          <div class="rounded-lg border bg-card p-3">
            <div class="mb-2 flex items-center justify-between">
              <Label>{{ t('platform.workbench.tenantdb.filters') }}</Label>
              <Button size="sm" variant="outline" class="h-7 gap-1 px-2.5 text-xs" @click="emit('add-filter')">
                <IconPlus class="size-3.5" />
                {{ t('platform.workbench.tenantdb.add') }}
              </Button>
            </div>
            <div v-if="dataFilterDrafts.length" class="space-y-2">
              <div
                v-for="filter in dataFilterDrafts"
                :key="filter.id"
                class="grid gap-2 rounded-lg border border-border/80 bg-background p-2 md:grid-cols-[1fr_124px_1fr_auto]"
              >
                <Select
                  :model-value="filter.column"
                  @update:model-value="emit('update-filter', { id: filter.id, column: String($event) })"
                >
                  <SelectTrigger>
                    <SelectValue :placeholder="t('platform.workbench.tenantdb.column')" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="column in selectedTable?.columns ?? []"
                      :key="column.uuid"
                      :value="column.name"
                    >
                      {{ column.name }}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  :model-value="filter.operator"
                  @update:model-value="emit('update-filter', { id: filter.id, operator: $event as TenantDbFilterOperator })"
                >
                  <SelectTrigger>
                    <SelectValue :placeholder="t('platform.workbench.tenantdb.operator')" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="operator in filterOperators" :key="operator" :value="operator">
                      {{ operator }}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  :model-value="filter.value"
                  :placeholder="t('platform.workbench.tenantdb.value')"
                  @update:model-value="emit('update-filter', { id: filter.id, value: String($event) })"
                />
                <Button size="icon" variant="ghost" class="size-8 text-destructive hover:text-destructive" @click="emit('remove-filter', filter.id)">
                  <IconTrash class="size-3.5" />
                </Button>
              </div>
            </div>
            <p v-else class="text-xs text-muted-foreground">
              {{ t('platform.workbench.tenantdb.noFiltersHint') }}
            </p>
          </div>
        </div>
      </div>

      <DialogFooter class="border-t bg-background px-6 py-3">
        <Button variant="outline" @click="emit('update:open', false)">
          {{ t('common.cancel') }}
        </Button>
        <Button :disabled="!selectedTable || applying" @click="emit('apply')">
          {{ applying ? t('platform.workbench.header.actions.running') : t('platform.workbench.tenantdb.applyQuery') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
