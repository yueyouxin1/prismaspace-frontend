import type { FormItem } from '@prismaspace/generator/form-generator'
import type { WorkflowNodeRegistry } from '../types'
import {
  createAccordionSection,
  createDefaultSingleInputPort,
  createDefaultSingleOutputPort,
} from '../helpers'

const buildInterruptPanelSchema = (): FormItem[] => ([
  createAccordionSection({
    id: 'interrupt-config',
    items: [
      {
        id: 'interrupt-basic',
        title: '中断配置',
        description: '人工确认节点会暂停当前 run，等待外部通过 resume token 恢复。',
        defaultOpen: true,
        children: [
          {
            id: 'interrupt-reason',
            type: 'form',
            control: 'input',
            label: '中断原因',
            modelPath: 'nodeData.config.reason',
            props: {
              placeholder: 'approval_required',
            },
          },
          {
            id: 'interrupt-message',
            type: 'form',
            control: 'textarea',
            label: '提示文案',
            modelPath: 'nodeData.config.message',
            props: {
              rows: 4,
              placeholder: '请输入需要用户确认的消息',
            },
          },
          {
            id: 'interrupt-resume-key',
            type: 'form',
            control: 'input',
            label: '恢复输出字段',
            modelPath: 'nodeData.config.resume_output_key',
            props: {
              placeholder: 'resume',
            },
          },
        ],
      },
      {
        id: 'interrupt-output',
        title: '恢复输出',
        description: '恢复后，外部提交的 payload 会写回到该输出字段。',
        defaultOpen: true,
        children: [
          {
            id: 'interrupt-outputs',
            type: 'form',
            control: 'param-schema-editor',
            modelPath: 'nodeData.outputs',
            props: {
              runtimeMode: 'define',
              headerTitle: 'RESUME OUTPUT'
            },
          },
        ],
      },
    ],
  }),
])

export const interruptNodeRegistry: WorkflowNodeRegistry = {
  registryId: 'Interrupt',
  panel: {
    buildSchema: () => buildInterruptPanelSchema(),
  },
  canvas: {
    width: 360,
    getInputPorts: (context) => createDefaultSingleInputPort('输入', context.node.data.inputs?.[0] ?? null),
    getOutputPorts: (context) => createDefaultSingleOutputPort(
      context.node.data.outputs?.[0]?.label || context.node.data.outputs?.[0]?.name || 'resume',
      context.node.data.outputs?.[0] ?? null,
    ),
    getSummaryLines: (context) => [
      {
        label: '中断原因',
        value: String(context.node.data.config?.reason || 'user_input_required'),
      },
      {
        label: '恢复字段',
        value: String(context.node.data.config?.resume_output_key || 'resume'),
      },
    ],
    getResultPreview: (context) => {
      const runState = context.runState
      if (!runState?.outputPreview && !runState?.errorMessage) {
        return null
      }
      return {
        label: runState.status === 'interrupted' ? '等待恢复' : '恢复结果',
        content: runState.errorMessage || runState.outputPreview || '',
        tone: runState.status === 'interrupted' ? 'warning' : 'success',
      }
    },
  },
  faultTolerance: {
    visible: false,
  },
}
