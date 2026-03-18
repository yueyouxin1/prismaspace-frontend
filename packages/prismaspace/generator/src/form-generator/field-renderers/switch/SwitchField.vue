<script setup lang="ts">
import { Switch } from "@prismaspace/ui-shadcn/components/ui/switch"

const props = defineProps<{
  modelValue?: unknown
  disabled?: boolean
  fieldProps?: Record<string, unknown>
}>()

const emit = defineEmits<{
  (event: "update:modelValue", value: unknown): void
}>()

</script>

<template>
  <Switch
    v-bind="fieldProps"
    :model-value="Boolean(modelValue)"
    :disabled="disabled || Boolean(fieldProps?.disabled)"
    @update:model-value="(next) => emit('update:modelValue', Boolean(next))"
  />
</template>
