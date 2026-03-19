import type { FormItem } from '@prismaspace/generator/form-generator'

type AccordionSectionItemOptions = {
  id: string
  title: string
  description?: string
  defaultOpen?: boolean
  visible?: string | boolean
  children: FormItem[]
}

type AccordionSectionOptions = {
  id: string
  items: AccordionSectionItemOptions[]
}

const ACCORDION_SECTION_CLASS = ''
const ACCORDION_TRIGGER_CLASS = 'px-2'
const ACCORDION_CONTENT_CLASS = ''

export const createAccordionSection = (options: AccordionSectionOptions): FormItem => ({
  id: options.id,
  type: 'layout',
  control: 'accordion-root',
  props: {
    class: ACCORDION_SECTION_CLASS,
    type: 'multiple',
    collapsible: true,
    defaultValue: options.items
      .filter(item => item.defaultOpen !== false)
      .map(item => item.id),
  },
  children: options.items.map(item => ({
      id: `${item.id}-item`,
      type: 'layout',
      control: 'accordion-item',
      state: item.visible === undefined
        ? undefined
        : { visible: item.visible },
      props: {
        value: item.id,
        title: item.title,
        description: item.description ?? '',
        triggerClass: ACCORDION_TRIGGER_CLASS,
        contentClass: ACCORDION_CONTENT_CLASS,
      },
      children: item.children,
    })),
})
