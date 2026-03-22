import type { WorkflowEdgeRead, WorkflowGraphRead, WorkflowNodeRead } from '@prismaspace/contracts'

const LOOP_BODY_ID_PREFIX = 'LoopFunction_'
const LOOP_BODY_OFFSET_X = -32
const LOOP_BODY_OFFSET_Y = 188
const LOOP_BODY_MIN_WIDTH = 1120
const LOOP_BODY_MIN_HEIGHT = 440
const LOOP_BODY_PADDING_LEFT = 84
const LOOP_BODY_PADDING_TOP = 96
const LOOP_BODY_PADDING_RIGHT = 84
const LOOP_BODY_PADDING_BOTTOM = 56
const DEFAULT_CHILD_NODE_WIDTH = 360
const DEFAULT_CHILD_NODE_HEIGHT = 136
const DEFAULT_CHILD_GAP_X = 240
const DEFAULT_CHILD_GAP_Y = 180

const cloneJson = <T>(value: T): T => {
  try {
    return JSON.parse(JSON.stringify(value)) as T
  } catch {
    return value
  }
}

const buildEdgeId = (edge: Pick<WorkflowEdgeRead, 'sourceNodeID' | 'targetNodeID' | 'sourcePortID' | 'targetPortID'>): string =>
  `${edge.sourceNodeID}:${edge.sourcePortID}->${edge.targetNodeID}:${edge.targetPortID}`

export const getLoopBodyNodeId = (loopNodeId: string): string => `${LOOP_BODY_ID_PREFIX}${loopNodeId}`

export const isLoopBodyNodeId = (nodeId: string): boolean => nodeId.startsWith(LOOP_BODY_ID_PREFIX)

export const getLoopIdFromLoopBodyId = (nodeId: string): string | null =>
  isLoopBodyNodeId(nodeId) ? nodeId.slice(LOOP_BODY_ID_PREFIX.length) : null

type WorkflowNodeLocation = {
  node: WorkflowNodeRead
  parentLoopId: string | null
}

const walkNodes = (
  nodes: WorkflowNodeRead[],
  visitor: (node: WorkflowNodeRead, parentLoopId: string | null) => void,
  parentLoopId: string | null = null,
): void => {
  for (const node of nodes) {
    visitor(node, parentLoopId)
    if (Array.isArray(node.data.blocks) && node.data.blocks.length) {
      walkNodes(node.data.blocks, visitor, node.id)
    }
  }
}

export const findWorkflowNodeLocation = (
  graph: WorkflowGraphRead,
  nodeId: string | null,
): WorkflowNodeLocation | null => {
  if (!nodeId) {
    return null
  }

  let match: WorkflowNodeLocation | null = null
  walkNodes(graph.nodes, (node, parentLoopId) => {
    if (match || node.id !== nodeId) {
      return
    }
    match = { node, parentLoopId }
  })
  return match
}

export const findWorkflowNodeById = (
  graph: WorkflowGraphRead,
  nodeId: string | null,
): WorkflowNodeRead | null => findWorkflowNodeLocation(graph, nodeId)?.node ?? null

export const getActiveLoopContextId = (
  graph: WorkflowGraphRead,
  selectedNodeId: string | null,
): string | null => {
  if (!selectedNodeId) {
    return null
  }
  const loopIdFromBody = getLoopIdFromLoopBodyId(selectedNodeId)
  if (loopIdFromBody) {
    return loopIdFromBody
  }
  const location = findWorkflowNodeLocation(graph, selectedNodeId)
  if (!location) {
    return null
  }
  if (location.node.data.registryId === 'Loop') {
    return location.node.id
  }
  return location.parentLoopId
}

type LoopBodyBounds = {
  x: number
  y: number
  width: number
  height: number
}

const getLoopBodyBounds = (loopNode: WorkflowNodeRead): LoopBodyBounds => {
  const blocks = loopNode.data.blocks ?? []
  const minChildX = blocks.reduce((min, node) => {
    const x = typeof node.position?.x === 'number' ? node.position.x : 0
    return Math.min(min, x)
  }, blocks.length ? Number.POSITIVE_INFINITY : 0)
  const minChildY = blocks.reduce((min, node) => {
    const y = typeof node.position?.y === 'number' ? node.position.y : 0
    return Math.min(min, y)
  }, blocks.length ? Number.POSITIVE_INFINITY : 0)
  const maxChildRight = blocks.reduce((max, node) => {
    const x = typeof node.position?.x === 'number' ? node.position.x : 0
    return Math.max(max, x + DEFAULT_CHILD_NODE_WIDTH)
  }, 0)
  const maxChildBottom = blocks.reduce((max, node) => {
    const y = typeof node.position?.y === 'number' ? node.position.y : 0
    return Math.max(max, y + DEFAULT_CHILD_NODE_HEIGHT)
  }, 0)

  const loopConfig = (loopNode.data.config ?? {}) as Record<string, any>
  const canvasPosition = (loopConfig.canvasPosition ?? null) as Record<string, any> | null
  const canvasSize = (loopConfig.canvasSize ?? null) as Record<string, any> | null
  const safeMinChildX = Number.isFinite(minChildX) ? minChildX : 0
  const safeMinChildY = Number.isFinite(minChildY) ? minChildY : 0

  const width = Math.max(
    Number(canvasSize?.width ?? 0),
    LOOP_BODY_MIN_WIDTH,
    maxChildRight - safeMinChildX + LOOP_BODY_PADDING_LEFT + LOOP_BODY_PADDING_RIGHT,
  )
  const height = Math.max(
    Number(canvasSize?.height ?? 0),
    LOOP_BODY_MIN_HEIGHT,
    maxChildBottom - safeMinChildY + LOOP_BODY_PADDING_TOP + LOOP_BODY_PADDING_BOTTOM,
  )

  return {
    x: typeof canvasPosition?.x === 'number' ? canvasPosition.x : (loopNode.position?.x ?? 0) + LOOP_BODY_OFFSET_X,
    y: typeof canvasPosition?.y === 'number' ? canvasPosition.y : (loopNode.position?.y ?? 0) + LOOP_BODY_OFFSET_Y,
    width,
    height,
  }
}

const createLoopBodyNode = (loopNode: WorkflowNodeRead): WorkflowNodeRead => {
  const bounds = getLoopBodyBounds(loopNode)
  return {
    id: getLoopBodyNodeId(loopNode.id),
    data: {
      registryId: 'LoopBody',
      name: '循环体',
      description: '用于承载循环子流程的容器。',
      config: {
        __canvas: {
          kind: 'loop-body',
          loopId: loopNode.id,
          width: bounds.width,
          height: bounds.height,
        },
      },
      inputs: [],
      outputs: [],
    },
    position: {
      x: bounds.x,
      y: bounds.y,
    },
  }
}

const createLoopChildNode = (
  node: WorkflowNodeRead,
  loopId: string,
): WorkflowNodeRead => ({
  ...cloneJson(node),
  data: {
    ...cloneJson(node.data),
    config: {
      ...(cloneJson(node.data.config ?? {}) as Record<string, unknown>),
      __canvas: {
        kind: 'loop-child',
        loopId,
        parentBodyId: getLoopBodyNodeId(loopId),
      },
    },
  },
})

const expandLoopEdges = (
  loopNode: WorkflowNodeRead,
): WorkflowEdgeRead[] => {
  const bodyId = getLoopBodyNodeId(loopNode.id)
  const edges: WorkflowEdgeRead[] = [
    {
      sourceNodeID: loopNode.id,
      targetNodeID: bodyId,
      sourcePortID: 'loop-output-to-function',
      targetPortID: 'loop-function-input',
    },
  ]

  for (const edge of loopNode.data.edges ?? []) {
    edges.push({
      ...cloneJson(edge),
      sourceNodeID: edge.sourceNodeID === loopNode.id ? bodyId : edge.sourceNodeID,
      targetNodeID: edge.targetNodeID === loopNode.id ? bodyId : edge.targetNodeID,
    })
  }

  return edges
}

export const expandWorkflowGraphForCanvas = (
  graph: WorkflowGraphRead,
): WorkflowGraphRead => {
  const nodes: WorkflowNodeRead[] = []
  const edges: WorkflowEdgeRead[] = []

  for (const node of graph.nodes) {
    nodes.push(cloneJson(node))
    if (node.data.registryId !== 'Loop') {
      continue
    }

    nodes.push(createLoopBodyNode(node))
    for (const block of node.data.blocks ?? []) {
      nodes.push(createLoopChildNode(block, node.id))
    }
    edges.push(...expandLoopEdges(node))
  }

  edges.push(...cloneJson(graph.edges ?? []))

  return {
    nodes,
    edges,
    viewport: cloneJson(graph.viewport ?? { x: 0, y: 0, zoom: 1 }),
  }
}

const mapNodesRecursively = (
  nodes: WorkflowNodeRead[],
  nodeId: string,
  updater: (node: WorkflowNodeRead) => WorkflowNodeRead,
): { nodes: WorkflowNodeRead[]; changed: boolean } => {
  let changed = false
  const nextNodes = nodes.map((node) => {
    if (node.id === nodeId) {
      changed = true
      return updater(node)
    }
    if (Array.isArray(node.data.blocks) && node.data.blocks.length) {
      const nextBlocks = mapNodesRecursively(node.data.blocks, nodeId, updater)
      if (nextBlocks.changed) {
        changed = true
        return {
          ...node,
          data: {
            ...node.data,
            blocks: nextBlocks.nodes,
          },
        }
      }
    }
    return node
  })
  return { nodes: nextNodes, changed }
}

export const updateWorkflowNodeById = (
  graph: WorkflowGraphRead,
  nodeId: string,
  updater: (node: WorkflowNodeRead) => WorkflowNodeRead,
): WorkflowGraphRead => {
  const next = mapNodesRecursively(graph.nodes, nodeId, updater)
  if (!next.changed) {
    return graph
  }
  return {
    ...graph,
    nodes: next.nodes,
  }
}

const removeNodesRecursively = (
  nodes: WorkflowNodeRead[],
  nodeIds: Set<string>,
): WorkflowNodeRead[] => {
  return nodes
    .filter(node => !nodeIds.has(node.id))
    .map((node) => {
      if (!Array.isArray(node.data.blocks) || !node.data.blocks.length) {
        return node
      }
      const nextBlocks = removeNodesRecursively(node.data.blocks, nodeIds)
      const nextBlockIds = new Set(nextBlocks.map(block => block.id))
      return {
        ...node,
        data: {
          ...node.data,
          blocks: nextBlocks,
          edges: (node.data.edges ?? []).filter((edge) => {
            if (edge.sourceNodeID === node.id || edge.targetNodeID === node.id) {
              return true
            }
            return nextBlockIds.has(edge.sourceNodeID) && nextBlockIds.has(edge.targetNodeID)
          }),
        },
      }
    })
}

export const removeWorkflowNodesByIds = (
  graph: WorkflowGraphRead,
  nodeIds: string[],
): WorkflowGraphRead => {
  const ids = new Set(nodeIds.filter(nodeId => !isLoopBodyNodeId(nodeId)))
  if (!ids.size) {
    return graph
  }
  const nextNodes = removeNodesRecursively(graph.nodes, ids)
  return {
    ...graph,
    nodes: nextNodes,
    edges: graph.edges.filter(edge => !ids.has(edge.sourceNodeID) && !ids.has(edge.targetNodeID)),
  }
}

export const updateWorkflowNodePositionById = (
  graph: WorkflowGraphRead,
  nodeId: string,
  position: { x: number; y: number },
): WorkflowGraphRead => {
  const loopId = getLoopIdFromLoopBodyId(nodeId)
  if (loopId) {
    const loopNode = findWorkflowNodeById(graph, loopId)
    const previousBounds = loopNode ? getLoopBodyBounds(loopNode) : null
    const deltaX = previousBounds ? position.x - previousBounds.x : 0
    const deltaY = previousBounds ? position.y - previousBounds.y : 0
    return updateWorkflowNodeById(
      graph,
      loopId,
      (node) => ({
        ...node,
        data: {
          ...node.data,
          blocks: (node.data.blocks ?? []).map((block) => ({
            ...block,
            position: {
              x: (block.position?.x ?? 0) + deltaX,
              y: (block.position?.y ?? 0) + deltaY,
            },
          })),
          config: {
            ...(cloneJson(node.data.config ?? {}) as Record<string, unknown>),
            canvasPosition: {
              x: position.x,
              y: position.y,
            },
          },
        },
      }),
    )
  }
  return updateWorkflowNodeById(
    graph,
    nodeId,
    (node) => ({
      ...node,
      position,
    }),
  )
}

export const updateLoopBodyLayout = (
  graph: WorkflowGraphRead,
  loopBodyId: string,
  layout: {
    x?: number
    y?: number
    width?: number
    height?: number
  },
): WorkflowGraphRead => {
  const loopId = getLoopIdFromLoopBodyId(loopBodyId)
  if (!loopId) {
    return graph
  }
  return updateWorkflowNodeById(
    graph,
    loopId,
    (node) => ({
      ...node,
        data: {
          ...node.data,
          config: {
            ...(cloneJson(node.data.config ?? {}) as Record<string, unknown>),
            canvasPosition: {
              x: layout.x,
              y: layout.y,
            },
            canvasSize: {
              width: layout.width,
              height: layout.height,
          },
        },
      },
    }),
  )
}

const createLoopChildPosition = (loopNode: WorkflowNodeRead): { x: number; y: number } => {
  const blocks = loopNode.data.blocks ?? []
  const bounds = getLoopBodyBounds(loopNode)
  if (!blocks.length) {
    return {
      x: bounds.x + LOOP_BODY_PADDING_LEFT,
      y: bounds.y + LOOP_BODY_PADDING_TOP,
    }
  }
  const index = blocks.length
  return {
    x: bounds.x + LOOP_BODY_PADDING_LEFT + (index % 3) * DEFAULT_CHILD_GAP_X,
    y: bounds.y + LOOP_BODY_PADDING_TOP + Math.floor(index / 3) * DEFAULT_CHILD_GAP_Y,
  }
}

export const addWorkflowNodeToGraph = (
  graph: WorkflowGraphRead,
  node: WorkflowNodeRead,
  options?: {
    parentLoopId?: string | null
  },
): WorkflowGraphRead => {
  const parentLoopId = options?.parentLoopId ?? null
  if (!parentLoopId) {
    return {
      ...graph,
      nodes: [...graph.nodes, node],
    }
  }

  return updateWorkflowNodeById(graph, parentLoopId, (loopNode) => ({
    ...loopNode,
    data: {
      ...loopNode.data,
      blocks: [
        ...(loopNode.data.blocks ?? []),
        {
          ...node,
          position: node.position ?? createLoopChildPosition(loopNode),
        },
      ],
    },
  }))
}

const isNodeInsideLoop = (
  graph: WorkflowGraphRead,
  nodeId: string,
): string | null => findWorkflowNodeLocation(graph, nodeId)?.parentLoopId ?? null

const normalizeInternalLoopEdge = (
  loopId: string,
  edge: WorkflowEdgeRead,
): WorkflowEdgeRead => ({
  ...edge,
  sourceNodeID: edge.sourceNodeID === getLoopBodyNodeId(loopId) ? loopId : edge.sourceNodeID,
  targetNodeID: edge.targetNodeID === getLoopBodyNodeId(loopId) ? loopId : edge.targetNodeID,
})

export const addWorkflowEdgeToGraph = (
  graph: WorkflowGraphRead,
  edge: WorkflowEdgeRead,
): WorkflowGraphRead => {
  const sourceLoopId = isLoopBodyNodeId(edge.sourceNodeID)
    ? getLoopIdFromLoopBodyId(edge.sourceNodeID)
    : isNodeInsideLoop(graph, edge.sourceNodeID)
  const targetLoopId = isLoopBodyNodeId(edge.targetNodeID)
    ? getLoopIdFromLoopBodyId(edge.targetNodeID)
    : isNodeInsideLoop(graph, edge.targetNodeID)

  if (sourceLoopId && targetLoopId && sourceLoopId === targetLoopId) {
    const canonicalEdge = normalizeInternalLoopEdge(sourceLoopId, edge)
    return updateWorkflowNodeById(graph, sourceLoopId, (loopNode) => {
      const nextEdges = loopNode.data.edges ?? []
      if (nextEdges.some(current => buildEdgeId(current) === buildEdgeId(canonicalEdge))) {
        return loopNode
      }
      return {
        ...loopNode,
        data: {
          ...loopNode.data,
          edges: [...nextEdges, canonicalEdge],
        },
      }
    })
  }

  if (sourceLoopId || targetLoopId) {
    return graph
  }

  if (graph.edges.some(current => buildEdgeId(current) === buildEdgeId(edge))) {
    return graph
  }

  return {
    ...graph,
    edges: [...graph.edges, edge],
  }
}

const buildLoopPresentedEdgeId = (
  loopId: string,
  edge: WorkflowEdgeRead,
): string => {
  const presentedEdge = {
    sourceNodeID: edge.sourceNodeID === loopId ? getLoopBodyNodeId(loopId) : edge.sourceNodeID,
    targetNodeID: edge.targetNodeID === loopId ? getLoopBodyNodeId(loopId) : edge.targetNodeID,
    sourcePortID: edge.sourcePortID,
    targetPortID: edge.targetPortID,
  }
  return buildEdgeId(presentedEdge)
}

export const removeWorkflowEdgesByIds = (
  graph: WorkflowGraphRead,
  edgeIds: string[],
): WorkflowGraphRead => {
  const ids = new Set(edgeIds)
  const nextNodes = graph.nodes.map((node) => {
    if (node.data.registryId !== 'Loop') {
      return node
    }
    return {
      ...node,
      data: {
        ...node.data,
        edges: (node.data.edges ?? []).filter((edge) => !ids.has(buildLoopPresentedEdgeId(node.id, edge))),
      },
    }
  })
  return {
    ...graph,
    nodes: nextNodes,
    edges: graph.edges.filter((edge) => !ids.has(buildEdgeId(edge))),
  }
}

export const getLoopBodyDropContext = (
  graph: WorkflowGraphRead,
  position: { x: number; y: number },
): string | null => {
  for (const node of graph.nodes) {
    if (node.data.registryId !== 'Loop') {
      continue
    }
    const bounds = getLoopBodyBounds(node)
    if (
      position.x >= bounds.x
      && position.x <= bounds.x + bounds.width
      && position.y >= bounds.y
      && position.y <= bounds.y + bounds.height
    ) {
      return node.id
    }
  }
  return null
}
