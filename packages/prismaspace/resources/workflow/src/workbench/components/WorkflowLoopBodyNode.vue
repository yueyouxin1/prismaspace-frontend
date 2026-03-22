<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position, type NodeProps } from '@vue-flow/core'
import type { WorkflowNodeRead } from '@prismaspace/contracts'
import { Info } from 'lucide-vue-next'

interface WorkflowLoopBodyNodeData {
  workflowNode: WorkflowNodeRead
  containerNode?: WorkflowNodeRead
  isLoopContextSelected?: boolean
  onSelect?: () => void
}

const props = defineProps<NodeProps<WorkflowLoopBodyNodeData>>()

const containerNode = computed(() => props.data.containerNode ?? props.data.workflowNode)
const bodyWidth = computed(() => Number((containerNode.value.data.config as Record<string, any>)?.__canvas?.width ?? 1120))
const bodyHeight = computed(() => Number((containerNode.value.data.config as Record<string, any>)?.__canvas?.height ?? 440))
const isSelected = computed(() => props.selected || props.data.isLoopContextSelected === true)
</script>

<template>
  <div
    class="relative rounded-[18px] border bg-[linear-gradient(180deg,#eefbfc_0%,#f9fbfe_10%,#fbfbfe_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.88)] transition-all"
    :class="isSelected ? 'border-[#24a7b3] shadow-[0_0_0_1px_rgba(36,167,179,0.22)]' : 'border-[#dbe9ec]'"
    :style="{ width: `${bodyWidth}px`, height: `${bodyHeight}px` }"
  >
    <Handle
      id="loop-function-input"
      type="target"
      :position="Position.Top"
      class="!h-2.5 !w-2.5 !border-2 !border-white !bg-[#91b7c0]"
      :connectable="false"
      :style="{ top: '10px' }"
    />
    <Handle
      id="loop-function-inline-output"
      type="source"
      :position="Position.Left"
      class="!h-2.5 !w-2.5 !border-2 !border-white !bg-[#5b63ff]"
      :style="{ top: '50%', transform: 'translate(10px,20px)' }"
    />
    <Handle
      id="loop-function-inline-input"
      type="target"
      :position="Position.Right"
      class="!h-2.5 !w-2.5 !border-2 !border-white !bg-[#5b63ff]"
      :style="{ top: '50%', transform: 'translate(-10px,20px)' }"
    />

    <div class="pointer-events-none flex h-full flex-col overflow-hidden rounded-[18px]">
      <div class="flex items-center gap-2 border-b border-[#e4edf1] px-5 py-3 text-[#2f6672]">
        <span class="text-[13px] font-semibold">循环体</span>
        <Info class="size-3.5 text-[#7fa0a8]" />
      </div>
      <div
        class="flex-1 rounded-b-[18px]"
        style="background-image: radial-gradient(circle, rgba(143,149,175,0.24) 1px, transparent 1px); background-size: 24px 24px;"
      />
    </div>
  </div>
</template>
