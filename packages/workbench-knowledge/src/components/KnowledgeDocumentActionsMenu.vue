<script setup lang="ts">
import { MoreHorizontal } from 'lucide-vue-next'
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
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" size="icon" class="size-8" :disabled="disabled">
        <MoreHorizontal class="size-4" />
        <span class="sr-only">Open document actions</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-40">
      <DropdownMenuItem @select.prevent="$emit('rename')">Rename</DropdownMenuItem>
      <DropdownMenuItem @select.prevent="$emit('replace')">Replace Source</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem class="text-destructive focus:text-destructive" @select.prevent="$emit('remove')">
        Remove
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
