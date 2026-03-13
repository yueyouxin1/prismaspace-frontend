<script setup lang="ts">
import type { FieldOption } from '@prismaspace/generator/form-generator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@prismaspace/ui-shadcn/components/ui/select'

withDefaults(defineProps<{
  modelValue?: string | null
  fieldProps?: {
    placeholder?: string
    disabled?: boolean
  }
  options?: FieldOption[]
}>(), {
  modelValue: null,
  fieldProps: () => ({}),
  options: () => [],
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
}>()
</script>

<template>
  <Select
    :model-value="modelValue ?? ''"
    :disabled="fieldProps?.disabled || !options.length"
    @update:model-value="emit('update:modelValue', String($event ?? ''))"
  >
    <SelectTrigger class="w-full">
      <SelectValue :placeholder="fieldProps?.placeholder || '请选择'" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem v-for="option in options" :key="String(option.value)" :value="String(option.value)">
        <div class="flex min-w-0 flex-col">
          <span class="truncate">{{ option.label || option.value }}</span>
          <span v-if="option.description" class="text-xs text-muted-foreground">{{ option.description }}</span>
        </div>
      </SelectItem>
    </SelectContent>
  </Select>
</template>
