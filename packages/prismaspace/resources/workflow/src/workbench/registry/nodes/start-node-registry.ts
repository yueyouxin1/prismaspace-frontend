import type { FormItem } from '@prismaspace/generator/form-generator'
import type { WorkflowNodeRegistry } from '../types'
import { createAccordionSection } from '../helpers'

const buildStartPanelSchema = (): FormItem[] => ([
  createAccordionSection({
    id: 'start-config',
    items: [
      {
        id: 'start-inputs',
        title: '输入',
        description: '',
        defaultOpen: true,
        children: [
          {
            id: 'start-inputs-editor',
            type: 'form',
            control: 'param-schema-editor',
            modelPath: 'nodeData.outputs',
            props: {
              runtimeMode: 'define',
              headerTitle: 'INPUTS'
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
  },
}
