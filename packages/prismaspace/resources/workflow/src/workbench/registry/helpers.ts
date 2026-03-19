import type { FormItem } from '@prismaspace/generator/form-generator'

type AccordionSectionOptions = {
  id: string
  title: string
  description?: string
  defaultOpen?: boolean
  visible?: string | boolean
  children: FormItem[]
}

const ACCORDION_SECTION_CLASS = ''
const ACCORDION_TRIGGER_CLASS = 'px-2'
const ACCORDION_CONTENT_CLASS = ''

export const createAccordionSection = (options: AccordionSectionOptions): FormItem => ({
  id: options.id,
  type: 'layout',
  control: 'accordion',
  state: options.visible === undefined
    ? undefined
    : { visible: options.visible },
  props: {
    title: options.title,
    description: options.description ?? '',
    itemValue: options.id,
    defaultOpen: options.defaultOpen ?? true,
    class: ACCORDION_SECTION_CLASS,
    triggerClass: ACCORDION_TRIGGER_CLASS,
    contentClass: ACCORDION_CONTENT_CLASS,
  },
  children: options.children,
})
