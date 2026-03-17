<script setup lang="ts">
import { computed } from "vue"
import { Label } from "@prismaspace/ui-shadcn/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@prismaspace/ui-shadcn/components/ui/radio-group"
import type { FieldOption } from "../types"

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
const selectedKey = computed(() => {
  const index = resolvedOptions.value.findIndex((option) => Object.is(option.value, props.modelValue))
  return index >= 0 ? String(index) : undefined
})

function getOptionId(index: number): string {
  const baseId = String(props.fieldProps?.id ?? props.fieldProps?.name ?? "form-radio-group")
  return `${baseId}-${index}`
}

function onUpdateModelValue(optionIndex: string | undefined): void {
  if (optionIndex === null || optionIndex === undefined || optionIndex === "") {
    emit("update:modelValue", undefined)
    return
  }

  const option = resolvedOptions.value[Number(optionIndex)]
  emit("update:modelValue", option?.value)
}
</script>

<template>
  <RadioGroup
    v-bind="fieldProps"
    :model-value="selectedKey"
    :name="String(fieldProps?.name ?? 'form-radio-group')"
    :disabled="disabled || Boolean(fieldProps?.disabled)"
    @update:model-value="onUpdateModelValue"
  >
    <div
      v-for="(option, index) in resolvedOptions"
      :key="`${option.value}-${index}`"
      class="flex items-center gap-2 text-sm"
    >
      <RadioGroupItem
        :id="getOptionId(index)"
        :value="String(index)"
        :disabled="Boolean(option.disabled)"
      />
      <Label :for="getOptionId(index)">{{ option.label ?? option.value }}</Label>
    </div>
  </RadioGroup>
</template>
