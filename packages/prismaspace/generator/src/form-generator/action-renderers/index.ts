import type { ActionRendererDescriptor } from "../types"
import DefaultActionButton from "./button/DefaultActionButton.vue"
import { buttonActionDescriptor } from "./button/descriptor"

export { DefaultActionButton, buttonActionDescriptor }

export const builtInActionDescriptors: ActionRendererDescriptor[] = [
  buttonActionDescriptor,
]
