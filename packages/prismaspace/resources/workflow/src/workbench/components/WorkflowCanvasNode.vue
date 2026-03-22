<script setup lang="ts">
import { computed } from 'vue'
import type { WorkflowGraphRead, WorkflowNodeRead } from '@prismaspace/contracts'
import { Badge } from '@prismaspace/ui-shadcn/components/ui/badge'
import { Handle, Position, type NodeProps } from '@vue-flow/core'
import { getWorkflowNodeRegistry } from '../registry'
import {
  appendErrorPortIfNeeded,
  createDefaultSingleInputPort,
  createDefaultSingleOutputPort,
} from '../registry/helpers'
import type { WorkflowNodeRuntimeState } from '../types/workflow-ide'
import { resolveWorkflowIcon } from '../utils/workflow-icons'

interface WorkflowCanvasNodeData {
  workflowNode: WorkflowNodeRead
  graph: WorkflowGraphRead
  runtimeState?: WorkflowNodeRuntimeState | null
  onSelect?: () => void
}

const props = defineProps<NodeProps<WorkflowCanvasNodeData>>()

const workflowNode = computed(() => props.data.workflowNode)
const graph = computed(() => props.data.graph)
const runtimeState = computed(() => props.data.runtimeState ?? null)
const registry = computed(() => getWorkflowNodeRegistry(workflowNode.value.data.registryId))
const Icon = computed(() => resolveWorkflowIcon(workflowNode.value.data.registryId))
const registryId = computed(() => workflowNode.value.data.registryId)
const isStart = computed(() => registryId.value === 'Start')
const isEnd = computed(() => registryId.value === 'End')
const isLlm = computed(() => registryId.value === 'LLMNode')
const isLoop = computed(() => registryId.value === 'Loop')
const isSetVariable = computed(() => registryId.value === 'SetVariable')
const nodeWidthClass = computed(() => 'w-[360px]')
const iconClass = computed(() => {
  if (isLlm.value) return 'bg-[#111827] text-white'
  if (isLoop.value || isSetVariable.value) return 'bg-[#e8faf6] text-[#109a77]'
  if (isStart.value || isEnd.value) return 'bg-[#eef2ff] text-[#4e40e5]'
  if (registryId.value === 'WorkflowNode') return 'bg-[#34c759] text-white'
  return 'bg-[#f5f6ff] text-[#5f66ff]'
})

const inputPorts = computed(() => {
  const resolved = registry.value?.canvas?.getInputPorts?.({
    node: workflowNode.value,
    graph: graph.value,
    runState: runtimeState.value,
  })
  if (resolved) {
    return resolved
  }
  if (isStart.value) {
    return []
  }
  const firstSchema = workflowNode.value.data.inputs?.[0] ?? null
  return createDefaultSingleInputPort(
    firstSchema?.label || firstSchema?.name || '输入',
    firstSchema,
  )
})

const outputPorts = computed(() => {
  const resolved = registry.value?.canvas?.getOutputPorts?.({
    node: workflowNode.value,
    graph: graph.value,
    runState: runtimeState.value,
  })
  if (resolved) {
    return resolved
  }
  if (isEnd.value) {
    return []
  }
  const firstSchema = workflowNode.value.data.outputs?.[0] ?? null
  return appendErrorPortIfNeeded(
    workflowNode.value.data,
    createDefaultSingleOutputPort(
      firstSchema?.label || firstSchema?.name || '输出',
      firstSchema,
    ),
  )
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
  const registryLines = registry.value?.canvas?.getSummaryLines?.({
    node: workflowNode.value,
    graph: graph.value,
    runState: runtimeState.value,
  })
  if (registryLines?.length) {
    return registryLines
  }
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

const runtimePreview = computed(() => {
  const registryPreview = registry.value?.canvas?.getResultPreview?.({
    node: workflowNode.value,
    graph: graph.value,
    runState: runtimeState.value,
  })
  if (registryPreview) {
    return registryPreview
  }
  if (runtimeState.value?.errorMessage) {
    return {
      label: '结果',
      content: runtimeState.value.errorMessage,
      tone: 'danger' as const,
    }
  }
  if (runtimeState.value?.streamPreview || runtimeState.value?.outputPreview) {
    return {
      label: runtimeState.value.streamPreview ? '流式输出' : '结果',
      content: runtimeState.value.streamPreview || runtimeState.value.outputPreview || '',
      tone: runtimeState.value.status === 'interrupted' ? 'warning' as const : 'success' as const,
    }
  }
  return null
})

const runtimeBadgeClass = computed(() => {
  switch (runtimeState.value?.status) {
    case 'running':
      return 'border-[#dbe4ff] bg-[#eef2ff] text-[#4e40e5]'
    case 'succeeded':
      return 'border-[#d8f2df] bg-[#edf9f1] text-[#14804a]'
    case 'failed':
      return 'border-[#ffd7d1] bg-[#fff3f1] text-[#c2413c]'
    case 'interrupted':
      return 'border-[#f7dfb1] bg-[#fff8e8] text-[#b7791f]'
    case 'skipped':
    case 'cancelled':
      return 'border-[#ececf4] bg-[#f7f7fb] text-[#7a8094]'
    default:
      return 'border-[#ececf4] bg-[#fafafc] text-[#7a8094]'
  }
})

const nodeStateClass = computed(() => {
  if (runtimeState.value?.status === 'running') {
    return 'border-[#4e40e5] shadow-[0_0_0_1px_rgba(78,64,229,0.22),0_0_0_6px_rgba(78,64,229,0.10)]'
  }
  if (runtimeState.value?.status === 'succeeded') {
    return 'border-[#26a269] shadow-[0_0_0_1px_rgba(38,162,105,0.18)]'
  }
  if (runtimeState.value?.status === 'failed') {
    return 'border-[#d0534d] shadow-[0_0_0_1px_rgba(208,83,77,0.18)]'
  }
  if (runtimeState.value?.status === 'interrupted') {
    return 'border-[#c17d00] shadow-[0_0_0_1px_rgba(193,125,0,0.16)]'
  }
  if (props.selected) {
    return 'border-[#4e40e5] shadow-[0_0_0_1px_rgba(78,64,229,0.35)]'
  }
  return 'border-[#e4e7ef]'
})
</script>

<template>
  <div
    class="relative cursor-pointer rounded-[8px] border bg-white shadow-[0_2px_6px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.02)] transition-all"
    :class="[nodeWidthClass, nodeStateClass]"
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
    <Handle
      v-if="isLoop"
      id="loop-output-to-function"
      type="source"
      :position="Position.Bottom"
      class="!h-2.5 !w-2.5 !border-2 !border-white !bg-[#91b7c0] opacity-0"
      :connectable="false"
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
        <div class="flex flex-col items-end gap-1">
          <Badge
            v-if="runtimeState"
            variant="outline"
            class="h-6 rounded-full px-2.5 text-[10px]"
            :class="runtimeBadgeClass"
          >
            {{ runtimeState.statusLabel }}
          </Badge>
          <Badge variant="outline" class="h-6 rounded-full border-[#ececf4] bg-[#fafafc] px-2.5 text-[10px] text-[#7a8094]">
            {{ workflowNode.data.registryId }}
          </Badge>
        </div>
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

      <div
        v-if="runtimePreview || runtimeState?.durationLabel || runtimeState?.checkpointLabel"
        class="space-y-2 rounded-[10px] border border-[#f0f1f5] bg-[#fafafc] px-3 py-2"
      >
        <div class="flex items-center justify-between gap-2">
          <p class="text-[11px] font-medium text-[#41485d]">
            {{ runtimePreview?.label || '执行结果' }}
          </p>
          <span v-if="runtimeState?.durationLabel" class="text-[10px] text-[#8d93a6]">{{ runtimeState.durationLabel }}</span>
        </div>
        <p
          v-if="runtimePreview?.content"
          class="line-clamp-4 whitespace-pre-wrap text-[11px] leading-5"
          :class="runtimePreview?.tone === 'danger'
            ? 'text-[#c2413c]'
            : runtimePreview?.tone === 'warning'
              ? 'text-[#9a6700]'
              : runtimePreview?.tone === 'success'
                ? 'text-[#14804a]'
                : 'text-[#4f5568]'"
        >
          {{ runtimePreview.content }}
        </p>
        <p v-if="runtimeState?.checkpointLabel" class="text-[10px] text-[#8d93a6]">
          {{ runtimeState.checkpointLabel }}
        </p>
      </div>
    </div>
  </div>
</template>
