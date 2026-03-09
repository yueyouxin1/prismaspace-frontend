<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { IconAlertTriangle, IconCircleCheck, IconInfoCircle, IconPlus, IconTrash } from '@tabler/icons-vue'
import { Alert, AlertDescription, AlertTitle } from '@prismaspace/ui-shadcn/components/ui/alert'
import { Badge } from '@prismaspace/ui-shadcn/components/ui/badge'
import { Button } from '@prismaspace/ui-shadcn/components/ui/button'
import { Checkbox } from '@prismaspace/ui-shadcn/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@prismaspace/ui-shadcn/components/ui/dialog'
import { Input } from '@prismaspace/ui-shadcn/components/ui/input'
import { Label } from '@prismaspace/ui-shadcn/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@prismaspace/ui-shadcn/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@prismaspace/ui-shadcn/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@prismaspace/ui-shadcn/components/ui/tooltip'
import type { TenantDataType } from '@prismaspace/contracts'
import type { TenantSchemaDiffSummary, TenantTableDraft } from '../types/tenantdb-ide'

const props = withDefaults(
  defineProps<{
    open: boolean
    schemaDraft: TenantTableDraft | null
    selectedColumnId: string
    schemaDiff: TenantSchemaDiffSummary
    hasSchemaChanges: boolean
    deleteAcknowledge: boolean
    errorText?: string
    dataTypes: TenantDataType[]
    saving?: boolean
  }>(),
  {
    errorText: '',
    saving: false,
  },
)

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'update:selectedColumnId', value: string): void
  (event: 'update:deleteAcknowledge', value: boolean): void
  (event: 'add-column'): void
  (event: 'remove-column', index: number): void
  (event: 'save'): void
}>()

const { t } = useI18n()

const hasDestructiveDiff = computed(() => props.schemaDiff.removed.length > 0)
const hasDiff = computed(() => props.hasSchemaChanges)

const diffBadgeText = computed(() =>
  t('platform.workbench.tenantdb.diffSummary', {
    added: props.schemaDiff.added.length,
    updated: props.schemaDiff.updated.length,
    removed: props.schemaDiff.removed.length,
  }),
)

const diffBadgeClass = computed(() => {
  if (hasDestructiveDiff.value) {
    return 'border-destructive/60 bg-destructive/10 text-destructive'
  }
  if (hasDiff.value) {
    return 'border-primary/50 bg-primary/10 text-primary'
  }
  return 'border-border bg-muted/50 text-muted-foreground'
})

const resolveColumnId = (column: { uuid?: string; name: string }, index: number): string => {
  if (column.uuid) {
    return column.uuid
  }
  const normalizedName = column.name.trim()
  return normalizedName || `draft-${index}`
}
</script>

<template>
  <TooltipProvider>
    <Dialog :open="open" @update:open="emit('update:open', $event)">
      <DialogContent class="flex h-[92vh] max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[1180px]">
        <DialogHeader class="border-b bg-muted/20 px-6 py-4">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <DialogTitle>{{ t('platform.workbench.tenantdb.tableSchemaDialogTitle') }}</DialogTitle>
              <DialogDescription class="mt-1 truncate font-mono text-xs">
                {{ schemaDraft ? schemaDraft.name : t('platform.workbench.tenantdb.noTableSelected') }}
              </DialogDescription>
            </div>

            <Tooltip>
              <TooltipTrigger as-child>
                <div class="inline-flex items-center gap-1.5">
                  <component
                    :is="hasDestructiveDiff ? IconAlertTriangle : (hasDiff ? IconInfoCircle : IconCircleCheck)"
                    class="size-4"
                    :class="hasDestructiveDiff ? 'text-destructive' : (hasDiff ? 'text-primary' : 'text-muted-foreground')"
                  />
                  <Badge variant="outline" class="font-mono text-[11px]" :class="diffBadgeClass">
                    {{ diffBadgeText }}
                  </Badge>
                </div>
              </TooltipTrigger>
              <TooltipContent align="end" class="max-w-[360px] space-y-1 text-xs">
                <p>{{ t('platform.workbench.tenantdb.schemaChanged') }}: <strong>{{ schemaDiff.tableChanged ? t('platform.workbench.tenantdb.yes') : t('platform.workbench.tenantdb.no') }}</strong></p>
                <p>{{ t('platform.workbench.tenantdb.addedColumns') }}: <strong>{{ schemaDiff.added.join(', ') || t('platform.workbench.tenantdb.none') }}</strong></p>
                <p>{{ t('platform.workbench.tenantdb.updatedColumns') }}: <strong>{{ schemaDiff.updated.join(', ') || t('platform.workbench.tenantdb.none') }}</strong></p>
                <p :class="hasDestructiveDiff ? 'text-destructive' : ''">
                  {{ t('platform.workbench.tenantdb.removedColumns') }}: <strong>{{ schemaDiff.removed.join(', ') || t('platform.workbench.tenantdb.none') }}</strong>
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </DialogHeader>

        <div class="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <Alert v-if="errorText" variant="destructive">
            <AlertTitle>{{ t('platform.workbench.tenantdb.schemaValidationFailed') }}</AlertTitle>
            <AlertDescription>{{ errorText }}</AlertDescription>
          </Alert>

          <div v-if="schemaDraft" class="space-y-4">
            <div class="rounded-lg border bg-card p-3">
              <div class="grid gap-2 md:grid-cols-3">
                <div class="space-y-1">
                  <Label>{{ t('platform.workbench.tenantdb.tableName') }}</Label>
                  <Input v-model="schemaDraft.name" class="h-8 font-mono text-xs" />
                </div>
                <div class="space-y-1">
                  <Label>{{ t('platform.workbench.tenantdb.label') }}</Label>
                  <Input v-model="schemaDraft.label" class="h-8 text-xs" />
                </div>
                <div class="space-y-1">
                  <Label>{{ t('platform.workbench.tenantdb.description') }}</Label>
                  <Input v-model="schemaDraft.description" class="h-8 text-xs" />
                </div>
              </div>
            </div>

            <div class="overflow-hidden rounded-lg border bg-card">
              <div class="flex items-center justify-between border-b bg-muted/20 px-3 py-2">
                <Label>{{ t('platform.workbench.tenantdb.columnDefinitions') }}</Label>
                <Button size="sm" variant="outline" class="h-7 gap-1 px-2.5 text-xs" @click="emit('add-column')">
                  <IconPlus class="size-3.5" />
                  {{ t('platform.workbench.tenantdb.column') }}
                </Button>
              </div>

              <div class="max-h-[46vh] overflow-auto">
                <Table>
                  <TableHeader class="sticky top-0 z-10 bg-muted/45">
                    <TableRow>
                      <TableHead class="w-[170px]">{{ t('platform.workbench.tenantdb.tableName') }}</TableHead>
                      <TableHead class="w-[170px]">{{ t('platform.workbench.tenantdb.label') }}</TableHead>
                      <TableHead class="w-[140px]">{{ t('platform.workbench.tenantdb.type') }}</TableHead>
                      <TableHead class="w-[180px]">{{ t('platform.workbench.tenantdb.defaultValueTypeAware') }}</TableHead>
                      <TableHead class="min-w-[180px]">{{ t('platform.workbench.tenantdb.description') }}</TableHead>
                      <TableHead class="w-[210px]">{{ t('platform.workbench.tenantdb.actions') }}</TableHead>
                      <TableHead class="w-12 text-right">{{ t('platform.workbench.tenantdb.actions') }}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow
                      v-for="(column, index) in schemaDraft.columns"
                      :key="resolveColumnId(column, index)"
                      :class="selectedColumnId === resolveColumnId(column, index) ? 'bg-primary/[0.06]' : ''"
                    >
                      <TableCell>
                        <Input
                          v-model="column.name"
                          class="h-8 font-mono text-xs"
                          :placeholder="t('platform.workbench.tenantdb.columnNamePlaceholder')"
                          @focus="emit('update:selectedColumnId', resolveColumnId(column, index))"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          v-model="column.label"
                          class="h-8 text-xs"
                          :placeholder="t('platform.workbench.tenantdb.label')"
                          @focus="emit('update:selectedColumnId', resolveColumnId(column, index))"
                        />
                      </TableCell>
                      <TableCell>
                        <Select v-model="column.data_type">
                          <SelectTrigger class="h-8 text-xs">
                            <SelectValue :placeholder="t('platform.workbench.tenantdb.type')" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem v-for="dataType in dataTypes" :key="dataType" :value="dataType">
                              {{ dataType }}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          v-model="column.default_value_text"
                          class="h-8 font-mono text-xs"
                          :placeholder="t('platform.workbench.tenantdb.defaultValueTypeAware')"
                        />
                      </TableCell>
                      <TableCell>
                        <Input v-model="column.description" class="h-8 text-xs" :placeholder="t('platform.workbench.tenantdb.description')" />
                      </TableCell>
                      <TableCell>
                        <div class="flex flex-wrap items-center gap-2 text-[11px]">
                          <label class="inline-flex items-center gap-1 rounded-md border border-border/80 px-2 py-1">
                            <Checkbox
                              :model-value="column.is_nullable"
                              @update:model-value="column.is_nullable = Boolean($event)"
                            />
                            {{ t('platform.workbench.tenantdb.nullable') }}
                          </label>
                          <label class="inline-flex items-center gap-1 rounded-md border border-border/80 px-2 py-1">
                            <Checkbox
                              :model-value="column.is_unique"
                              @update:model-value="column.is_unique = Boolean($event)"
                            />
                            {{ t('platform.workbench.tenantdb.unique') }}
                          </label>
                          <label class="inline-flex items-center gap-1 rounded-md border border-border/80 px-2 py-1">
                            <Checkbox
                              :model-value="column.is_indexed"
                              @update:model-value="column.is_indexed = Boolean($event)"
                            />
                            {{ t('platform.workbench.tenantdb.indexed') }}
                          </label>
                        </div>
                      </TableCell>
                      <TableCell class="text-right">
                        <Button size="icon" variant="ghost" class="size-8 text-destructive hover:text-destructive" @click="emit('remove-column', index)">
                          <IconTrash class="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter class="border-t bg-background px-6 py-3">
          <Button variant="outline" @click="emit('update:open', false)">
            {{ t('common.cancel') }}
          </Button>
          <Button :disabled="!schemaDraft || !hasSchemaChanges || saving" @click="emit('save')">
            {{ saving ? t('platform.workbench.header.actions.saving') : t('platform.workbench.tenantdb.saveSchema') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </TooltipProvider>
</template>
