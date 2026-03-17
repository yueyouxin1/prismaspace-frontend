<script setup lang="ts">
import { computed } from "vue"
import {
  TagsInput,
  TagsInputInput,
  TagsInputItem,
  TagsInputItemDelete,
  TagsInputItemText,
} from "@prismaspace/ui-shadcn/components/ui/tags-input"

const props = defineProps<{
  modelValue?: unknown
  disabled?: boolean
  fieldProps?: Record<string, unknown>
}>()

const emit = defineEmits<{
  (event: "update:modelValue", value: unknown): void
}>()

const tags = computed<string[]>(() => {
  if (!Array.isArray(props.modelValue)) {
    return []
  }
  return props.modelValue.map((item) => String(item)).filter(Boolean)
})
</script>

<template>
  <TagsInput
    v-bind="fieldProps"
    :model-value="tags"
    :disabled="disabled || Boolean(fieldProps?.disabled)"
    @update:model-value="(value) => emit('update:modelValue', value)"
  >
    <TagsInputItem
      v-for="tag in tags"
      :key="tag"
      :value="tag"
    >
      <TagsInputItemText>{{ tag }}</TagsInputItemText>
      <TagsInputItemDelete />
    </TagsInputItem>
    <TagsInputInput
      :placeholder="String(fieldProps?.placeholder ?? '输入并添加标签')"
      :disabled="disabled || Boolean(fieldProps?.disabled)"
    />
  </TagsInput>
</template>
