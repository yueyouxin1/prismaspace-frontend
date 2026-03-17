<script setup lang="ts">
import { computed } from "vue"
import {
  NumberField,
  NumberFieldContent,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@prismaspace/ui-shadcn/components/ui/number-field"

const props = defineProps<{
  modelValue?: unknown
  disabled?: boolean
  fieldProps?: Record<string, unknown>
}>()

const emit = defineEmits<{
  (event: "update:modelValue", value: unknown): void
}>()

const rootProps = computed(() => {
  if (!props.fieldProps) {
    return {}
  }

  const {
    contentClass: _contentClass,
    inputClass: _inputClass,
    decrementClass: _decrementClass,
    incrementClass: _incrementClass,
    ...rest
  } = props.fieldProps

  return rest
})

const normalizedValue = computed<number | undefined>(() => {
  if (typeof props.modelValue === "number") {
    return props.modelValue
  }

  const parsed = Number(props.modelValue)
  return Number.isNaN(parsed) ? undefined : parsed
})

function onUpdateModelValue(value: number | undefined) {
  emit("update:modelValue", value)
}
</script>

<template>
  <NumberField
    v-bind="rootProps"
    :model-value="normalizedValue"
    :disabled="disabled || Boolean(fieldProps?.disabled)"
    @update:model-value="onUpdateModelValue"
  >
    <NumberFieldContent :class="fieldProps?.contentClass as string">
      <NumberFieldDecrement :class="fieldProps?.decrementClass as string" />
      <NumberFieldInput :class="fieldProps?.inputClass as string" />
      <NumberFieldIncrement :class="fieldProps?.incrementClass as string" />
    </NumberFieldContent>
  </NumberField>
</template>
