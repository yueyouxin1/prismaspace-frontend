<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { IconPlus, IconTrash } from '@tabler/icons-vue'
import { Alert, AlertDescription, AlertTitle } from '@repo/ui-shadcn/components/ui/alert'
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
import { Separator } from '@repo/ui-shadcn/components/ui/separator'
import type { TenantDataType } from '@app/services/api/contracts'
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
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-[1120px]">
      <DialogHeader>
        <DialogTitle>{{ t('platform.workbench.tenantdb.tableSchemaDialogTitle') }}</DialogTitle>
        <DialogDescription>
          {{ schemaDraft ? schemaDraft.name : t('platform.workbench.tenantdb.noTableSelected') }}
        </DialogDescription>
      </DialogHeader>

      <Alert v-if="errorText" variant="destructive">
        <AlertTitle>{{ t('platform.workbench.tenantdb.schemaValidationFailed') }}</AlertTitle>
        <AlertDescription>{{ errorText }}</AlertDescription>
      </Alert>

      <div v-if="schemaDraft" class="space-y-4">
        <div class="grid gap-2 md:grid-cols-3">
          <div class="space-y-1">
            <Label>{{ t('platform.workbench.tenantdb.tableName') }}</Label>
            <Input v-model="schemaDraft.name" class="font-mono" />
          </div>
          <div class="space-y-1">
            <Label>{{ t('platform.workbench.tenantdb.label') }}</Label>
            <Input v-model="schemaDraft.label" />
          </div>
          <div class="space-y-1">
            <Label>{{ t('platform.workbench.tenantdb.description') }}</Label>
            <Input v-model="schemaDraft.description" />
          </div>
        </div>

        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <Label>{{ t('platform.workbench.tenantdb.columnDefinitions') }}</Label>
            <Button size="sm" variant="outline" class="gap-1" @click="emit('add-column')">
              <IconPlus class="size-4" />
              {{ t('platform.workbench.tenantdb.column') }}
            </Button>
          </div>
          <div
            v-for="(column, index) in schemaDraft.columns"
            :key="column.uuid ?? `new-${index}`"
            class="space-y-2 rounded-md border p-3"
          >
            <div class="grid gap-2 md:grid-cols-[1fr_1fr_150px_100px_100px_100px_auto]">
              <Input
                v-model="column.name"
                class="font-mono"
                :placeholder="t('platform.workbench.tenantdb.columnNamePlaceholder')"
                @focus="emit('update:selectedColumnId', column.uuid ?? column.name)"
              />
              <Input
                v-model="column.label"
                :placeholder="t('platform.workbench.tenantdb.label')"
                @focus="emit('update:selectedColumnId', column.uuid ?? column.name)"
              />
              <Select v-model="column.data_type">
                <SelectTrigger>
                  <SelectValue :placeholder="t('platform.workbench.tenantdb.type')" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="dataType in dataTypes" :key="dataType" :value="dataType">
                    {{ dataType }}
                  </SelectItem>
                </SelectContent>
              </Select>
              <label class="flex items-center gap-1 rounded-md border px-2 text-xs">
                <Checkbox
                  :model-value="column.is_nullable"
                  @update:model-value="column.is_nullable = Boolean($event)"
                />
                {{ t('platform.workbench.tenantdb.nullable') }}
              </label>
              <label class="flex items-center gap-1 rounded-md border px-2 text-xs">
                <Checkbox
                  :model-value="column.is_unique"
                  @update:model-value="column.is_unique = Boolean($event)"
                />
                {{ t('platform.workbench.tenantdb.unique') }}
              </label>
              <label class="flex items-center gap-1 rounded-md border px-2 text-xs">
                <Checkbox
                  :model-value="column.is_indexed"
                  @update:model-value="column.is_indexed = Boolean($event)"
                />
                {{ t('platform.workbench.tenantdb.indexed') }}
              </label>
              <Button size="icon" variant="outline" class="size-8" @click="emit('remove-column', index)">
                <IconTrash class="size-3.5" />
              </Button>
            </div>
            <div class="grid gap-2 md:grid-cols-[1fr_1fr]">
              <Input
                v-model="column.default_value_text"
                class="font-mono"
                :placeholder="t('platform.workbench.tenantdb.defaultValueTypeAware')"
              />
              <Input v-model="column.description" :placeholder="t('platform.workbench.tenantdb.description')" />
            </div>
          </div>
        </div>

        <Separator />

        <div class="space-y-3 text-sm">
          <p>{{ t('platform.workbench.tenantdb.schemaChanged') }}: <strong>{{ schemaDiff.tableChanged ? t('platform.workbench.tenantdb.yes') : t('platform.workbench.tenantdb.no') }}</strong></p>
          <p>{{ t('platform.workbench.tenantdb.addedColumns') }}: <strong>{{ schemaDiff.added.join(', ') || t('platform.workbench.tenantdb.none') }}</strong></p>
          <p>{{ t('platform.workbench.tenantdb.updatedColumns') }}: <strong>{{ schemaDiff.updated.join(', ') || t('platform.workbench.tenantdb.none') }}</strong></p>
          <p class="text-destructive">
            {{ t('platform.workbench.tenantdb.removedColumns') }}: <strong>{{ schemaDiff.removed.join(', ') || t('platform.workbench.tenantdb.none') }}</strong>
          </p>
          <label
            v-if="schemaDiff.removed.length"
            class="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs"
          >
            <Checkbox
              :model-value="deleteAcknowledge"
              @update:model-value="emit('update:deleteAcknowledge', Boolean($event))"
            />
            <span>{{ t('platform.workbench.tenantdb.destructiveDeleteConfirm') }}</span>
          </label>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="emit('update:open', false)">
          {{ t('common.cancel') }}
        </Button>
        <Button :disabled="!schemaDraft || !hasSchemaChanges || saving" @click="emit('save')">
          {{ saving ? t('platform.workbench.header.actions.saving') : t('platform.workbench.tenantdb.saveSchema') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
