import type { FormItem } from '@prismaspace/generator/form-generator'
import type { WorkflowNodeRegistry } from '../types'
import { createAccordionSection } from '../helpers'

const buildEndPanelSchema = (valueRefTree: unknown): FormItem[] => ([
  {
    id: "end-return-type",
    type: "layout",
    control: "tabs",
    modelPath: 'nodeData.config.returnType',
    props: {
      defaultValue: "Object",
    },
    children: [
      {
        id: "object-type",
        type: "layout",
        control: "tabs-item",
        props: {
          value: "Object",
          title: "结构化对象",
        }
      },
      {
        id: "text-type",
        type: "layout",
        control: "tabs-item",
        props: {
          value: "Text",
          title: "返回文本",
        }
      }
    ]
  },
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
