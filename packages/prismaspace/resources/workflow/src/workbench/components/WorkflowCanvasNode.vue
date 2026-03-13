<script setup lang="ts">
import { computed } from 'vue'
import type { WorkflowNodeRead } from '@prismaspace/contracts'
import { Badge } from '@prismaspace/ui-shadcn/components/ui/badge'
import { Handle, Position, type NodeProps } from '@vue-flow/core'
import { resolveWorkflowIcon } from '../utils/workflow-icons'

interface WorkflowCanvasNodeData {
  workflowNode: WorkflowNodeRead
  onSelect?: () => void
}

const props = defineProps<NodeProps<WorkflowCanvasNodeData>>()

const workflowNode = computed(() => props.data.workflowNode)
const Icon = computed(() => resolveWorkflowIcon(workflowNode.value.data.registryId))
const registryId = computed(() => workflowNode.value.data.registryId)
const isStart = computed(() => registryId.value === 'Start')
const isEnd = computed(() => registryId.value === 'End')
const isLlm = computed(() => registryId.value === 'LLMNode')
const nodeWidthClass = computed(() => 'w-[360px]')
const iconClass = computed(() => {
  if (isLlm.value) return 'bg-[#111827] text-white'
  if (isStart.value || isEnd.value) return 'bg-[#eef2ff] text-[#4e40e5]'
  if (registryId.value === 'WorkflowNode') return 'bg-[#34c759] text-white'
  return 'bg-[#f5f6ff] text-[#5f66ff]'
})

const inputPorts = computed(() => {
  if (isStart.value) {
    return []
  }
  const items = workflowNode.value.data.inputs ?? []
  if (!items.length) {
    return [{ id: '0', label: 'input' }]
  }
  return items.map((item, index) => ({
    id: String(index),
    label: item.label || item.name || `input-${index + 1}`,
  }))
})

const outputPorts = computed(() => {
  if (isEnd.value) {
    return []
  }
  const items = workflowNode.value.data.outputs ?? []
  if (!items.length) {
    return [{ id: '0', label: 'output' }]
  }
  return items.map((item, index) => ({
    id: String(index),
    label: item.label || item.name || `output-${index + 1}`,
  }))
})

const portOffset = (index: number, total: number): string => {
  const step = 100 / (total + 1)
  return `${Math.round((index + 1) * step)}%`
}

const modelLabel = computed(() => {
  const value = workflowNode.value.data.config?.llm_module_version_uuid
  return typeof value === 'string' && value ? value : '未配置模型'
})

const descriptionLines = computed(() => {
  if (isStart.value) {
    return [
      { label: '输入变量', value: outputPorts.value[0]?.label || '未配置输入变量' },
    ]
  }
  if (isEnd.value) {
    return [
      { label: '返回值', value: inputPorts.value[0]?.label || '未配置返回值' },
      { label: '输出类型', value: workflowNode.value.data.config?.returnType === 'Text' ? '文本' : '结构化对象' },
    ]
  }
  if (isLlm.value) {
    return [
      { label: '输入', value: inputPorts.value[0]?.label || '未配置输入' },
      { label: '输出', value: outputPorts.value[0]?.label || '未配置输出' },
      { label: '模型', value: modelLabel.value },
      { label: '技能', value: '未配置技能' },
    ]
  }
  return [
    { label: '输入', value: inputPorts.value[0]?.label || '未配置输入' },
    { label: '输出', value: outputPorts.value[0]?.label || '未配置输出' },
  ]
})
</script>

<template>
  <div
    class="relative cursor-pointer rounded-[8px] border bg-white shadow-[0_2px_6px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.02)] transition-all"
    :class="[nodeWidthClass, selected ? 'border-[#4e40e5] shadow-[0_0_0_1px_rgba(78,64,229,0.35)]' : 'border-[#e4e7ef]']"
    @mousedown="props.data.onSelect?.()"
  >
    <Handle
      v-for="(port, index) in inputPorts"
      :id="port.id"
      :key="`input-${id}-${port.id}`"
      type="target"
      :position="Position.Left"
      :style="{ top: portOffset(index, inputPorts.length) }"
      class="!h-2.5 !w-2.5 !border-2 !border-white !bg-[#5b63ff]"
    />
    <Handle
      v-for="(port, index) in outputPorts"
      :id="port.id"
      :key="`output-${id}-${port.id}`"
      type="source"
      :position="Position.Right"
      :style="{ top: portOffset(index, outputPorts.length) }"
      class="!h-2.5 !w-2.5 !border-2 !border-white !bg-[#5b63ff]"
    />

    <div class="space-y-3 px-4 py-3">
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-start gap-3">
          <div class="flex size-8 items-center justify-center rounded-[8px]" :class="iconClass">
            <component :is="Icon" class="size-4" />
          </div>
          <div class="min-w-0">
            <p class="truncate text-[14px] font-semibold text-[#1f2335]">{{ workflowNode.data.name }}</p>
            <p v-if="workflowNode.data.description" class="mt-1 text-[11px] leading-4 text-[#7a8094]">
              {{ workflowNode.data.description }}
            </p>
          </div>
        </div>
        <Badge variant="outline" class="h-6 rounded-full border-[#ececf4] bg-[#fafafc] px-2.5 text-[10px] text-[#7a8094]">
          {{ workflowNode.data.registryId }}
        </Badge>
      </div>

      <div class="space-y-2 border-t border-[#f0f1f5] pt-3">
        <div
          v-for="line in descriptionLines"
          :key="`${workflowNode.id}-${line.label}`"
          class="flex items-start gap-2 text-[12px]"
        >
          <span class="w-16 shrink-0 text-[#98a0b3]">{{ line.label }}</span>
          <span class="truncate font-medium text-[#41485d]">{{ line.value }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
