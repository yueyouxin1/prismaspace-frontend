<script setup lang="ts">
import { computed, markRaw, onBeforeUnmount, ref, watch } from 'vue'
import type { WorkflowGraphRead } from '@prismaspace/contracts'
import { Canvas } from '@prismaspace/ui-ai-elements'
import {
  getRectOfNodes,
  MarkerType,
  useVueFlow,
  Position,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type NodeDragEvent,
  type NodeMouseEvent,
} from '@vue-flow/core'
import WorkflowCanvasNode from './WorkflowCanvasNode.vue'
import WorkflowCanvasConnectionLine from './WorkflowCanvasConnectionLine.vue'
import WorkflowCanvasEdge from './WorkflowCanvasEdge.vue'
import WorkflowLoopBodyNode from './WorkflowLoopBodyNode.vue'
import { buildEdgeId } from '../utils/workflow-helpers'
import type { WorkflowNodeRuntimeState } from '../types/workflow-ide'

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
  nodeRuntimeMap?: Record<string, WorkflowNodeRuntimeState>
}>(), {
  graph: () => ({
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  }),
  selectedNodeId: null,
  nodeRuntimeMap: () => ({}),
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
  (event: 'update-loop-body-layout', payload: { loopBodyId: string; x: number; y: number; width: number; height: number }): void
}>()

const nodeInteractionGuard = ref(false)
let interactionGuardTimer: ReturnType<typeof setTimeout> | null = null

const cloneJson = <T>(value: T): T => {
  try {
    return JSON.parse(JSON.stringify(value)) as T
  } catch {
    return value
  }
}

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
  getNodes,
  zoomIn,
  zoomOut,
  zoomTo,
  fitView,
  getViewport,
  setViewport,
} = useVueFlow(FLOW_ID)

const nodeTypes = {
  workflow: markRaw(WorkflowCanvasNode),
  'loop-body': markRaw(WorkflowLoopBodyNode),
}

const edgeTypes = {
  workflow: markRaw(WorkflowCanvasEdge),
}

const localNodes = ref(cloneJson(props.graph.nodes))
const localEdges = ref(cloneJson(props.graph.edges))

watch(
  () => JSON.stringify({ nodes: props.graph.nodes, edges: props.graph.edges }),
  () => {
    localNodes.value = cloneJson(props.graph.nodes)
    localEdges.value = cloneJson(props.graph.edges)
  },
  { deep: true, immediate: true },
)

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

const flowGraph = computed<WorkflowGraphRead>(() => ({
  nodes: localNodes.value,
  edges: localEdges.value,
  viewport: props.graph.viewport,
}))

const getLocalNodeDataConfig = (nodeId: string): Record<string, any> | undefined => {
  const localNode = localNodes.value.find(node => node.id === nodeId)
  return localNode?.data?.config as Record<string, any> | undefined
}

const updateLocalNodePosition = (nodeId: string, position: { x: number; y: number }): void => {
  localNodes.value = localNodes.value.map((node) =>
    node.id === nodeId
      ? {
          ...node,
          position: {
            x: position.x,
            y: position.y,
          },
        }
      : node,
  )
}

const shiftLocalLoopChildren = (loopBodyId: string, delta: { x: number; y: number }): void => {
  if (!delta.x && !delta.y) {
    return
  }
  localNodes.value = localNodes.value.map((node) => {
    const canvasMeta = (node.data.config as Record<string, any> | undefined)?.__canvas as Record<string, any> | undefined
    if (canvasMeta?.parentBodyId !== loopBodyId) {
      return node
    }
    return {
      ...node,
      position: {
        x: (node.position?.x ?? 0) + delta.x,
        y: (node.position?.y ?? 0) + delta.y,
      },
    }
  })
}

const updateLocalLoopBodyLayout = (
  loopBodyId: string,
  layout: { x: number; y: number; width: number; height: number },
): void => {
  localNodes.value = localNodes.value.map((node) => {
    if (node.id !== loopBodyId) {
      return node
    }
    return {
      ...node,
      position: {
        x: layout.x,
        y: layout.y,
      },
      data: {
        ...node.data,
        config: {
          ...(cloneJson(node.data.config ?? {}) as Record<string, unknown>),
          __canvas: {
            ...(((node.data.config ?? {}) as Record<string, any>).__canvas ?? {}),
            width: layout.width,
            height: layout.height,
          },
        },
      },
    }
  })
}

const flowNodes = computed(() => flowGraph.value.nodes.map((node) => {
  const canvasMeta = (node.data.config as Record<string, any> | undefined)?.__canvas as Record<string, any> | undefined
  const isLoopBody = node.data.registryId === 'LoopBody' || canvasMeta?.kind === 'loop-body'
  const isLoopChild = canvasMeta?.kind === 'loop-child'
  const width = typeof canvasMeta?.width === 'number' ? canvasMeta.width : undefined
  const height = typeof canvasMeta?.height === 'number' ? canvasMeta.height : undefined
  const loopId = String((canvasMeta?.loopId as string | undefined) ?? '')
  const runtimeNodeId = isLoopBody && loopId ? loopId : node.id

  return {
    id: node.id,
    type: isLoopBody ? 'loop-body' : 'workflow',
    position: node.position ?? { x: 0, y: 0 },
    selected: props.selectedNodeId === node.id,
    data: {
      workflowNode: isLoopBody
        ? flowGraph.value.nodes.find(item => item.id === canvasMeta?.loopId) ?? node
        : node,
      containerNode: isLoopBody ? node : undefined,
      graph: flowGraph.value,
      runtimeState: props.nodeRuntimeMap?.[runtimeNodeId] ?? null,
      onSelect: () => selectNode(node.id),
    },
    draggable: true,
    connectable: true,
    deletable: !isLoopBody && node.data.registryId !== 'Start' && node.data.registryId !== 'End',
    selectable: true,
    style: width || height
      ? { width: width ? `${width}px` : undefined, height: height ? `${height}px` : undefined }
      : undefined,
    zIndex: isLoopBody ? 0 : 10,
  }
}))

const flowEdges = computed(() => flowGraph.value.edges.map(edge => ({
  id: buildEdgeId(edge),
  source: edge.sourceNodeID,
  target: edge.targetNodeID,
  sourceHandle: edge.sourcePortID,
  targetHandle: edge.targetPortID,
  type: 'workflow',
  animated: false,
  selectable: true,
  markerEnd: edge.targetPortID === 'loop-function-input' ? undefined : MarkerType.ArrowClosed,
  sourcePosition: edge.sourcePortID === 'loop-output-to-function' ? Position.Bottom : undefined,
  targetPosition: edge.targetPortID === 'loop-function-input' ? Position.Top : undefined,
  style: {
    stroke: edge.sourcePortID === 'loop-output-to-function' ? '#91b7c0' : '#5b63ff',
    strokeWidth: edge.sourcePortID === 'loop-output-to-function' ? 1.6 : 2.2,
    strokeDasharray: edge.sourcePortID === 'loop-output-to-function' ? '5 4' : undefined,
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
  const canvasMeta = (node.data as { workflowNode?: WorkflowGraphRead['nodes'][number] } | undefined)?.workflowNode?.data?.config
  const parentBodyId = ((canvasMeta as Record<string, any> | undefined)?.__canvas as Record<string, any> | undefined)?.parentBodyId as string | undefined
  if ((canvasMeta as Record<string, any> | undefined)?.__canvas?.kind === 'loop-body') {
    updateLocalNodePosition(node.id, {
      x: node.position.x,
      y: node.position.y,
    })
  }
  if (parentBodyId) {
    queueMicrotask(() => syncLoopBodyLayout(parentBodyId))
  }
}

const handleNodesChange = (changes: NodeChange[]): void => {
  const added = changes
    .filter(change => change.type === 'add')
    .map(change => change.item)
  const parentBodyIds = new Set<string>()
  const removed = changes
    .filter(change => change.type === 'remove')
    .map(change => change.id)
  if (added.length) {
    localNodes.value = [
      ...localNodes.value,
      ...cloneJson(added),
    ]
  }
  if (removed.length) {
    localNodes.value = localNodes.value.filter(node => !removed.includes(node.id))
  }
  changes.forEach((change) => {
    if (change.type === 'position') {
      return
    }
    const changedNode = change.type === 'remove'
      ? props.graph.nodes.find(node => node.id === change.id)
      : change.type === 'add'
        ? change.item
        : props.graph.nodes.find(node => node.id === change.id)
    const canvasMeta = (changedNode?.data?.config as Record<string, any> | undefined)?.__canvas as Record<string, any> | undefined
    if (canvasMeta?.parentBodyId) {
      parentBodyIds.add(String(canvasMeta.parentBodyId))
    }
  })
  if (removed.length) {
    emit('remove-nodes', removed)
  }
  if (parentBodyIds.size) {
    queueMicrotask(() => {
      parentBodyIds.forEach(syncLoopBodyLayout)
    })
  }
}

const handleEdgesChange = (changes: EdgeChange[]): void => {
  const removed = changes
    .filter(change => change.type === 'remove')
    .map(change => change.id)
  if (removed.length) {
    localEdges.value = localEdges.value.filter(edge => !removed.includes(buildEdgeId(edge)))
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

const syncLoopBodyLayout = (loopBodyId: string): void => {
  const childNodes = getNodes.value.filter((node) => {
    const canvasMeta = (node.data as { workflowNode?: WorkflowGraphRead['nodes'][number] } | undefined)?.workflowNode?.data?.config
    return ((canvasMeta as Record<string, any> | undefined)?.__canvas as Record<string, any> | undefined)?.parentBodyId === loopBodyId
  })
  if (!childNodes.length) {
    return
  }
  const rect = getRectOfNodes(childNodes)
  const width = Math.max(1120, rect.width + 168)
  const height = Math.max(440, rect.height + 152)
  const nextLayout = {
    x: rect.x - 84,
    y: rect.y - 96,
    width,
    height,
  }
  updateLocalLoopBodyLayout(loopBodyId, nextLayout)
  emit('update-loop-body-layout', {
    loopBodyId,
    ...nextLayout,
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
      :edge-types="edgeTypes"
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
    >
      <template #connection-line="connectionLineProps">
        <WorkflowCanvasConnectionLine v-bind="connectionLineProps" />
      </template>
    </Canvas>
  </div>
</template>
