<script setup lang="ts">
import { computed, markRaw, onBeforeUnmount, ref, watch } from 'vue'
import type { WorkflowGraphRead } from '@prismaspace/contracts'
import { Canvas } from '@prismaspace/ui-ai-elements'
import {
  MarkerType,
  useVueFlow,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type NodeDragEvent,
  type NodeMouseEvent,
} from '@vue-flow/core'
import WorkflowCanvasNode from './WorkflowCanvasNode.vue'
import { buildEdgeId } from '../utils/workflow-helpers'

interface WorkflowViewport {
  x: number
  y: number
  zoom: number
}

const FLOW_ID = 'prismaspace-workflow-canvas'

export interface WorkflowCanvasExposed {
  zoomIn: () => Promise<boolean>
  zoomOut: () => Promise<boolean>
  zoomTo: (zoom: number) => Promise<boolean>
  fitView: () => Promise<boolean>
  getViewport: () => WorkflowViewport
}

const props = withDefaults(defineProps<{
  graph: WorkflowGraphRead
  selectedNodeId?: string | null
}>(), {
  graph: () => ({
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  }),
  selectedNodeId: null,
})

const emit = defineEmits<{
  (event: 'select-node', nodeId: string): void
  (event: 'clear-selection'): void
  (event: 'connect', payload: {
    sourceNodeID: string
    targetNodeID: string
    sourcePortID: string
    targetPortID: string
  }): void
  (event: 'update-node-position', payload: { id: string; x: number; y: number }): void
  (event: 'remove-nodes', nodeIds: string[]): void
  (event: 'remove-edges', edgeIds: string[]): void
  (event: 'drop-node-template', payload: { definitionKey: string; x: number; y: number }): void
  (event: 'update-viewport', viewport: WorkflowViewport): void
}>()

const nodeInteractionGuard = ref(false)
let interactionGuardTimer: ReturnType<typeof setTimeout> | null = null

const normalizeViewport = (value: WorkflowGraphRead['viewport']): WorkflowViewport => ({
  x: typeof value?.x === 'number' ? value.x : 0,
  y: typeof value?.y === 'number' ? value.y : 0,
  zoom: typeof value?.zoom === 'number' ? value.zoom : 1,
})

const lastViewportSnapshot = ref(JSON.stringify(normalizeViewport(props.graph.viewport)))
const initialViewport = computed(() => normalizeViewport(props.graph.viewport))
const hasSavedViewport = computed(() => {
  const viewport = props.graph.viewport
  return typeof viewport?.x === 'number' || typeof viewport?.y === 'number' || typeof viewport?.zoom === 'number'
})

const {
  screenToFlowCoordinate,
  zoomIn,
  zoomOut,
  zoomTo,
  fitView,
  getViewport,
  setViewport,
} = useVueFlow(FLOW_ID)

const nodeTypes = {
  workflow: markRaw(WorkflowCanvasNode),
}

const selectNode = (nodeId: string): void => {
  nodeInteractionGuard.value = true
  if (interactionGuardTimer) {
    clearTimeout(interactionGuardTimer)
  }
  emit('select-node', nodeId)
  interactionGuardTimer = setTimeout(() => {
    nodeInteractionGuard.value = false
    interactionGuardTimer = null
  }, 180)
}

const flowNodes = computed(() => props.graph.nodes.map(node => ({
  id: node.id,
  type: 'workflow',
  position: node.position ?? { x: 0, y: 0 },
  selected: props.selectedNodeId === node.id,
  data: {
    workflowNode: node,
    onSelect: () => selectNode(node.id),
  },
  draggable: true,
  connectable: true,
  deletable: node.data.registryId !== 'Start' && node.data.registryId !== 'End',
  selectable: true,
})))

const flowEdges = computed(() => props.graph.edges.map(edge => ({
  id: buildEdgeId(edge),
  source: edge.sourceNodeID,
  target: edge.targetNodeID,
  sourceHandle: edge.sourcePortID,
  targetHandle: edge.targetPortID,
  animated: false,
  selectable: true,
  markerEnd: MarkerType.ArrowClosed,
  style: {
    stroke: '#5b63ff',
    strokeWidth: 2.2,
  },
})))

const handleConnect = (connection: Connection): void => {
  if (!connection.source || !connection.target) {
    return
  }
  emit('connect', {
    sourceNodeID: connection.source,
    targetNodeID: connection.target,
    sourcePortID: connection.sourceHandle ?? '0',
    targetPortID: connection.targetHandle ?? '0',
  })
}

const handleNodeClick = ({ node }: NodeMouseEvent): void => {
  selectNode(node.id)
}

const handlePaneClick = (event: MouseEvent): void => {
  if (nodeInteractionGuard.value) {
    return
  }
  const target = event.target as HTMLElement | null
  if (target?.closest?.('.vue-flow__node')) {
    return
  }
  emit('clear-selection')
}

const handleNodeDragStop = ({ node }: NodeDragEvent): void => {
  emit('update-node-position', {
    id: node.id,
    x: node.position.x,
    y: node.position.y,
  })
}

const handleNodesChange = (changes: NodeChange[]): void => {
  const removed = changes
    .filter(change => change.type === 'remove')
    .map(change => change.id)
  if (removed.length) {
    emit('remove-nodes', removed)
  }
}

const handleEdgesChange = (changes: EdgeChange[]): void => {
  const removed = changes
    .filter(change => change.type === 'remove')
    .map(change => change.id)
  if (removed.length) {
    emit('remove-edges', removed)
  }
}

const handleDragOver = (event: DragEvent): void => {
  const hasNodeTemplate = Array.from(event.dataTransfer?.types ?? []).includes('application/prismaspace-workflow-node')
  if (!hasNodeTemplate) {
    return
  }
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy'
  }
}

const handleDrop = (event: DragEvent): void => {
  const definitionKey = event.dataTransfer?.getData('application/prismaspace-workflow-node')
  if (!definitionKey) {
    return
  }
  event.preventDefault()
  const position = screenToFlowCoordinate({
    x: event.clientX,
    y: event.clientY,
  })
  emit('drop-node-template', {
    definitionKey,
    x: position.x,
    y: position.y,
  })
}

const emitViewport = (viewport: WorkflowViewport): void => {
  const snapshot = JSON.stringify(viewport)
  if (snapshot === lastViewportSnapshot.value) {
    return
  }
  lastViewportSnapshot.value = snapshot
  emit('update-viewport', viewport)
}

const handleViewportChangeEnd = (viewport: WorkflowViewport): void => {
  emitViewport({
    x: viewport.x,
    y: viewport.y,
    zoom: viewport.zoom,
  })
}

watch(
  () => props.graph.viewport,
  async (viewport) => {
    const nextViewport = normalizeViewport(viewport)
    const snapshot = JSON.stringify(nextViewport)
    if (snapshot === lastViewportSnapshot.value) {
      return
    }
    lastViewportSnapshot.value = snapshot
    await setViewport(nextViewport, { duration: 0 })
  },
  { deep: true },
)

defineExpose<WorkflowCanvasExposed>({
  zoomIn: () => zoomIn({ duration: 120 }),
  zoomOut: () => zoomOut({ duration: 120 }),
  zoomTo: (zoom: number) => zoomTo(zoom, { duration: 120 }),
  fitView: () => fitView({ padding: 0.18, duration: 180 }),
  getViewport: () => {
    const viewport = getViewport()
    return {
      x: viewport.x,
      y: viewport.y,
      zoom: viewport.zoom,
    }
  },
})

onBeforeUnmount(() => {
  if (interactionGuardTimer) {
    clearTimeout(interactionGuardTimer)
    interactionGuardTimer = null
  }
})
</script>

<template>
  <div
    class="h-full min-h-0 w-full bg-[#fbfbfe]"
    style="background-image: radial-gradient(circle, rgba(143,149,175,0.28) 1px, transparent 1px); background-size: 24px 24px; background-position: 0 0;"
    @dragover="handleDragOver"
    @drop="handleDrop"
  >
    <Canvas
      :id="FLOW_ID"
      class="h-full min-h-0 w-full"
      :nodes="flowNodes"
      :edges="flowEdges"
      :node-types="nodeTypes"
      :default-viewport="initialViewport"
      :fit-view-on-init="!hasSavedViewport"
      :min-zoom="0.3"
      :max-zoom="1.6"
      :pan-on-drag="true"
      @connect="handleConnect"
      @node-click="handleNodeClick"
      @pane-click="handlePaneClick"
      @node-drag-stop="handleNodeDragStop"
      @nodes-change="handleNodesChange"
      @edges-change="handleEdgesChange"
      @viewport-change-end="handleViewportChangeEnd"
    />
  </div>
</template>
