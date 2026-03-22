import type { FormItem } from '@prismaspace/generator/form-generator'
import type { WorkflowNodeRegistry } from '../types'
import {
  createAccordionSection,
  createDefaultSingleInputPort,
  createDefaultSingleOutputPort,
} from '../helpers'

const buildSetVariablePanelSchema = (): FormItem[] => ([
  createAccordionSection({
    id: 'set-variable-config',
    items: [
      {
        id: 'set-variable-assignments',
        title: '设置',
        description: '重置循环中间变量的值，使后续节点和后续循环使用新值。',
        defaultOpen: true,
        children: [
          {
            id: 'set-variable-assignments-editor',
            type: 'form',
            control: 'workflow_set_variable',
            modelPath: 'nodeData.config.assignments',
          },
        ],
      },
    ],
  }),
])

export const setVariableNodeRegistry: WorkflowNodeRegistry = {
  registryId: 'SetVariable',
  panel: {
    buildSchema: () => buildSetVariablePanelSchema(),
  },
  canvas: {
    width: 360,
    getInputPorts: () => createDefaultSingleInputPort('输入'),
    getOutputPorts: () => createDefaultSingleOutputPort('输出'),
    getSummaryLines: (context) => {
      const assignments = Array.isArray((context.node.data.config as Record<string, unknown>)?.assignments)
        ? ((context.node.data.config as Record<string, unknown>).assignments as unknown[])
        : []
      return [
        { label: '设置项', value: assignments.length ? `${assignments.length} 项` : '未配置' },
      ]
    },
    getResultPreview: (context) => {
      const runState = context.runState
      if (!runState?.outputPreview && !runState?.errorMessage) {
        return null
      }
      return {
        label: '写回结果',
        content: runState.errorMessage || runState.outputPreview || '',
        tone: runState.errorMessage ? 'danger' : 'success',
      }
    },
  },
  faultTolerance: {
    visible: false,
  },
}
