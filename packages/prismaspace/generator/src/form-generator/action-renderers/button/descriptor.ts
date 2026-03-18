import type { ActionRendererDescriptor } from "../../types"
import { defineActionDescriptor } from "../../descriptor-helpers"
import DefaultActionButton from "./DefaultActionButton.vue"

export const buttonActionDescriptor: ActionRendererDescriptor = defineActionDescriptor({
  name: "button",
  title: "Button Action",
  description: "Standard button action component.",
  category: "action",
  kind: "action",
  tags: ["button", "action", "submit"],
  renderer: {
    component: DefaultActionButton,
    eventName: "click",
    getProps: (ctx) => ({
      label: ctx.item.label,
      disabled: ctx.evaluateExpr(ctx.item.state?.disabled, false) === true,
      actionProps: ctx.resolveDynamic(ctx.item.props ?? {}),
    }),
  },
})
