import type { FieldRendererDefinition, FieldRendererDescriptor } from "../../types"
import { defineFieldDescriptor } from "../../descriptor-helpers"
import InputField from "./InputField.vue"

const withInputType = (type: string): FieldRendererDefinition => ({
  component: InputField,
  getProps: (ctx) => ({
    fieldProps: {
      ...ctx.resolveDynamic(ctx.item.props ?? {}),
      type,
    },
    options: ctx.options,
  }),
})

export const textInputFieldDescriptors: FieldRendererDescriptor[] = [
  defineFieldDescriptor({
    name: "input",
    title: "Text Input",
    description: "Single-line text input based on shadcn Input.",
    category: "text",
    kind: "field",
    valueShape: "string",
    tags: ["input", "text", "string"],
    renderer: withInputType("text"),
  }),
  defineFieldDescriptor({
    name: "password",
    title: "Password Input",
    description: "Password field based on shadcn Input.",
    category: "text",
    kind: "field",
    valueShape: "string",
    tags: ["input", "password", "secret"],
    renderer: withInputType("password"),
  }),
  defineFieldDescriptor({
    name: "email",
    title: "Email Input",
    description: "Email field based on shadcn Input.",
    category: "text",
    kind: "field",
    valueShape: "string",
    tags: ["input", "email"],
    renderer: withInputType("email"),
  }),
  defineFieldDescriptor({
    name: "number",
    title: "Number Input",
    description: "Native number input based on shadcn Input.",
    category: "number",
    kind: "field",
    valueShape: "number",
    tags: ["input", "number"],
    renderer: withInputType("number"),
  }),
  defineFieldDescriptor({
    name: "date",
    title: "Date Input",
    description: "Date input based on shadcn Input.",
    category: "date",
    kind: "field",
    valueShape: "string",
    tags: ["date"],
    renderer: withInputType("date"),
  }),
  defineFieldDescriptor({
    name: "datetime",
    title: "Datetime Input",
    description: "Datetime-local input based on shadcn Input.",
    category: "date",
    kind: "field",
    valueShape: "string",
    tags: ["datetime"],
    renderer: withInputType("datetime-local"),
  }),
  defineFieldDescriptor({
    name: "time",
    title: "Time Input",
    description: "Time input based on shadcn Input.",
    category: "date",
    kind: "field",
    valueShape: "string",
    tags: ["time"],
    renderer: withInputType("time"),
  }),
]
