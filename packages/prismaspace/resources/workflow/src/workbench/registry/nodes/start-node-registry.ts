import type { FormItem } from '@prismaspace/generator/form-generator'
import type { WorkflowNodeRegistry } from '../types'
import {
  createAccordionSection,
  createDefaultSingleOutputPort,
} from '../helpers'

const buildStartPanelSchema = (): FormItem[] => ([
  createAccordionSection({
    id: 'start-config',
    items: [
      {
        id: 'start-inputs',
        title: '工作流输入',
        description: 'Start 节点定义整个工作流的输入契约。',
        defaultOpen: true,
        children: [
          {
            id: 'start-inputs-editor',
            type: 'form',
            control: 'param-schema-editor',
            modelPath: 'nodeData.outputs',
            props: {
              runtimeMode: 'define',
              headerTitle: 'WORKFLOW INPUTS'
            },
          },
        ],
      },
    ],
  }),
])

export const startNodeRegistry: WorkflowNodeRegistry = {
  registryId: 'Start',
  panel: {
    buildSchema: () => buildStartPanelSchema(),
  },
  canvas: {
    width: 360,
    getInputPorts: () => [],
    getOutputPorts: (context) => createDefaultSingleOutputPort(
      context.node.data.outputs?.[0]?.label || context.node.data.outputs?.[0]?.name || '输出',
      context.node.data.outputs?.[0] ?? null,
    ),
    getSummaryLines: (context) => [
      {
        label: '输入变量',
        value: context.node.data.outputs?.length ? `${context.node.data.outputs.length} 项` : '未配置',
      },
    ],
  },
  faultTolerance: {
    visible: false,
  },
}
