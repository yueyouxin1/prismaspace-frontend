import type { FieldRendererDescriptor } from "../../types"
import { defineFieldDescriptor } from "../../descriptor-helpers"
import TabsItemField from "./TabsItemField.vue"
import TabsRootField from "./TabsRootField.vue"

export const tabsFieldDescriptors: FieldRendererDescriptor[] = [
  defineFieldDescriptor({
    name: "tabs",
    title: "Tabs Root",
    description: "Tabs root container that teleports tab triggers from child tabs-item nodes.",
    category: "layout",
    kind: "layout",
    valueShape: "none",
    supportsChildren: true,
    tags: ["tabs", "layout", "container"],
    renderer: {
      component: TabsRootField,
      rendersChildrenInDefaultSlot: true,
      wrapDefaultSlotChildren: false,
      getProps: (ctx) => {
        const resolved = ctx.resolveDynamic(ctx.item.props ?? {})
        return {
          defaultValue: typeof resolved.defaultValue === "string" ? resolved.defaultValue : undefined,
          class: resolved.class,
          listClass: resolved.listClass,
        }
      },
      transformInput: (value) => (typeof value === "string" ? value : undefined),
      transformOutput: (value) => (typeof value === "string" ? value : undefined),
    },
  }),
  defineFieldDescriptor({
    name: "tabs-item",
    title: "Tabs Item",
    description: "Single tab item that renders a trigger into its nearest tabs root and owns the tab content.",
    category: "layout",
    kind: "layout",
    valueShape: "none",
    supportsChildren: true,
    tags: ["tabs", "layout", "item"],
    renderer: {
      component: TabsItemField,
      rendersChildrenInDefaultSlot: true,
      getProps: (ctx) => {
        const resolved = ctx.resolveDynamic(ctx.item.props ?? {})
        return {
          itemId: ctx.item.id,
          title: String(resolved.title ?? ctx.item.label ?? "Tab"),
          value: typeof resolved.value === "string" ? resolved.value : ctx.item.id,
          disabled: Boolean(resolved.disabled),
          class: resolved.class,
          triggerClass: resolved.triggerClass,
          contentClass: resolved.contentClass,
        }
      },
    },
  }),
]
