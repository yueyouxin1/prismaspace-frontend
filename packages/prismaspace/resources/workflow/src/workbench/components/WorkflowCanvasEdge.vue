<script setup lang="ts">
import { computed } from 'vue'
import { BaseEdge, getBezierPath, Position, type EdgeProps } from '@vue-flow/core'

const props = defineProps<EdgeProps>()

const path = computed(() => {
  let sourceX = props.sourceX
  const sourceY = props.sourceY
  let targetX = props.targetX
  const targetY = props.targetY
  let sourcePosition = props.sourcePosition
  let targetPosition = props.targetPosition
  const handleSize = 12

  if ([Position.Left, Position.Right].includes(targetPosition)) {
    if (props.sourceNode?.type === 'loop-body') {
      sourceX += handleSize
      sourcePosition = Position.Right
      targetPosition = Position.Left
    }
    if (props.targetNode?.type === 'loop-body') {
      targetX -= handleSize
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
  <BaseEdge :id="id" :path="path[0]" :marker-end="markerEnd" :style="style" :z-index="999" />
</template>
