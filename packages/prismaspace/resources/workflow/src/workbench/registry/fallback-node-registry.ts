import type { FormItem } from '@prismaspace/generator/form-generator'
import type { WorkflowNodeRegistryContext } from './types'
import { createAccordionSection } from './helpers'

export const buildFallbackNodePanelSchema = (
  context: WorkflowNodeRegistryContext,
): FormItem[] => ([
  createAccordionSection({
    id: 'fallback-config',
    items: [
      {
        id: 'node-basic',
        title: '基础信息',
        description: '编辑节点的基础元信息。',
        defaultOpen: true,
        children: [
          {
            id: `${context.selectedNode.id}-name`,
            type: 'form',
            control: 'input',
            label: '节点名称',
            modelPath: 'nodeData.name',
            props: {
              placeholder: '输入节点名称',
            },
          },
          {
            id: `${context.selectedNode.id}-description`,
            type: 'form',
            control: 'textarea',
            label: '节点描述',
            modelPath: 'nodeData.description',
            props: {
              placeholder: '输入节点描述',
              class: 'min-h-[96px]',
            },
          },
        ],
      },
      {
        id: 'node-config',
        title: '配置',
        description: '直接编辑当前节点的配置对象。',
        defaultOpen: true,
        children: [
          {
            id: `${context.selectedNode.id}-config`,
            type: 'form',
            control: 'workflow_json',
            label: '配置 JSON',
            modelPath: 'nodeData.config',
            props: {
              placeholder: '{\n  "key": "value"\n}',
            },
          },
        ],
      },
      {
        id: 'node-inputs',
        title: '输入 Schema',
        description: '定义当前节点的输入参数结构。',
        defaultOpen: false,
        children: [
          {
            id: `${context.selectedNode.id}-inputs`,
            type: 'form',
            control: 'param-schema-editor',
            modelPath: 'nodeData.inputs',
            props: {
              runtimeMode: 'define',
              headerTitle: 'INPUTS'
            },
          },
        ],
      },
      {
        id: 'node-outputs',
        title: '输出 Schema',
        description: '定义当前节点的输出参数结构。',
        defaultOpen: false,
        children: [
          {
            id: `${context.selectedNode.id}-outputs`,
            type: 'form',
            control: 'param-schema-editor',
            modelPath: 'nodeData.outputs',
            props: {
              runtimeMode: 'define',
              headerTitle: 'OUTPUTS',
              valueRefTree: context.valueRefTree
            },
          },
        ],
      },
    ],
  }),
])
