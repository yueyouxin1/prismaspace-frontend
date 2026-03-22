<script setup lang="ts">
import { computed } from 'vue'
import { getBezierPath, Position, type ConnectionLineProps } from '@vue-flow/core'

const props = defineProps<ConnectionLineProps>()

const path = computed(() => {
  let sourceX = props.sourceX
  let sourceY = props.sourceY
  const targetX = props.targetX
  const targetY = props.targetY
  let sourcePosition = props.sourcePosition
  let targetPosition = props.targetPosition
  const handleSize = 12

  if ([Position.Left, Position.Right].includes(sourcePosition)) {
    if (props.sourceNode?.type === 'loop-body' && props.sourceHandle?.type === 'source') {
      sourceX += handleSize
      sourcePosition = Position.Right
      targetPosition = Position.Left
    }
    if (props.sourceNode?.type === 'loop-body' && props.sourceHandle?.type === 'target') {
      sourceX -= handleSize
      sourcePosition = Position.Left
      targetPosition = Position.Right
    }
    if (props.targetNode?.type === 'loop-body' && props.targetHandle?.type === 'source') {
      sourcePosition = Position.Left
      targetPosition = Position.Right
    }
    if (props.targetNode?.type === 'loop-body' && props.targetHandle?.type === 'target') {
      sourcePosition = Position.Right
      targetPosition = Position.Left
    }
  }

  return getBezierPath({
    ...props,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })
})
</script>

<template>
  <g>
    <path
      class="vue-flow__connection"
      fill="none"
      stroke="#5e92fa"
      :stroke-width="3"
      :d="path[0]"
    />
  </g>
</template>
