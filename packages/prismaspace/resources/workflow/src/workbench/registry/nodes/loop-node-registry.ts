import type { FormItem } from '@prismaspace/generator/form-generator'
import type { WorkflowNodeRegistry } from '../types'
import {
  appendErrorPortIfNeeded,
  createAccordionSection,
  createDefaultSingleInputPort,
  createDefaultSingleOutputPort,
  createExecutionPolicyChildren,
} from '../helpers'

const buildLoopPanelSchema = (valueRefTree: unknown): FormItem[] => ([
  createAccordionSection({
    id: 'loop-config',
    items: [
      {
        id: 'loop-runtime',
        title: '循环设置',
        description: '设置循环来源、串并行策略与最大并发。',
        defaultOpen: true,
        children: [
          {
            id: 'loop-type',
            type: 'form',
            control: 'select',
            label: '循环类型',
            modelPath: 'nodeData.config.loopType',
            props: {
              defaultValue: 'list',
              options: [
                { label: '使用数组循环', value: 'list' },
                { label: '指定循环次数', value: 'count' },
              ],
            },
          },
          {
            id: 'loop-count',
            type: 'form',
            control: 'parameter_schema',
            label: '循环次数',
            modelPath: 'nodeData.config.loopCount',
            state: {
              visible: "{{ model.nodeData.config.loopType !== 'list' }}",
            },
            props: {
              valueRefTree,
            },
          },
          {
            id: 'loop-list',
            type: 'form',
            control: 'parameter_schema',
            label: '循环数组',
            modelPath: 'nodeData.config.loopList',
            state: {
              visible: "{{ model.nodeData.config.loopType === 'list' }}",
            },
            props: {
              variableScope: 'loop-array-source',
              runtimeMode: 'refine',
              headerTitle: 'LOOP ARRAY',
              singleRoot: true,
              fieldVisibility: {
                refine: {
                  regularInline: {
                    name: true,
                    type: true,
                    required: false,
                    valueField: 'value',
                    actions: false,
                  },
                },
              },
            },
          },
          {
            id: 'loop-execution-mode',
            type: 'form',
            control: 'select',
            label: '执行模式',
            modelPath: 'nodeData.config.executionMode',
            props: {
              defaultValue: 'serial',
              options: [
                { label: '串行', value: 'serial' },
                { label: '并行', value: 'parallel' },
              ],
            },
          },
          {
            id: 'loop-max-concurrency',
            type: 'form',
            control: 'number',
            label: '最大并发',
            modelPath: 'nodeData.config.maxConcurrency',
            state: {
              visible: "{{ model.nodeData.config.executionMode === 'parallel' }}",
            },
            props: {
              min: 1,
              max: 32,
              step: 1,
              defaultValue: 1,
            },
          },
        ],
      },
      {
        id: 'loop-middle-variables',
        title: '中间变量',
        description: '定义循环过程中可被读取和重置的中间变量。',
        defaultOpen: true,
        children: [
          {
            id: 'loop-middle-variables-editor',
            type: 'form',
            control: 'param-schema-editor',
            modelPath: 'nodeData.inputs',
            props: {
              variableScope: 'loop-middle-variable',
              runtimeMode: 'refine',
              headerTitle: 'MIDDLE VARIABLES',
              class: 'h-[320px] min-h-0 rounded-[10px] border border-[#ececf4] bg-white',
              fieldVisibility: {
                refine: {
                  regularInline: {
                    name: true,
                    type: true,
                    required: false,
                    valueField: 'value',
                    actions: true,
                  },
                  regularDetail: {
                    default: false,
                    description: false,
                    label: false,
                    role: false,
                    enum: false,
                    meta: false,
                    open: false,
                    value: false,
                    arrayItemType: false,
                  },
                },
              },
            },
          },
        ],
      },
      {
        id: 'loop-outputs',
        title: '输出',
        description: '定义循环结束后对外输出的聚合结果。',
        defaultOpen: true,
        children: [
          {
            id: 'loop-outputs-editor',
            type: 'form',
            control: 'param-schema-editor',
            modelPath: 'nodeData.outputs',
            props: {
              variableScope: 'loop-output',
              runtimeMode: 'refine',
              headerTitle: 'LOOP OUTPUTS',
              class: 'h-[320px] min-h-0 rounded-[10px] border border-[#ececf4] bg-white',
              fieldVisibility: {
                refine: {
                  regularInline: {
                    name: true,
                    type: true,
                    required: false,
                    valueField: 'value',
                    actions: true,
                  },
                  regularDetail: {
                    default: false,
                    description: false,
                    label: false,
                    role: false,
                    enum: false,
                    meta: false,
                    open: false,
                    value: false,
                    arrayItemType: false,
                  },
                },
              },
            },
          },
        ],
      },
      {
        id: 'loop-body-note',
        title: '循环体',
        description: '循环体已经升级为真实子流程容器，请直接在画布中的循环体区域拖拽和连线。',
        defaultOpen: false,
        children: [],
      },
      {
        id: 'loop-fault-tolerance',
        title: '异常处理',
        description: '为循环节点配置超时、重试与降级策略。',
        defaultOpen: false,
        children: createExecutionPolicyChildren('loop'),
      },
    ],
  }),
])

export const loopNodeRegistry: WorkflowNodeRegistry = {
  registryId: 'Loop',
  panel: {
    buildSchema: (context) => buildLoopPanelSchema(context.valueRefTree),
  },
  canvas: {
    width: 360,
    getInputPorts: (context) => createDefaultSingleInputPort('输入', context.node.data.inputs?.[0] ?? null),
    getOutputPorts: (context) => appendErrorPortIfNeeded(
      context.node.data,
      createDefaultSingleOutputPort('输出', context.node.data.outputs?.[0] ?? null),
    ),
    getSummaryLines: (context) => {
      const config = (context.node.data.config ?? {}) as Record<string, any>
      const loopList = (config.loopList ?? null) as Record<string, any> | null
      const loopCount = (config.loopCount ?? null) as Record<string, any> | null
      return [
        {
          label: '输入',
          value: config.loopType === 'list'
            ? String(loopList?.name || '未配置')
            : String(loopCount?.name || 'count'),
        },
        {
          label: '中间变量',
          value: context.node.data.inputs?.length ? `${context.node.data.inputs.length} 项` : '无',
        },
        {
          label: '输出',
          value: context.node.data.outputs?.length ? `${context.node.data.outputs.length} 项` : '无',
        },
      ]
    },
  },
  faultTolerance: {
    visible: true,
  },
}
