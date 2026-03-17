<script setup lang="ts">
import { computed } from "vue"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@prismaspace/ui-shadcn/components/ui/input-otp"

const props = defineProps<{
  modelValue?: unknown
  disabled?: boolean
  fieldProps?: Record<string, unknown>
}>()

const emit = defineEmits<{
  (event: "update:modelValue", value: unknown): void
}>()

const normalizedValue = computed(() => {
  if (props.modelValue === null || props.modelValue === undefined) {
    return ""
  }
  return String(props.modelValue)
})

const maxLength = computed(() => {
  const candidate = Number(props.fieldProps?.maxlength ?? props.fieldProps?.length ?? 6)
  return Number.isFinite(candidate) && candidate > 0 ? candidate : 6
})

const separatorIndex = computed(() => {
  const candidate = Number(props.fieldProps?.separatorIndex ?? 3)
  return Number.isFinite(candidate) ? candidate : 3
})

const firstGroupIndexes = computed(() => {
  const indexes = Array.from({ length: maxLength.value }, (_, index) => index)
  if (separatorIndex.value <= 0 || separatorIndex.value >= maxLength.value) {
    return indexes
  }
  return indexes.slice(0, separatorIndex.value)
})

const secondGroupIndexes = computed(() => {
  if (separatorIndex.value <= 0 || separatorIndex.value >= maxLength.value) {
    return []
  }
  return Array.from(
    { length: maxLength.value - separatorIndex.value },
    (_, index) => index + separatorIndex.value,
  )
})
</script>

<template>
  <InputOTP
    v-bind="fieldProps"
    :model-value="normalizedValue"
    :maxlength="maxLength"
    :disabled="disabled || Boolean(fieldProps?.disabled)"
    @update:model-value="(value: unknown) => emit('update:modelValue', String(value ?? ''))"
  >
    <InputOTPGroup>
      <InputOTPSlot
        v-for="index in firstGroupIndexes"
        :key="index"
        :index="index"
      />
    </InputOTPGroup>
    <InputOTPSeparator v-if="secondGroupIndexes.length" />
    <InputOTPGroup v-if="secondGroupIndexes.length">
      <InputOTPSlot
        v-for="index in secondGroupIndexes"
        :key="index"
        :index="index"
      />
    </InputOTPGroup>
  </InputOTP>
</template>
