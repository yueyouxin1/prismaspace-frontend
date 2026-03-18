<script setup lang="ts">
import { computed } from "vue"
import { Slider } from "@prismaspace/ui-shadcn/components/ui/slider"

const props = defineProps<{
  modelValue?: unknown
  disabled?: boolean
  fieldProps?: Record<string, unknown>
}>()

const emit = defineEmits<{
  (event: "update:modelValue", value: unknown): void
}>()

const min = computed(() => Number(props.fieldProps?.min ?? 0))
const max = computed(() => Number(props.fieldProps?.max ?? 100))
const step = computed(() => Number(props.fieldProps?.step ?? 1))
const value = computed(() => {
  const normalized = Number(props.modelValue ?? min.value)
  return Number.isNaN(normalized) ? min.value : normalized
})

const sliderValue = computed(() => [value.value])

function onUpdateModelValue(next: number[] | undefined): void {
  emit("update:modelValue", Number(next?.[0] ?? min.value))
}
</script>

<template>
  <div class="space-y-2">
    <Slider
      v-bind="fieldProps"
      :model-value="sliderValue"
      :min="min"
      :max="max"
      :step="step"
      :disabled="disabled || Boolean(fieldProps?.disabled)"
      @update:model-value="onUpdateModelValue"
    />
    <div class="text-xs text-muted-foreground">
      {{ value }}
    </div>
  </div>
</template>
