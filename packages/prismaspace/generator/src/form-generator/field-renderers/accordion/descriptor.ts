import type { FieldRendererDescriptor } from "../../types"
import { defineFieldDescriptor } from "../../descriptor-helpers"
import AccordionField from "./AccordionField.vue"
import AccordionItemField from "./AccordionItemField.vue"
import AccordionRootField from "./AccordionRootField.vue"

export const accordionFieldDescriptors: FieldRendererDescriptor[] = [
  defineFieldDescriptor({
    name: "accordion",
    title: "Accordion",
    description: "Single accordion container with one collapsible content area and optional teleported header actions.",
    category: "layout",
    kind: "layout",
    valueShape: "none",
    supportsChildren: true,
    tags: ["accordion", "layout", "container"],
    renderer: {
      component: AccordionField,
      rendersChildrenInDefaultSlot: true,
      getProps: (ctx) => {
        const resolved = ctx.resolveDynamic(ctx.item.props ?? {})
        return {
          title: String(resolved.title ?? ctx.item.label ?? "Accordion"),
          description: typeof resolved.description === "string" ? resolved.description : "",
          itemValue: typeof resolved.itemValue === "string" ? resolved.itemValue : ctx.item.id,
          defaultOpen: Boolean(resolved.defaultOpen),
          class: resolved.class,
          triggerClass: resolved.triggerClass,
          contentClass: resolved.contentClass,
        }
      },
      transformInput: (value) => Boolean(value),
      transformOutput: (value) => Boolean(value),
    },
  }),
  defineFieldDescriptor({
    name: "accordion-root",
    title: "Accordion Root",
    description: "Multi-item accordion root for composing several accordion-item layout children.",
    category: "layout",
    kind: "layout",
    valueShape: "none",
    supportsChildren: true,
    tags: ["accordion", "layout", "group"],
    renderer: {
      component: AccordionRootField,
      rendersChildrenInDefaultSlot: true,
      wrapDefaultSlotChildren: false,
      getProps: (ctx) => {
        const resolved = ctx.resolveDynamic(ctx.item.props ?? {})
        return {
          type: resolved.type === "single" ? "single" : "multiple",
          collapsible: resolved.collapsible !== false,
          defaultValue: resolved.defaultValue,
          class: resolved.class,
        }
      },
      transformInput: (value, ctx) => {
        const resolved = ctx.resolveDynamic(ctx.item.props ?? {})
        if (resolved.type === "single") {
          return typeof value === "string" ? value : undefined
        }
        return Array.isArray(value) ? value : []
      },
      transformOutput: (value, ctx) => {
        const resolved = ctx.resolveDynamic(ctx.item.props ?? {})
        if (resolved.type === "single") {
          return typeof value === "string" ? value : undefined
        }
        return Array.isArray(value) ? value : []
      },
    },
  }),
  defineFieldDescriptor({
    name: "accordion-item",
    title: "Accordion Item",
    description: "Accordion child item with teleported header action target and slotted content.",
    category: "layout",
    kind: "layout",
    valueShape: "none",
    supportsChildren: true,
    tags: ["accordion", "layout", "item"],
    renderer: {
      component: AccordionItemField,
      rendersChildrenInDefaultSlot: true,
      getProps: (ctx) => {
        const resolved = ctx.resolveDynamic(ctx.item.props ?? {})
        return {
          title: String(resolved.title ?? ctx.item.label ?? "Accordion Item"),
          description: typeof resolved.description === "string" ? resolved.description : "",
          value: typeof resolved.value === "string" ? resolved.value : ctx.item.id,
          class: resolved.class,
          triggerClass: resolved.triggerClass,
          contentClass: resolved.contentClass,
        }
      },
    },
  }),
]
