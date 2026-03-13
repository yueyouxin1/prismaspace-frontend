<script setup lang="ts">
import { ref, watch } from 'vue'
import { Textarea } from '@prismaspace/ui-shadcn/components/ui/textarea'

const props = withDefaults(defineProps<{
  modelValue?: unknown
  fieldProps?: {
    placeholder?: string
    disabled?: boolean
  }
}>(), {
  modelValue: undefined,
  fieldProps: () => ({}),
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: unknown): void
}>()

const localText = ref('')
const errorMessage = ref('')

watch(
  () => props.modelValue,
  (value) => {
    localText.value = JSON.stringify(value ?? null, null, 2)
    errorMessage.value = ''
  },
  { immediate: true, deep: true },
)

const handleBlur = (): void => {
  const text = localText.value.trim()
  if (!text) {
    emit('update:modelValue', null)
    errorMessage.value = ''
    return
  }
  try {
    emit('update:modelValue', JSON.parse(text))
    errorMessage.value = ''
  } catch {
    errorMessage.value = '请输入合法 JSON。'
  }
}
</script>

<template>
  <div class="space-y-2">
    <Textarea
      v-model="localText"
      class="min-h-24 font-mono text-xs"
      :disabled="fieldProps?.disabled"
      :placeholder="fieldProps?.placeholder || '{\n  \n}'"
      @blur="handleBlur"
    />
    <p v-if="errorMessage" class="text-xs text-destructive">{{ errorMessage }}</p>
  </div>
</template>
