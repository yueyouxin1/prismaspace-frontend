<script setup lang="ts">
import { computed } from "vue"
import {
  NativeSelect,
  NativeSelectOption,
} from "@prismaspace/ui-shadcn/components/ui/native-select"
import type { FieldOption } from "../../types"

const props = defineProps<{
  modelValue?: unknown
  disabled?: boolean
  fieldProps?: Record<string, unknown>
  options?: FieldOption[]
}>()

const emit = defineEmits<{
  (event: "update:modelValue", value: unknown): void
}>()

const resolvedOptions = computed(() => props.options ?? [])

const selectedKey = computed({
  get() {
    const index = resolvedOptions.value.findIndex((option) => Object.is(option.value, props.modelValue))
    return index >= 0 ? String(index) : ""
  },
  set(value: string) {
    onUpdateModelValue(value)
  },
})

const placeholder = computed(() => String(props.fieldProps?.placeholder ?? "请选择"))

function onUpdateModelValue(optionIndex: unknown): void {
  if (optionIndex === null || optionIndex === undefined || optionIndex === "") {
    emit("update:modelValue", undefined)
    return
  }

  const option = resolvedOptions.value[Number(optionIndex)]
  emit("update:modelValue", option?.value)
}
</script>

<template>
  <NativeSelect
    v-bind="fieldProps"
    v-model="selectedKey"
    :disabled="disabled || Boolean(fieldProps?.disabled)"
  >
    <NativeSelectOption value="">{{ placeholder }}</NativeSelectOption>
    <NativeSelectOption
      v-for="(option, index) in resolvedOptions"
      :key="`${option.value}-${index}`"
      :value="String(index)"
      :disabled="Boolean(option.disabled)"
    >
      {{ option.label ?? option.value }}
    </NativeSelectOption>
  </NativeSelect>
</template>
