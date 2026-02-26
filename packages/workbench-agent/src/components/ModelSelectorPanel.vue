<script setup lang="ts">
import { computed, ref } from 'vue'
import { CheckIcon, ChevronsUpDownIcon } from 'lucide-vue-next'
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorName,
  ModelSelectorTrigger,
} from '@repo/ui-ai-elements'
import { Badge } from '@repo/ui-shadcn/components/ui/badge'
import { Button } from '@repo/ui-shadcn/components/ui/button'
import type { AgentModelOption } from '../types/agent-ide'

const props = withDefaults(
  defineProps<{
    modelValue?: string | null
    options: AgentModelOption[]
    loading?: boolean
    disabled?: boolean
  }>(),
  {
    modelValue: null,
    loading: false,
    disabled: false,
  },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
}>()

const open = ref(false)

const selectedOption = computed(() => {
  if (!props.modelValue) {
    return null
  }
  return props.options.find(option => option.modelUuid === props.modelValue) ?? null
})

const groupedOptions = computed(() => {
  const groups = new Map<string, { label: string; items: AgentModelOption[] }>()
  props.options.forEach((option) => {
    const key = option.provider || option.providerLabel || 'unknown'
    if (!groups.has(key)) {
      groups.set(key, {
        label: option.providerLabel || option.provider || 'Unknown',
        items: [],
      })
    }
    const group = groups.get(key)
    if (group) {
      group.items.push(option)
    }
  })
  return [...groups.entries()].map(([provider, value]) => ({
    provider,
    label: value.label,
    items: value.items,
  }))
})

const handleSelect = (modelUuid: string): void => {
  emit('update:modelValue', modelUuid)
  open.value = false
}
</script>

<template>
  <ModelSelector v-model:open="open">
    <ModelSelectorTrigger as-child>
      <Button
        variant="outline"
        class="w-full justify-between"
        :disabled="disabled || loading"
      >
        <span class="truncate text-left">
          {{ selectedOption?.displayName || (loading ? '正在加载模型...' : '选择模型') }}
        </span>
        <ChevronsUpDownIcon class="ml-2 size-4 shrink-0 opacity-60" />
      </Button>
    </ModelSelectorTrigger>

    <ModelSelectorContent class="sm:max-w-[560px]">
      <ModelSelectorInput placeholder="搜索模型、供应商或版本" />
      <ModelSelectorList>
        <ModelSelectorEmpty>未找到可用模型</ModelSelectorEmpty>
        <ModelSelectorGroup
          v-for="group in groupedOptions"
          :key="group.provider"
          :heading="group.label"
        >
          <ModelSelectorItem
            v-for="option in group.items"
            :key="option.modelUuid"
            :value="`${option.displayName} ${option.moduleName} ${option.providerLabel} ${option.versionTag}`"
            class="gap-2 py-2"
            @select="() => handleSelect(option.modelUuid)"
          >
            <ModelSelectorLogo :provider="option.provider" />
            <ModelSelectorName class="truncate">
              {{ option.displayName }}
            </ModelSelectorName>
            <Badge variant="secondary" class="ml-auto text-[10px]">{{ option.versionTag }}</Badge>
            <CheckIcon v-if="option.modelUuid === modelValue" class="size-4 text-primary" />
          </ModelSelectorItem>
        </ModelSelectorGroup>
      </ModelSelectorList>
    </ModelSelectorContent>
  </ModelSelector>
</template>

