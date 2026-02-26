<script setup lang="ts">
import { computed } from 'vue'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@repo/ui-shadcn/components/ui/accordion'
import { Input } from '@repo/ui-shadcn/components/ui/input'
import { Label } from '@repo/ui-shadcn/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui-shadcn/components/ui/select'
import { Switch } from '@repo/ui-shadcn/components/ui/switch'
import { Badge } from '@repo/ui-shadcn/components/ui/badge'
import ModelSelectorPanel from '../components/ModelSelectorPanel.vue'
import type {
  AgentDiversityMode,
  AgentEditableConfig,
  AgentEditableIoConfig,
  AgentEditableModelParams,
  AgentModelOption,
  AgentResponseFormatType,
} from '../types/agent-ide'

const props = withDefaults(
  defineProps<{
    modelValue: AgentEditableConfig
    llmModuleVersionUuid?: string | null
    modelOptions: AgentModelOption[]
    modelsLoading?: boolean
    readonly?: boolean
  }>(),
  {
    llmModuleVersionUuid: null,
    modelsLoading: false,
    readonly: false,
  },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: AgentEditableConfig): void
  (event: 'update:llmModuleVersionUuid', value: string): void
}>()

const isCustomMode = computed(() => props.modelValue.diversityMode === 'custom')

const clamp = (value: number, min: number, max: number): number => {
  if (Number.isNaN(value)) {
    return min
  }
  return Math.min(max, Math.max(min, value))
}

const updateModelValue = (next: AgentEditableConfig): void => {
  emit('update:modelValue', next)
}

const updateModelParams = (patch: Partial<AgentEditableModelParams>): void => {
  updateModelValue({
    ...props.modelValue,
    modelParams: {
      ...props.modelValue.modelParams,
      ...patch,
    },
  })
}

const updateIoConfig = (patch: Partial<AgentEditableIoConfig>): void => {
  updateModelValue({
    ...props.modelValue,
    ioConfig: {
      ...props.modelValue.ioConfig,
      ...patch,
    },
  })
}

const applyPreset = (mode: AgentDiversityMode): void => {
  if (mode === 'precise') {
    updateModelValue({
      ...props.modelValue,
      diversityMode: mode,
      modelParams: {
        ...props.modelValue.modelParams,
        temperature: 0.1,
        topP: 0.1,
      },
    })
    return
  }

  if (mode === 'balanced') {
    updateModelValue({
      ...props.modelValue,
      diversityMode: mode,
      modelParams: {
        ...props.modelValue.modelParams,
        temperature: 0.5,
        topP: 0.9,
      },
    })
    return
  }

  if (mode === 'creative') {
    updateModelValue({
      ...props.modelValue,
      diversityMode: mode,
      modelParams: {
        ...props.modelValue.modelParams,
        temperature: 0.9,
        topP: 1.0,
      },
    })
    return
  }

  updateModelValue({
    ...props.modelValue,
    diversityMode: mode,
  })
}

const parseNumber = (
  raw: string | number,
  fallback: number,
  min: number,
  max: number,
): number => {
  const parsed = typeof raw === 'number' ? raw : Number(raw)
  if (Number.isNaN(parsed)) {
    return fallback
  }
  return clamp(parsed, min, max)
}

const updateResponseFormat = (value: unknown): void => {
  const safeValue: AgentResponseFormatType = value === 'json_object' ? 'json_object' : 'text'
  updateIoConfig({
    responseFormatType: safeValue,
  })
}

const onDeepThinkingChange = (value: boolean): void => {
  updateIoConfig({
    enableDeepThinking: value,
    maxThinkingTokens: value
      ? props.modelValue.ioConfig.maxThinkingTokens ?? 1024
      : null,
  })
}
</script>

<template>
  <Accordion type="multiple" :default-value="['model']" class="w-full">
    <AccordionItem value="model">
      <AccordionTrigger class="text-base font-semibold hover:no-underline">模型设置</AccordionTrigger>
      <AccordionContent class="space-y-4">
        <div class="space-y-2">
          <Label>模型</Label>
          <ModelSelectorPanel
            :model-value="llmModuleVersionUuid"
            :options="modelOptions"
            :loading="modelsLoading"
            :disabled="readonly"
            @update:model-value="emit('update:llmModuleVersionUuid', $event)"
          />
        </div>

        <div class="space-y-2">
          <Label>生成风格</Label>
          <Select :model-value="modelValue.diversityMode" :disabled="readonly" @update:model-value="applyPreset($event as AgentDiversityMode)">
            <SelectTrigger>
              <SelectValue placeholder="选择风格" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="precise">Precise</SelectItem>
              <SelectItem value="balanced">Balanced</SelectItem>
              <SelectItem value="creative">Creative</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          <p class="text-xs text-muted-foreground">非 Custom 模式下，温度和 Top P 按预设锁定。</p>
        </div>

        <div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div class="space-y-2">
            <Label>Temperature</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="2"
              :disabled="readonly || !isCustomMode"
              :model-value="String(modelValue.modelParams.temperature)"
              @update:model-value="updateModelParams({ temperature: parseNumber($event, modelValue.modelParams.temperature, 0, 2) })"
            />
          </div>
          <div class="space-y-2">
            <Label>Top P</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="1"
              :disabled="readonly || !isCustomMode"
              :model-value="String(modelValue.modelParams.topP)"
              @update:model-value="updateModelParams({ topP: parseNumber($event, modelValue.modelParams.topP, 0, 1) })"
            />
          </div>
          <div class="space-y-2">
            <Label>Presence Penalty</Label>
            <Input
              type="number"
              step="0.1"
              min="-2"
              max="2"
              :disabled="readonly || !isCustomMode"
              :model-value="String(modelValue.modelParams.presencePenalty)"
              @update:model-value="updateModelParams({ presencePenalty: parseNumber($event, modelValue.modelParams.presencePenalty, -2, 2) })"
            />
          </div>
          <div class="space-y-2">
            <Label>Frequency Penalty</Label>
            <Input
              type="number"
              step="0.1"
              min="-2"
              max="2"
              :disabled="readonly || !isCustomMode"
              :model-value="String(modelValue.modelParams.frequencyPenalty)"
              @update:model-value="updateModelParams({ frequencyPenalty: parseNumber($event, modelValue.modelParams.frequencyPenalty, -2, 2) })"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div class="space-y-2">
            <Label>历史轮数</Label>
            <Input
              type="number"
              min="0"
              :disabled="readonly"
              :model-value="String(modelValue.ioConfig.historyTurns)"
              @update:model-value="updateIoConfig({ historyTurns: parseNumber($event, modelValue.ioConfig.historyTurns, 0, 200) })"
            />
          </div>
          <div class="space-y-2">
            <Label>最大回复 Tokens</Label>
            <Input
              type="number"
              min="1"
              :disabled="readonly"
              :model-value="String(modelValue.ioConfig.maxResponseTokens)"
              @update:model-value="updateIoConfig({ maxResponseTokens: parseNumber($event, modelValue.ioConfig.maxResponseTokens, 1, 128000) })"
            />
          </div>
        </div>

        <div class="space-y-2 rounded-md border p-3">
          <div class="flex items-center justify-between">
            <Label>深度思考</Label>
            <Switch
              :model-value="modelValue.ioConfig.enableDeepThinking"
              :disabled="readonly"
              @update:model-value="onDeepThinkingChange(Boolean($event))"
            />
          </div>
          <div v-if="modelValue.ioConfig.enableDeepThinking" class="space-y-2">
            <Label>最大思考 Tokens</Label>
            <Input
              type="number"
              min="1"
              :disabled="readonly"
              :model-value="String(modelValue.ioConfig.maxThinkingTokens ?? 1024)"
              @update:model-value="updateIoConfig({ maxThinkingTokens: parseNumber($event, modelValue.ioConfig.maxThinkingTokens ?? 1024, 1, 128000) })"
            />
          </div>
        </div>

        <div class="space-y-2">
          <Label>响应格式</Label>
          <Select :model-value="modelValue.ioConfig.responseFormatType" :disabled="readonly" @update:model-value="updateResponseFormat">
            <SelectTrigger>
              <SelectValue placeholder="选择响应格式" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">text</SelectItem>
              <SelectItem value="json_object">json_object</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </AccordionContent>
    </AccordionItem>

    <AccordionItem value="rag">
      <AccordionTrigger class="text-base font-semibold hover:no-underline">
        <div class="flex items-center gap-2">
          <span>RAG / Memory</span>
          <Badge variant="outline">未实现</Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <p class="text-sm text-muted-foreground">本期 MVP 先落地模型设置，RAG/Memory 在后续迭代接入。</p>
      </AccordionContent>
    </AccordionItem>
  </Accordion>
</template>
