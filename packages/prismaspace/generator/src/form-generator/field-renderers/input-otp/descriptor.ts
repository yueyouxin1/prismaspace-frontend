import type { FieldRendererDescriptor } from "../../types"
import { defineFieldDescriptor } from "../../descriptor-helpers"
import InputOtpField from "./InputOtpField.vue"

export const inputOtpFieldDescriptors: FieldRendererDescriptor[] = [
  defineFieldDescriptor({
    name: "input-otp",
    title: "Input OTP",
    description: "One-time password / verification code input based on shadcn Input OTP.",
    category: "verification",
    kind: "field",
    valueShape: "string",
    tags: ["otp", "verification", "security"],
    renderer: {
      component: InputOtpField,
      getProps: (ctx) => ({
        fieldProps: ctx.resolveDynamic(ctx.item.props ?? {}),
        options: ctx.options,
      }),
      transformInput: (value) => (value == null ? "" : String(value)),
      transformOutput: (value) => (value == null ? "" : String(value)),
    },
  }),
]
