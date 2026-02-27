<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { IconEdit, IconPlus, IconSearch, IconTrash } from '@tabler/icons-vue'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@repo/ui-shadcn/components/ui/context-menu'
import type { TenantTableContextAction } from '../types/tenantdb-ide'

const props = defineProps<{
  tableUuid: string
}>()

const emit = defineEmits<{
  (event: 'action', payload: { tableUuid: string; action: TenantTableContextAction }): void
}>()
const { t } = useI18n()

const emitAction = (action: TenantTableContextAction): void => {
  emit('action', {
    tableUuid: props.tableUuid,
    action,
  })
}
</script>

<template>
  <ContextMenu>
    <ContextMenuTrigger as-child>
      <slot />
    </ContextMenuTrigger>
    <ContextMenuContent class="w-48">
      <ContextMenuItem class="gap-2" @select="emitAction('query')">
        <IconSearch class="size-4" />
        <span>{{ t('platform.workbench.tenantdb.contextMenu.queryData') }}</span>
      </ContextMenuItem>
      <ContextMenuItem class="gap-2" @select="emitAction('schema')">
        <IconEdit class="size-4" />
        <span>{{ t('platform.workbench.tenantdb.contextMenu.editSchema') }}</span>
      </ContextMenuItem>
      <ContextMenuItem class="gap-2" @select="emitAction('insert')">
        <IconPlus class="size-4" />
        <span>{{ t('platform.workbench.tenantdb.contextMenu.insertRow') }}</span>
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem variant="destructive" class="gap-2" @select="emitAction('delete')">
        <IconTrash class="size-4" />
        <span>{{ t('platform.workbench.tenantdb.contextMenu.deleteTable') }}</span>
      </ContextMenuItem>
    </ContextMenuContent>
  </ContextMenu>
</template>
