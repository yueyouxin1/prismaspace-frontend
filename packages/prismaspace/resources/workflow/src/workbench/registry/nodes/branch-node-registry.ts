import type { FormItem } from '@prismaspace/generator/form-generator'
import type { WorkflowNodeRegistry } from '../types'
import {
  createAccordionSection,
  createDefaultSingleInputPort,
  createDefaultPort,
} from '../helpers'

const buildBranchPanelSchema = (): FormItem[] => ([
  createAccordionSection({
    id: 'branch-config',
    items: [
      {
        id: 'branch-groups',
        title: '条件分支',
        description: '分支按优先级顺序命中，全部不命中时会进入否则端口。',
        defaultOpen: true,
        children: [
          {
            id: 'branch-groups-editor',
            type: 'form',
            control: 'workflow_branches',
            modelPath: 'nodeData.config.branchs',
          },
        ],
      },
    ],
  }),
])

export const branchNodeRegistry: WorkflowNodeRegistry = {
  registryId: 'Branch',
  panel: {
    buildSchema: () => buildBranchPanelSchema(),
  },
  canvas: {
    width: 360,
    getInputPorts: (context) => createDefaultSingleInputPort(
      context.node.data.inputs?.[0]?.label || '输入',
      context.node.data.inputs?.[0] ?? null,
    ),
    getOutputPorts: (context) => {
      const branchs = Array.isArray(context.node.data.config?.branchs)
        ? context.node.data.config.branchs
        : []
      const dynamicPorts = branchs.map((branch, index) => createDefaultPort(
        String(index),
        `分支 ${index + 1}`,
        null,
      ))
      return [...dynamicPorts, createDefaultPort('-1', '否则')]
    },
    getSummaryLines: (context) => {
      const branchs = Array.isArray(context.node.data.config?.branchs)
        ? context.node.data.config.branchs
        : []
      return [
        { label: '条件分支', value: branchs.length ? `${branchs.length} 个` : '未配置' },
        { label: '默认出口', value: '否则' },
      ]
    },
  },
  faultTolerance: {
    visible: false,
  },
}
