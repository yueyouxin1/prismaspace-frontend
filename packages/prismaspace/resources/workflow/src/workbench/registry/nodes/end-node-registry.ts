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
      class: "border-b pt-2 px-2",
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
    id: 'end-config',
    items: [
      {
        id: 'end-result-object',
        title: '输出变量',
        description: '',
        defaultOpen: true,
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
      },
      {
        id: 'end-result-text',
        title: '回答内容',
        description: '',
        defaultOpen: true,
        visible: "{{ model.nodeData.config.returnType === 'Text' }}",
        children: [
          {
            id: 'end-content-template',
            type: 'form',
            control: 'textarea',
            modelPath: 'nodeData.config.content',
            props: {
              placeholder: '例如：工作流结果：\n{{result}}'
            },
          },
        ],
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
