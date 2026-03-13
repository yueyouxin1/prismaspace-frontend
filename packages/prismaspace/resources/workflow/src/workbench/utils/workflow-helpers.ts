import { nanoid } from 'nanoid'
import type {
  ResourceRead,
  ServiceModuleRead,
  WorkflowFormProperty,
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

export const buildWorkflowPaletteGroups = (definitions: WorkflowNodeDefRead[]): WorkflowPaletteGroup[] => {
  const groups = new Map<string, WorkflowNodeDefRead[]>()

  definitions.forEach((definition) => {
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

const normalizeExpr = (expr: string): string => {
  return expr
    .replace(/\bconfig\./g, 'model.config.')
    .replace(/\bconfig\b/g, 'model.config')
    .replace(/\binputs\./g, 'model.inputs.')
    .replace(/\binputs\b/g, 'model.inputs')
    .replace(/\boutputs\./g, 'model.outputs.')
    .replace(/\boutputs\b/g, 'model.outputs')
  }

const wrapExpr = (expr?: string | boolean): string | boolean | undefined => {
  if (expr === null || expr === undefined) {
    return undefined
  }
  if (typeof expr === 'boolean') {
    return expr
  }
  const trimmed = expr.trim()
  if (!trimmed) {
    return undefined
  }
  if (trimmed.startsWith('{{') && trimmed.endsWith('}}')) {
    return trimmed
  }
  return `{{ ${normalizeExpr(trimmed)} }}`
}

const normalizeControl = (formType: string): string => {
  switch (formType) {
    case 'radio_group':
      return 'radiogroup'
    case 'input_number':
      return 'number'
    case 'resource_selector':
      return 'resource_selector'
    case 'model_selector':
      return 'model_selector'
    case 'parameter_schema':
      return 'parameter_schema'
    default:
      return formType
  }
}

const normalizeRole = (item: WorkflowFormProperty): string | undefined => {
  return item.role ?? undefined
}

const normalizeState = (item: WorkflowFormProperty) => {
  const state = typeof item.state === 'object' && item.state ? item.state : {}
  return {
    visible: wrapExpr(state.visible as string | boolean | undefined) ?? true,
    disabled: wrapExpr(state.disabled as string | boolean | undefined) ?? false,
  }
}

const normalizeActionSpec = (item: WorkflowFormProperty) => {
  if (!item.on || typeof item.on !== 'object') {
    return undefined
  }

  const action = { ...item.on } as Record<string, unknown>
  if ('payload' in action) {
    action.payload = wrapExpr(action.payload as string | boolean | undefined) ?? action.payload
  }
  if ('params' in action) {
    action.params = wrapExpr(action.params as string | boolean | undefined) ?? action.params
  }
  if ('body' in action) {
    action.body = wrapExpr(action.body as string | boolean | undefined) ?? action.body
  }
  return action as any
}

export const buildGeneratorSchema = (forms: WorkflowFormProperty[]): FormItem[] => {
  const walk = (items: WorkflowFormProperty[], prefix = 'wf-form'): FormItem[] =>
    items.map((item, index) => {
      const id = item.id || `${prefix}-${index}-${item.model_path || item.label || item.control || item.action_type || 'item'}`
      if (item.type === 'action') {
        return {
          id,
          type: 'action',
          label: item.label,
          desc: item.desc ?? undefined,
          actionType: item.action_type || 'button',
          renderer: item.renderer,
          props: item.props ?? {},
          role: normalizeRole(item),
          ui: item.ui,
          meta: item.meta,
          state: {
            visible: normalizeState(item).visible,
            disabled: normalizeState(item).disabled,
          },
          on: normalizeActionSpec(item),
        }
      }

      const control = item.control
      if (!control) {
        throw new Error(`Workflow form item "${id}" is missing control`)
      }

      const modelPath = item.model_path
      if (!modelPath) {
        throw new Error(`Workflow form item "${id}" is missing model_path`)
      }

      return {
        id,
        type: 'form',
        control: normalizeControl(control),
        label: item.label,
        desc: item.desc ?? undefined,
        props: item.props ?? {},
        ui: item.ui,
        modelPath,
        required: wrapExpr(item.required as string | boolean | undefined) ?? false,
        state: {
          visible: normalizeState(item).visible,
          disabled: normalizeState(item).disabled,
        },
        role: normalizeRole(item),
        meta: item.meta,
        children: item.children?.length ? walk(item.children, id) : undefined,
      }
    })

  return walk(forms)
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
  if (schema.type === 'object' && Array.isArray(schema.properties) && schema.properties.length) {
    return schema.properties.flatMap((property: WorkflowParameterSchema) => flattenSchemaPaths(property, `${prefix}.${property.name}`))
  }
  if (schema.type === 'array' && schema.items) {
    return [{ schema, path: `${prefix}[]` }]
  }
  return [{ schema, path: prefix }]
}

const buildAncestors = (graph: WorkflowGraphRead, nodeId: string | null): Set<string> => {
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

export const buildWorkflowVariableEntries = (
  graph: WorkflowGraphRead,
  selectedNodeId: string | null,
): WorkflowVariableEntry[] => {
  const entries: WorkflowVariableEntry[] = []
  const allowedNodeIds = buildAncestors(graph, selectedNodeId)

  graph.nodes.forEach((node) => {
    const includeNode = node.id === selectedNodeId ? false : node.data.registryId === 'Start' || allowedNodeIds.has(node.id)
    if (!includeNode) {
      return
    }
    const category: WorkflowVariableEntry['category'] = node.data.registryId === 'Start' ? 'workflow-input' : 'node-output'
    const baseSchemas = node.data.registryId === 'Start' ? node.data.outputs ?? [] : node.data.outputs ?? []
    baseSchemas.forEach((schema) => {
      flattenSchemaPaths(schema).forEach((item) => {
        entries.push({
          key: `${node.id}:${item.path}`,
          nodeId: node.id,
          nodeName: node.data.name,
          category,
          schema: item.schema,
          path: item.path,
          refValue: {
            type: 'ref',
            content: {
              blockID: node.id,
              path: item.path,
            },
          },
        })
      })
    })
  })

  return entries
}

export const buildWorkflowVariableTree = (entries: WorkflowVariableEntry[]) => {
  const nodeMap = new Map<string, {
    id: string
    label: string
    blockID: string
    children: Array<{
      id: string
      label: string
      path: string
      blockID: string
      source?: string
    }>
  }>()

  entries.forEach((entry) => {
    const group = nodeMap.get(entry.nodeId) ?? {
      id: entry.nodeId,
      label: entry.nodeName,
      blockID: entry.nodeId,
      children: [],
    }
    group.children.push({
      id: entry.key,
      label: entry.path,
      path: entry.path,
      blockID: entry.nodeId,
      source: entry.refValue.content.source,
    })
    nodeMap.set(entry.nodeId, group)
  })

  return Array.from(nodeMap.values()).map(group => ({
    id: group.id,
    label: group.label,
    blockID: group.blockID,
    children: group.children,
  }))
}
