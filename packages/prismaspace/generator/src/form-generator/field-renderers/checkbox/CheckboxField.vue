<script setup lang="ts">
import { computed } from "vue"
import { Checkbox } from "@prismaspace/ui-shadcn/components/ui/checkbox"

const props = defineProps<{
  modelValue?: unknown
  disabled?: boolean
  fieldProps?: Record<string, unknown>
}>()

const emit = defineEmits<{
  (event: "update:modelValue", value: unknown): void
}>()

const checkedValue = computed(() => Boolean(props.modelValue))

function onUpdateModelValue(next: boolean | "indeterminate"): void {
  emit("update:modelValue", next === "indeterminate" ? true : Boolean(next))
}
</script>

<template>
  <Checkbox
    v-bind="fieldProps"
    :model-value="checkedValue"
    :disabled="disabled || Boolean(fieldProps?.disabled)"
    @update:model-value="onUpdateModelValue"
  />
</template>
