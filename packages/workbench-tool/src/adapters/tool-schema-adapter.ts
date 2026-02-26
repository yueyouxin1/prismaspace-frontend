import type { ParameterSchema, SchemaBlueprint, SchemaType } from '@repo/editor'
import type { ToolHttpMethod, ToolInstanceDraft, ToolRunField } from '../types/tool-ide'

const TOOL_METHODS: ToolHttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
const SCHEMA_TYPES: SchemaType[] = ['string', 'number', 'integer', 'boolean', 'object', 'array']

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const readString = (value: unknown): string => {
  return typeof value === 'string' ? value : ''
}

const normalizeSchemaType = (value: unknown): SchemaType => {
  const normalized = readString(value)
  if (SCHEMA_TYPES.includes(normalized as SchemaType)) {
    return normalized as SchemaType
  }
  return 'string'
}

const normalizeBlueprint = (value: unknown): SchemaBlueprint | undefined => {
  if (!isRecord(value)) {
    return undefined
  }

  const type = normalizeSchemaType(value.type)
  const blueprint: SchemaBlueprint = {
    type,
    description: readString(value.description) || undefined,
    enum: Array.isArray(value.enum) ? value.enum : undefined,
    default: value.default,
  }

  if (typeof value.uid === 'number') {
    blueprint.uid = value.uid
  }

  if (type === 'object') {
    blueprint.properties = normalizeParameterSchemaList(value.properties)
  }

  if (type === 'array') {
    blueprint.items = normalizeBlueprint(value.items)
  }

  return blueprint
}

const normalizeParameter = (value: unknown, index: number): ParameterSchema => {
  const source = isRecord(value) ? value : {}
  const type = normalizeSchemaType(source.type)
  const fallbackName = `param_${index + 1}`
  const required = typeof source.required === 'boolean' ? source.required : false
  const open = typeof source.open === 'boolean' ? source.open : true
  const name = readString(source.name) || fallbackName

  const rawValue = isRecord(source.value) ? source.value : null
  let normalizedValue: ParameterSchema['value'] | undefined
  if (rawValue && rawValue.type === 'literal' && 'content' in rawValue) {
    normalizedValue = {
      type: 'literal',
      content: rawValue.content,
    }
  } else if (rawValue && rawValue.type === 'expr' && typeof rawValue.content === 'string') {
    normalizedValue = {
      type: 'expr',
      content: rawValue.content,
    }
  } else if (rawValue && rawValue.type === 'ref' && isRecord(rawValue.content)) {
    const content = rawValue.content
    const blockID = readString(content.blockID)
    const path = readString(content.path)
    if (blockID && path) {
      normalizedValue = {
        type: 'ref',
        content: {
          blockID,
          path,
          source: readString(content.source) || undefined,
        },
      }
    }
  }

  const normalized: ParameterSchema = {
    name,
    type,
    required,
    open,
    role: readString(source.role) || undefined,
    label: readString(source.label) || undefined,
    description: readString(source.description) || undefined,
    enum: Array.isArray(source.enum) ? source.enum : undefined,
    default: source.default,
    value: normalizedValue,
    meta: isRecord(source.meta) ? source.meta : undefined,
  }

  if (typeof source.uid === 'number') {
    normalized.uid = source.uid
  }

  if (type === 'object') {
    normalized.properties = normalizeParameterSchemaList(source.properties)
  }

  if (type === 'array') {
    normalized.items = normalizeBlueprint(source.items)
  }

  return normalized
}

export const normalizeParameterSchemaList = (value: unknown): ParameterSchema[] => {
  if (!Array.isArray(value)) {
    return []
  }
  return value.map((item, index) => normalizeParameter(item, index))
}

export const normalizeToolMethod = (value: unknown): ToolHttpMethod => {
  const method = readString(value).toUpperCase()
  if (TOOL_METHODS.includes(method as ToolHttpMethod)) {
    return method as ToolHttpMethod
  }
  return 'GET'
}

export const normalizeToolUrl = (value: unknown): string => {
  return readString(value).trim()
}

export const toToolInstanceDraft = (value: unknown): ToolInstanceDraft => {
  const source = isRecord(value) ? value : {}
  return {
    uuid: readString(source.uuid) || null,
    url: normalizeToolUrl(source.url),
    method: normalizeToolMethod(source.method),
    inputsSchema: normalizeParameterSchemaList(source.inputs_schema),
    outputsSchema: normalizeParameterSchemaList(source.outputs_schema),
  }
}

const resolveDefaultValue = (parameter: ParameterSchema): unknown => {
  if (parameter.value?.type === 'literal') {
    return parameter.value.content
  }
  if (parameter.default !== undefined) {
    return parameter.default
  }

  if (parameter.type === 'array') {
    return []
  }
  if (parameter.type === 'object') {
    return {}
  }
  if (parameter.type === 'boolean') {
    return false
  }
  return ''
}

export const extractToolRunFields = (parameters: ParameterSchema[]): ToolRunField[] => {
  return parameters.map((parameter) => ({
    name: parameter.name,
    type: parameter.type,
    required: parameter.required,
    description: parameter.description,
    role: parameter.role,
    defaultValue: resolveDefaultValue(parameter),
  }))
}

const toJsonInputText = (value: unknown): string => {
  if (value === undefined) {
    return ''
  }
  if (typeof value === 'string') {
    return value
  }
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return ''
  }
}

export const createToolRunDefaults = (fields: ToolRunField[]): Record<string, unknown> => {
  return fields.reduce<Record<string, unknown>>((acc, field) => {
    if (field.type === 'object' || field.type === 'array') {
      acc[field.name] = toJsonInputText(field.defaultValue)
      return acc
    }
    acc[field.name] = field.defaultValue
    return acc
  }, {})
}
