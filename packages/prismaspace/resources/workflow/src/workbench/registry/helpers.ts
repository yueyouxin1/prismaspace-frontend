import type { FormItem } from '@prismaspace/generator/form-generator'
import type {
  AnyInstanceRead,
  WorkflowNodeDataRead,
  WorkflowParameterSchema,
} from '@prismaspace/contracts'
import type {
  WorkflowNodeCanvasContext,
  WorkflowNodeCanvasSummaryLine,
  WorkflowNodePortDescriptor,
} from './types'

type AccordionSectionItemOptions = {
  id: string
  title: string
  description?: string
  defaultOpen?: boolean
  visible?: string | boolean
  children: FormItem[]
}

type AccordionSectionOptions = {
  id: string
  items: AccordionSectionItemOptions[]
}

const ACCORDION_SECTION_CLASS = ''
const ACCORDION_TRIGGER_CLASS = 'px-3'
const ACCORDION_CONTENT_CLASS = 'px-3'

export const createAccordionSection = (options: AccordionSectionOptions): FormItem => ({
  id: options.id,
  type: 'layout',
  control: 'accordion-root',
  props: {
    class: ACCORDION_SECTION_CLASS,
    type: 'multiple',
    collapsible: true,
    defaultValue: options.items
      .filter(item => item.defaultOpen !== false)
      .map(item => item.id),
  },
  children: options.items.map(item => ({
      id: `${item.id}-item`,
      type: 'layout',
      control: 'accordion-item',
      state: item.visible === undefined
        ? undefined
        : { visible: item.visible },
      props: {
        value: item.id,
        title: item.title,
        description: item.description ?? '',
        triggerClass: ACCORDION_TRIGGER_CLASS,
        contentClass: ACCORDION_CONTENT_CLASS,
      },
      children: item.children,
    })),
})

export const createDefaultPort = (
  id: string,
  label: string,
  schema?: WorkflowParameterSchema | null,
): WorkflowNodePortDescriptor => ({
  id,
  label,
  schema: schema ?? null,
})

export const createDefaultSingleInputPort = (
  label = '输入',
  schema?: WorkflowParameterSchema | null,
): WorkflowNodePortDescriptor[] => [createDefaultPort('0', label, schema)]

export const createDefaultSingleOutputPort = (
  label = '输出',
  schema?: WorkflowParameterSchema | null,
): WorkflowNodePortDescriptor[] => [createDefaultPort('0', label, schema)]

export const appendErrorPortIfNeeded = (
  nodeData: WorkflowNodeDataRead,
  ports: WorkflowNodePortDescriptor[],
): WorkflowNodePortDescriptor[] => {
  const executionPolicy = nodeData.config?.executionPolicy as Record<string, unknown> | undefined
  if (!executionPolicy || executionPolicy.switch !== true || Number(executionPolicy.processType) !== 3) {
    return ports
  }
  return [...ports, createDefaultPort('error', '异常分支')]
}

export const normalizeWorkflowSchemas = (value: unknown): WorkflowParameterSchema[] => {
  if (!Array.isArray(value)) {
    return []
  }
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      ...item,
      name: String(item.name ?? 'param'),
      type: String(item.type ?? 'string') as WorkflowParameterSchema['type'],
      required: Boolean(item.required),
      open: item.open === undefined ? true : Boolean(item.open),
    })) as WorkflowParameterSchema[]
}

export const getResourceInstanceUuid = (nodeData: WorkflowNodeDataRead): string | null => {
  const value = nodeData.config?.resource_instance_uuid
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export const buildBaseNodeSummaryLines = (
  context: WorkflowNodeCanvasContext,
): WorkflowNodeCanvasSummaryLine[] => {
  const { node } = context
  const inputCount = Array.isArray(node.data.inputs) ? node.data.inputs.length : 0
  const outputCount = Array.isArray(node.data.outputs) ? node.data.outputs.length : 0
  return [
    { label: '输入', value: inputCount ? `${inputCount} 项` : '默认' },
    { label: '输出', value: outputCount ? `${outputCount} 项` : '默认' },
  ]
}

export const buildResourceHydrationPatch = (
  instance: AnyInstanceRead,
  nodeData: WorkflowNodeDataRead,
): Partial<WorkflowNodeDataRead> => {
  const nextInputs = normalizeWorkflowSchemas((instance as Record<string, unknown>).inputs_schema)
  const nextOutputs = normalizeWorkflowSchemas((instance as Record<string, unknown>).outputs_schema)

  return {
    name: typeof instance.name === 'string' && instance.name ? instance.name : nodeData.name,
    description: typeof instance.description === 'string' ? instance.description : nodeData.description,
    inputs: nextInputs.length ? nextInputs : nodeData.inputs,
    outputs: nextOutputs.length ? nextOutputs : nodeData.outputs,
  }
}

export const createExecutionPolicyChildren = (prefix: string): FormItem[] => ([
  {
    id: `${prefix}-execution-enabled`,
    type: 'form',
    control: 'switch',
    label: '启用容错降级',
    modelPath: 'nodeData.config.executionPolicy.switch',
  },
  {
    id: `${prefix}-execution-timeout`,
    type: 'form',
    control: 'number',
    label: '整体执行超时 (ms)',
    modelPath: 'nodeData.config.executionPolicy.timeoutMs',
    state: {
      visible: '{{ model.nodeData.config.executionPolicy.switch === true }}',
    },
    props: {
      min: 1000,
      step: 1000,
      defaultValue: 180000,
    },
  },
  {
    id: `${prefix}-execution-retry`,
    type: 'form',
    control: 'number',
    label: '重试次数',
    modelPath: 'nodeData.config.executionPolicy.retryTimes',
    state: {
      visible: '{{ model.nodeData.config.executionPolicy.switch === true }}',
    },
    props: {
      min: 0,
      max: 5,
      step: 1,
      defaultValue: 0,
    },
  },
  {
    id: `${prefix}-execution-process`,
    type: 'form',
    control: 'select',
    label: '失败处理',
    modelPath: 'nodeData.config.executionPolicy.processType',
    state: {
      visible: '{{ model.nodeData.config.executionPolicy.switch === true }}',
    },
    props: {
      defaultValue: 1,
      options: [
        { label: '中断流程', value: 1 },
        { label: '返回降级内容', value: 2 },
        { label: '走异常分支', value: 3 },
      ],
    },
  },
  {
    id: `${prefix}-execution-data-on-err`,
    type: 'form',
    control: 'textarea',
    label: '降级返回内容',
    modelPath: 'nodeData.config.executionPolicy.dataOnErr',
    state: {
      visible: '{{ model.nodeData.config.executionPolicy.switch === true && model.nodeData.config.executionPolicy.processType === 2 }}',
    },
    props: {
      rows: 4,
      placeholder: '当节点失败时返回的默认值',
    },
  },
])
