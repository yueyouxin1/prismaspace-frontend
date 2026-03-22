import type { FormItem } from '@prismaspace/generator/form-generator'
import type { WorkflowNodeRegistry } from '../types'
import {
  createAccordionSection,
  createDefaultSingleInputPort,
  createDefaultSingleOutputPort,
} from '../helpers'

const buildOutputPanelSchema = (valueRefTree: unknown): FormItem[] => ([
  {
    id: 'output-return-type',
    type: 'form',
    control: 'tabs',
    modelPath: 'nodeData.config.returnType',
    props: {
      defaultValue: 'Object',
      class: 'border-b px-2 pt-2',
    },
    children: [
      {
        id: 'output-return-object',
        type: 'layout',
        control: 'tabs-item',
        props: {
          value: 'Object',
          title: '结构化输出',
        },
      },
      {
        id: 'output-return-text',
        type: 'layout',
        control: 'tabs-item',
        props: {
          value: 'Text',
          title: '文本输出',
        },
      },
    ],
  },
  createAccordionSection({
    id: 'output-config',
    items: [
      {
        id: 'output-inputs',
        title: '输出内容',
        description: '中间输出节点会把这里解析后的结果写入运行日志和节点预览。',
        defaultOpen: true,
        children: [
          {
            id: 'output-inputs-editor',
            type: 'form',
            control: 'param-schema-editor',
            modelPath: 'nodeData.inputs',
            props: {
              runtimeMode: 'refine',
              headerTitle: 'OUTPUT PAYLOAD',
              valueRefTree
            },
          },
          {
            id: 'output-content-template',
            type: 'form',
            control: 'textarea',
            label: '文本模板',
            modelPath: 'nodeData.config.content',
            state: {
              visible: "{{ model.nodeData.config.returnType === 'Text' }}",
            },
            props: {
              rows: 5,
              placeholder: '例如：处理中：{{summary}}',
            },
          },
        ],
      },
    ],
  }),
])

export const outputNodeRegistry: WorkflowNodeRegistry = {
  registryId: 'Output',
  panel: {
    buildSchema: (context) => buildOutputPanelSchema(context.valueRefTree),
  },
  canvas: {
    width: 360,
    getInputPorts: (context) => createDefaultSingleInputPort(
      context.node.data.inputs?.[0]?.label || context.node.data.inputs?.[0]?.name || '输入',
      context.node.data.inputs?.[0] ?? null,
    ),
    getOutputPorts: (context) => createDefaultSingleOutputPort(
      context.node.data.outputs?.[0]?.label || context.node.data.outputs?.[0]?.name || '输出',
      context.node.data.outputs?.[0] ?? null,
    ),
    getSummaryLines: (context) => [
      {
        label: '输出模式',
        value: context.node.data.config?.returnType === 'Text' ? '文本' : '对象',
      },
      {
        label: '字段数',
        value: context.node.data.inputs?.length ? `${context.node.data.inputs.length} 项` : '未配置',
      },
    ],
    getResultPreview: (context) => {
      const runState = context.runState
      if (!runState?.outputPreview && !runState?.streamPreview && !runState?.errorMessage) {
        return null
      }
      if (runState.errorMessage) {
        return {
          label: '输出',
          content: runState.errorMessage,
          tone: 'danger',
        }
      }
      return {
        label: '输出',
        content: runState.streamPreview || runState.outputPreview || '',
        tone: 'success',
      }
    },
  },
  faultTolerance: {
    visible: false,
  },
}
