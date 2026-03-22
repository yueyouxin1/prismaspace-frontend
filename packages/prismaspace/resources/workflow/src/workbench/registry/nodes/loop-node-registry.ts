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
              defaultValue: 'count',
              options: [
                { label: '使用次数循环', value: 'count' },
                { label: '遍历数组循环', value: 'list' },
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
              valueRefTree,
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
        id: 'loop-outputs',
        title: '循环输出',
        description: '定义循环聚合后的对外输出。',
        defaultOpen: true,
        children: [
          {
            id: 'loop-outputs-editor',
            type: 'form',
            control: 'param-schema-editor',
            modelPath: 'nodeData.outputs',
            props: {
              runtimeMode: 'define',
              headerTitle: 'LOOP OUTPUTS',
              valueRefTree
            },
          },
        ],
      },
      {
        id: 'loop-subgraph',
        title: '循环体',
        description: '当前版本先使用 JSON 维护子流程 blocks/edges，后续再升级为嵌套画布编辑。',
        defaultOpen: false,
        children: [
          {
            id: 'loop-blocks',
            type: 'form',
            control: 'workflow_json',
            label: '子节点 blocks',
            modelPath: 'nodeData.blocks',
            props: {
              placeholder: '[\n  {\n    "id": "node_1"\n  }\n]',
            },
          },
          {
            id: 'loop-edges',
            type: 'form',
            control: 'workflow_json',
            label: '子连线 edges',
            modelPath: 'nodeData.edges',
            props: {
              placeholder: '[\n  {\n    "sourceNodeID": "loop"\n  }\n]',
            },
          },
        ],
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
    getSummaryLines: (context) => [
      {
        label: '循环类型',
        value: context.node.data.config?.loopType === 'list' ? '数组循环' : '次数循环',
      },
      {
        label: '执行模式',
        value: context.node.data.config?.executionMode === 'parallel' ? `并行 (${context.node.data.config?.maxConcurrency ?? 1})` : '串行',
      },
    ],
  },
  faultTolerance: {
    visible: true,
  },
}
