import { nanoid } from 'nanoid'
import type {
  ResourceRead,
  ServiceModuleRead,
  WorkflowGraphRead,
  WorkflowNodeDataRead,
  WorkflowNodeDefRead,
  WorkflowNodeRead,
  WorkflowParameterSchema,
} from '@prismaspace/contracts'
import type { FormItem } from '@prismaspace/generator/form-generator'
import type {
  WorkflowModelOption,
  WorkflowPaletteGroup,
  WorkflowResourceOption,
  WorkflowVariableEntry,
} from '../types/workflow-ide'
import { findWorkflowNodeById, findWorkflowNodeLocation } from './workflow-loop-graph'

const NODE_GAP_X = 260
const NODE_GAP_Y = 140

export const cloneJson = <T>(value: T): T => {
  try {
    return JSON.parse(JSON.stringify(value)) as T
  } catch {
    return value
  }
}

export const ensureWorkflowGraph = (graph?: WorkflowGraphRead | null): WorkflowGraphRead => ({
  nodes: cloneJson(graph?.nodes ?? []),
  edges: cloneJson(graph?.edges ?? []),
  viewport: cloneJson(graph?.viewport ?? { x: 0, y: 0, zoom: 1 }),
})

export const buildWorkflowPaletteGroups = (
  definitions: WorkflowNodeDefRead[],
  options?: {
    loopContextActive?: boolean
  },
): WorkflowPaletteGroup[] => {
  const groups = new Map<string, WorkflowNodeDefRead[]>()

  definitions.forEach((definition) => {
    if (definition.node.registryId === 'SetVariable' && !options?.loopContextActive) {
      return
    }
    const categoryKey = definition.category || 'other'
    const current = groups.get(categoryKey) ?? []
    current.push(definition)
    groups.set(categoryKey, current)
  })

  return Array.from(groups.entries())
    .map(([key, items]) => ({
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      items: items.slice().sort((left, right) => left.display_order - right.display_order || left.label.localeCompare(right.label)),
    }))
    .sort((left, right) => left.label.localeCompare(right.label))
}

export const createWorkflowNodeFromDefinition = (
  definition: WorkflowNodeDefRead,
  existingCount: number,
  position?: { x: number; y: number },
): WorkflowNodeRead => {
  const nodeData = cloneJson(definition.node)
  return {
    id: `wf_${nanoid(10)}`,
    data: {
      registryId: nodeData.registryId,
      name: nodeData.name,
      description: nodeData.description,
      config: nodeData.config ?? {},
      inputs: nodeData.inputs ?? [],
      outputs: nodeData.outputs ?? [],
      blocks: nodeData.blocks ?? [],
      edges: nodeData.edges ?? [],
    },
    position: position ?? {
      x: 120 + (existingCount % 3) * NODE_GAP_X,
      y: 120 + Math.floor(existingCount / 3) * NODE_GAP_Y,
    },
  }
}

export const buildEdgeId = (edge: {
  sourceNodeID: string
  targetNodeID: string
  sourcePortID: string
  targetPortID: string
  id?: string | null
}): string => {
  return edge.id || `${edge.sourceNodeID}:${edge.sourcePortID}->${edge.targetNodeID}:${edge.targetPortID}`
}

export const parseJsonObject = (text: string): Record<string, unknown> => {
  const parsed = JSON.parse(text) as unknown
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('JSON 必须是对象。')
  }
  return parsed as Record<string, unknown>
}

export const parseJsonArray = <T>(text: string): T[] => {
  const parsed = JSON.parse(text) as unknown
  if (!Array.isArray(parsed)) {
    throw new Error('JSON 必须是数组。')
  }
  return parsed as T[]
}

export const formatJson = (value: unknown): string => {
  try {
    return JSON.stringify(value ?? null, null, 2)
  } catch {
    return ''
  }
}

export const buildWorkflowResourceOptionsByType = (
  resources: ResourceRead[],
): Record<string, WorkflowResourceOption[]> => {
  return resources.reduce<Record<string, WorkflowResourceOption[]>>((accumulator, resource) => {
    const type = resource.resource_type || 'other'
    const value = resource.latest_published_instance_uuid ?? resource.workspace_instance_uuid ?? ''
    if (!value) {
      return accumulator
    }
    const current = accumulator[type] ?? []
    current.push({
      value,
      label: resource.name,
      description: resource.description ?? '',
      resourceType: type,
      resourceUuid: resource.uuid,
      published: Boolean(resource.latest_published_instance_uuid),
    })
    accumulator[type] = current
    return accumulator
  }, {})
}

export const buildWorkflowModelOptions = (modules: ServiceModuleRead[]): WorkflowModelOption[] => {
  return modules.flatMap(module =>
    (module.versions ?? []).map(version => ({
      value: version.uuid,
      label: `${module.label || module.name} · ${version.version_tag}`,
      description: version.description ?? '',
      moduleName: module.name,
      versionTag: version.version_tag,
    })),
  )
}

export const getNodeDefinitionForNode = (
  definitions: WorkflowNodeDefRead[],
  node: WorkflowNodeRead | WorkflowNodeDataRead | null | undefined,
): WorkflowNodeDefRead | undefined => {
  const registryId = 'data' in (node ?? {}) ? (node as WorkflowNodeRead).data.registryId : (node as WorkflowNodeDataRead | undefined)?.registryId
  if (!registryId) {
    return undefined
  }
  return definitions.find(definition => definition.node.registryId === registryId || definition.node_uid === registryId)
}

export const findWorkflowNodeByRegistryId = (
  graph: WorkflowGraphRead,
  registryId: string,
): WorkflowNodeRead | undefined => {
  return graph.nodes.find(node => node.data.registryId === registryId)
}

export const isProtectedWorkflowNode = (node: WorkflowNodeRead): boolean => {
  return node.data.registryId === 'Start' || node.data.registryId === 'End'
}

const controlForParameterSchema = (schema: WorkflowParameterSchema): string => {
  if (Array.isArray(schema.enum) && schema.enum.length) {
    return 'select'
  }
  switch (schema.type) {
    case 'boolean':
      return 'switch'
    case 'number':
    case 'integer':
      return 'number'
    case 'object':
    case 'array':
      return 'workflow_json'
    default:
      return 'input'
  }
}

const defaultValueForSchema = (schema: WorkflowParameterSchema): unknown => {
  if (schema.default !== undefined) {
    return cloneJson(schema.default)
  }
  switch (schema.type) {
    case 'boolean':
      return false
    case 'number':
    case 'integer':
      return 0
    case 'array':
      return []
    case 'object':
      return {}
    default:
      return ''
  }
}

export const buildFormItemsFromParameterSchemas = (
  schemas: WorkflowParameterSchema[],
  prefix: string,
): FormItem[] => {
  return schemas.map((schema, index) => ({
    id: `${prefix}-${index}-${schema.name}`,
    type: 'form',
    control: controlForParameterSchema(schema),
    label: schema.label || schema.name,
    desc: schema.description,
    modelPath: schema.name,
    required: Boolean(schema.required),
    props: {
      placeholder: schema.description || schema.label || schema.name,
      options: Array.isArray(schema.enum)
        ? schema.enum.map((option: unknown) => ({ label: String(option), value: option }))
        : undefined,
      defaultValue: defaultValueForSchema(schema),
    },
    meta: {
      workflowSchema: schema,
    },
  }))
}

const flattenSchemaPaths = (
  schema: WorkflowParameterSchema,
  prefix = schema.name,
): Array<{ schema: WorkflowParameterSchema; path: string }> => {
  const current = [{ schema, path: prefix }]

  if (schema.type === 'object' && Array.isArray(schema.properties) && schema.properties.length) {
    return [
      ...current,
      ...schema.properties.flatMap((property: WorkflowParameterSchema) =>
        flattenSchemaPaths(property, `${prefix}.${property.name}`),
      ),
    ]
  }

  if (schema.type === 'array' && schema.items?.type === 'object' && Array.isArray(schema.items.properties) && schema.items.properties.length) {
    return [
      ...current,
      ...schema.items.properties.flatMap((property: WorkflowParameterSchema) =>
        flattenSchemaPaths(property, `${prefix}.${property.name}`),
      ),
    ]
  }

  return current
}

const buildTopLevelAncestors = (graph: WorkflowGraphRead, nodeId: string | null): Set<string> => {
  if (!nodeId) {
    return new Set(graph.nodes.map(node => node.id))
  }
  const parentMap = new Map<string, string[]>()
  graph.edges.forEach((edge) => {
    const current = parentMap.get(edge.targetNodeID) ?? []
    current.push(edge.sourceNodeID)
    parentMap.set(edge.targetNodeID, current)
  })

  const visited = new Set<string>()
  const stack = [...(parentMap.get(nodeId) ?? [])]
  while (stack.length) {
    const current = stack.pop()
    if (!current || visited.has(current)) {
      continue
    }
    visited.add(current)
    const parents = parentMap.get(current) ?? []
    stack.push(...parents)
  }
  return visited
}

const buildInternalAncestors = (
  nodes: WorkflowNodeRead[],
  edges: WorkflowGraphRead['edges'],
  nodeId: string,
): Set<string> => {
  const parentMap = new Map<string, string[]>()
  edges.forEach((edge) => {
    if (edge.targetNodeID === nodeId || nodes.some(node => node.id === edge.targetNodeID)) {
      const current = parentMap.get(edge.targetNodeID) ?? []
      current.push(edge.sourceNodeID)
      parentMap.set(edge.targetNodeID, current)
    }
  })

  const visited = new Set<string>()
  const stack = [...(parentMap.get(nodeId) ?? [])]
  while (stack.length) {
    const current = stack.pop()
    if (!current || visited.has(current)) {
      continue
    }
    visited.add(current)
    const parents = parentMap.get(current) ?? []
    stack.push(...parents)
  }
  return visited
}

const pushSchemaEntries = (
  entries: WorkflowVariableEntry[],
  nodeId: string,
  nodeName: string,
  category: WorkflowVariableEntry['category'],
  schemas: WorkflowParameterSchema[],
  source?: string,
): void => {
  schemas.forEach((schema) => {
    flattenSchemaPaths(schema).forEach((item) => {
      entries.push({
        key: `${nodeId}:${source || 'default'}:${item.path}`,
        nodeId,
        nodeName,
        category,
        schema: item.schema,
        path: item.path,
        refValue: {
          type: 'ref',
          content: {
            blockID: nodeId,
            path: item.path,
            ...(source ? { source } : {}),
          },
        },
      })
    })
  })
}

const buildLoopVariableSchemas = (loopNode: WorkflowNodeRead): WorkflowParameterSchema[] => {
  const loopConfig = (loopNode.data.config ?? {}) as Record<string, any>
  const loopList = (loopConfig.loopList ?? null) as WorkflowParameterSchema | null
  const schemas: WorkflowParameterSchema[] = [
    {
      name: 'index',
      type: 'integer',
      required: false,
      open: true,
      label: 'index',
      meta: {
        loopMutable: false,
      },
    },
    {
      name: 'item',
      type: loopList?.items?.type || 'string',
      required: false,
      open: true,
      label: 'item',
      meta: {
        loopMutable: false,
      },
    } as WorkflowParameterSchema,
    ...(loopNode.data.inputs ?? []).map((schema) => ({
      ...cloneJson(schema),
      meta: {
        ...(schema.meta ?? {}),
        loopMutable: true,
      },
    })),
  ]

  if (loopList?.name && !schemas.some(schema => schema.name === loopList.name)) {
    schemas.push({
      name: loopList.name,
      type: loopList.items?.type || 'string',
      required: false,
      open: true,
      label: loopList.name,
      items: loopList.items,
      properties: loopList.properties,
      meta: {
        loopMutable: false,
      },
    } as WorkflowParameterSchema)
  }

  return schemas
}

export const buildWorkflowVariableEntries = (
  graph: WorkflowGraphRead,
  selectedNodeId: string | null,
): WorkflowVariableEntry[] => {
  const entries: WorkflowVariableEntry[] = []
  const location = findWorkflowNodeLocation(graph, selectedNodeId)

  if (!location) {
    const allowedNodeIds = buildTopLevelAncestors(graph, selectedNodeId)
    graph.nodes.forEach((node) => {
      const includeNode = node.data.registryId === 'Start' || allowedNodeIds.has(node.id)
      if (!includeNode) {
        return
      }
      pushSchemaEntries(
        entries,
        node.id,
        node.data.name,
        node.data.registryId === 'Start' ? 'workflow-input' : 'node-output',
        node.data.outputs ?? [],
      )
    })
    return entries
  }

  if (location.parentLoopId) {
    const loopNode = findWorkflowNodeById(graph, location.parentLoopId)
    if (loopNode) {
      pushSchemaEntries(
        entries,
        loopNode.id,
        `${loopNode.data.name} · 循环变量`,
        'loop-variable',
        buildLoopVariableSchemas(loopNode),
      )

      const allowedNodeIds = buildInternalAncestors(
        loopNode.data.blocks ?? [],
        loopNode.data.edges ?? [],
        location.node.id,
      )

      ;(loopNode.data.blocks ?? []).forEach((node) => {
        if (node.id === location.node.id || !allowedNodeIds.has(node.id)) {
          return
        }
        pushSchemaEntries(entries, node.id, node.data.name, 'node-output', node.data.outputs ?? [])
      })
    }
    return entries
  }

  const allowedNodeIds = buildTopLevelAncestors(graph, selectedNodeId)
  graph.nodes.forEach((node) => {
    const includeNode = node.id !== selectedNodeId && (node.data.registryId === 'Start' || allowedNodeIds.has(node.id))
    if (!includeNode) {
      return
    }
    pushSchemaEntries(
      entries,
      node.id,
      node.data.name,
      node.data.registryId === 'Start' ? 'workflow-input' : 'node-output',
      node.data.outputs ?? [],
    )
  })

  if (location.node.data.registryId === 'Loop') {
    pushSchemaEntries(
      entries,
      location.node.id,
      `${location.node.data.name} · 循环变量`,
      'loop-variable',
      buildLoopVariableSchemas(location.node),
    )

    ;(location.node.data.blocks ?? []).forEach((block) => {
      pushSchemaEntries(
        entries,
        block.id,
        block.data.name,
        'node-output',
        block.data.outputs ?? [],
        'loop-block-output',
      )
    })
  }

  return entries
}

export const buildWorkflowVariableTree = (entries: WorkflowVariableEntry[]) => {
  type WorkflowVariableTreeNode = {
    id: string
    key: string
    name: string
    label: string
    blockID?: string
    path?: string
    source?: string
    schemaType?: WorkflowParameterSchema['type']
    selectable?: boolean
    children?: WorkflowVariableTreeNode[]
  }

  const nodeMap = new Map<string, {
    id: string
    key: string
    name: string
    label: string
    blockID: string
    selectable?: boolean
    children: WorkflowVariableTreeNode[]
  }>()

  const ensureChildNode = (
    siblings: WorkflowVariableTreeNode[],
    payload: WorkflowVariableTreeNode,
  ) => {
    const existing = siblings.find(item => item.key === payload.key)
    if (existing) {
      if (payload.path) existing.path = payload.path
      if (payload.blockID) existing.blockID = payload.blockID
      if (payload.source) existing.source = payload.source
      if (payload.schemaType) existing.schemaType = payload.schemaType
      if (payload.selectable === true || existing.selectable === undefined) {
        existing.selectable = payload.selectable
      }
      existing.children ??= []
      return existing
    }

    const next = {
      ...payload,
      children: [] as WorkflowVariableTreeNode[],
    }
    siblings.push(next)
    return next
  }

  const sortedEntries = entries
    .slice()
    .sort((left, right) => left.path.split('.').length - right.path.split('.').length)

  sortedEntries.forEach((entry) => {
    const group = nodeMap.get(entry.nodeId) ?? {
      id: entry.nodeId,
      key: entry.nodeId,
      name: entry.nodeName,
      label: entry.nodeName,
      blockID: entry.nodeId,
      selectable: false,
      children: [],
    }

    const segments = entry.path
      .split('.')
      .map(segment => segment.trim())
      .filter(Boolean)

    let cursor = group.children
    let currentPath = ''

    segments.forEach((segment, index) => {
      currentPath = currentPath ? `${currentPath}.${segment}` : segment
      const isLeaf = index === segments.length - 1
      const node = ensureChildNode(cursor, {
        id: `${entry.nodeId}:${currentPath}`,
        key: `${entry.nodeId}:${currentPath}`,
        name: segment,
        label: segment,
        ...(isLeaf
          ? {
              path: currentPath,
              blockID: entry.nodeId,
              source: entry.refValue.content.source,
              schemaType: entry.schema.type,
              selectable: true,
            }
          : {}),
      })
      cursor = node.children ?? []
    })

    nodeMap.set(entry.nodeId, group)
  })

  return Array.from(nodeMap.values()).map(group => ({
    id: group.id,
    key: group.key,
    name: group.name,
    label: group.label,
    blockID: group.blockID,
    selectable: false,
    children: group.children,
  }))
}
