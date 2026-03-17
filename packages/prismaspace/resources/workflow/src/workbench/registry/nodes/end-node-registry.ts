import type { FormItem } from '@prismaspace/generator/form-generator'
import type { WorkflowNodeRegistry } from '../types'
import { createAccordionSection } from '../helpers'

const buildEndPanelSchema = (valueRefTree: unknown): FormItem[] => ([
  createAccordionSection({
    id: 'end-result-mode',
    title: '输出方式',
    description: '定义工作流返回结构或返回文本。',
    defaultOpen: true,
    children: [
      {
        id: 'end-return-type',
        type: 'form',
        control: 'radiogroup',
        label: '输出方式',
        modelPath: 'nodeData.config.returnType',
        required: true,
        props: {
          options: [
            { label: '结构化对象', value: 'Object' },
            { label: '返回文本', value: 'Text' },
          ],
        },
      },
      {
        id: 'end-stream-switch',
        type: 'form',
        control: 'switch',
        label: '流式输出',
        modelPath: 'nodeData.config.stream',
        state: {
          visible: "{{ model.nodeData.config.returnType === 'Text' }}",
        },
        props: {
          label: '启用流式输出',
        },
      },
    ],
  }),
  createAccordionSection({
    id: 'end-result-object',
    title: '输出变量',
    description: '',
    defaultOpen: true,
    visible: "{{ model.nodeData.config.returnType !== 'Text' }}",
    children: [
      {
        id: 'end-inputs-editor',
        type: 'form',
        control: 'param-schema-editor',
        modelPath: 'nodeData.inputs',
        props: {
          runtimeMode: 'refine',
          headerTitle: 'RETURN VARIABLES',
          valueRefTree
        },
      },
    ],
  }),
  createAccordionSection({
    id: 'end-result-text',
    title: '回答内容',
    description: '使用模板定义文本输出，可引用已配置的返回变量。',
    defaultOpen: true,
    visible: "{{ model.nodeData.config.returnType === 'Text' }}",
    children: [
      {
        id: 'end-content-template',
        type: 'form',
        control: 'textarea',
        label: '返回文本',
        modelPath: 'nodeData.config.content',
        props: {
          placeholder: '例如：工作流结果：\n{{result}}',
          class: 'min-h-[180px]',
        },
      },
    ],
  }),
])

export const endNodeRegistry: WorkflowNodeRegistry = {
  registryId: 'End',
  panel: {
    buildSchema: (context) => buildEndPanelSchema(context.valueRefTree),
  },
  canvas: {
    width: 360,
  },
}
