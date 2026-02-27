<script setup lang="ts">
import { MoreHorizontal } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { Button } from '@repo/ui-shadcn/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui-shadcn/components/ui/dropdown-menu'

withDefaults(
  defineProps<{
    disabled?: boolean
  }>(),
  {
    disabled: false,
  },
)

defineEmits<{
  (event: 'rename'): void
  (event: 'replace'): void
  (event: 'remove'): void
}>()

const { t } = useI18n()
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" size="icon" class="size-8" :disabled="disabled">
        <MoreHorizontal class="size-4" />
        <span class="sr-only">{{ t('platform.workbench.knowledge.actions.open') }}</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-40">
      <DropdownMenuItem @select.prevent="$emit('rename')">{{ t('platform.workbench.knowledge.actions.rename') }}</DropdownMenuItem>
      <DropdownMenuItem @select.prevent="$emit('replace')">{{ t('platform.workbench.knowledge.actions.replaceSource') }}</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem class="text-destructive focus:text-destructive" @select.prevent="$emit('remove')">
        {{ t('platform.workbench.knowledge.actions.remove') }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
