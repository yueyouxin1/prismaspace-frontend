<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Textarea } from '@prismaspace/ui-shadcn/components/ui/textarea'

const props = withDefaults(defineProps<{
  modelValue?: unknown
  fieldProps?: {
    placeholder?: string
    default_schema?: unknown
    disabled?: boolean
  }
}>(), {
  modelValue: undefined,
  fieldProps: () => ({}),
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: unknown): void
}>()

const errorMessage = ref('')
const localText = ref('')
const defaultPlaceholder = '{\n  "name": "field",\n  "type": "string"\n}'

const fallbackValue = computed(() => props.modelValue ?? props.fieldProps?.default_schema ?? null)

watch(
  fallbackValue,
  (value) => {
    localText.value = JSON.stringify(value, null, 2)
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
    errorMessage.value = '参数结构必须是合法 JSON。'
  }
}
</script>

<template>
  <div class="space-y-2">
    <Textarea
      v-model="localText"
      class="min-h-28 font-mono text-xs"
      :disabled="fieldProps?.disabled"
      :placeholder="fieldProps?.placeholder || defaultPlaceholder"
      @blur="handleBlur"
    />
    <p class="text-xs text-muted-foreground">失焦后自动解析为 ParameterSchema JSON。</p>
    <p v-if="errorMessage" class="text-xs text-destructive">{{ errorMessage }}</p>
  </div>
</template>
