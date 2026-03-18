import type { Component } from "vue"
import type {
  Expr,
  FormActionItem,
  FormFieldItem,
  FormLayoutItem,
  FormItem,
} from "./types/form-schema"

export type FormModel = Record<string, any>
export type FormContext = Record<string, any>

export type FieldOption = {
  label?: string
  value: unknown
  disabled?: boolean
  [key: string]: unknown
}

export type ExpressionRuntimeScope = {
  ctx: FormContext
  context: FormContext
  model: FormModel
  formModel: FormModel
  item?: FormItem
  value?: unknown
  meta?: Record<string, unknown>
}

export type FieldResolveContext = {
  item: FormFieldItem | FormLayoutItem
  model: FormModel
  context: FormContext
  value: unknown
  errors: string[]
  invalid: boolean
  setValue: (next: unknown) => void
  options: FieldOption[]
  evaluateExpr: <T>(
    expr: Expr<T> | undefined,
    fallback?: T,
    overrides?: Partial<ExpressionRuntimeScope>,
  ) => T | undefined
  resolveDynamic: <T>(value: T, overrides?: Partial<ExpressionRuntimeScope>) => T
}

export type ActionResolveContext = {
  item: FormActionItem
  model: FormModel
  context: FormContext
  evaluateExpr: <T>(
    expr: Expr<T> | undefined,
    fallback?: T,
    overrides?: Partial<ExpressionRuntimeScope>,
  ) => T | undefined
  resolveDynamic: <T>(value: T, overrides?: Partial<ExpressionRuntimeScope>) => T
}

export type FieldRendererDefinition = {
  component: Component
  modelProp?: string
  modelEvent?: string
  rendersChildrenInDefaultSlot?: boolean
  getProps?: (ctx: FieldResolveContext) => Record<string, unknown>
  transformInput?: (value: unknown, ctx: FieldResolveContext) => unknown
  transformOutput?: (value: unknown, ctx: FieldResolveContext) => unknown
}

export type ActionRendererDefinition = {
  component: Component
  eventName?: string
  getProps?: (ctx: ActionResolveContext) => Record<string, unknown>
}

export type FormComponentKind = "field" | "layout" | "action"

export type FormComponentValueShape =
  | "string"
  | "number"
  | "boolean"
  | "array"
  | "object"
  | "none"
  | "unknown"

export type FormComponentCategory =
  | "text"
  | "number"
  | "boolean"
  | "selection"
  | "date"
  | "collection"
  | "verification"
  | "layout"
  | "action"
  | "advanced"
  | "misc"

export type FieldRendererDescriptor = {
  name: string
  title: string
  description: string
  category: Exclude<FormComponentCategory, "action">
  kind: Exclude<FormComponentKind, "action">
  valueShape: FormComponentValueShape
  supportsOptions?: boolean
  supportsChildren?: boolean
  tags?: string[]
  renderer: FieldRendererDefinition
}

export type ActionRendererDescriptor = {
  name: string
  title: string
  description: string
  category: "action"
  kind: "action"
  tags?: string[]
  renderer: ActionRendererDefinition
}

export type FieldComponentCatalogItem = Omit<FieldRendererDescriptor, "renderer">
export type ActionComponentCatalogItem = Omit<ActionRendererDescriptor, "renderer">
export type FormComponentCatalog = {
  fields: FieldComponentCatalogItem[]
  actions: ActionComponentCatalogItem[]
}

export type FieldRendererRecord = Record<string, FieldRendererDefinition>
export type ActionRendererRecord = Record<string, ActionRendererDefinition>

export type FieldDescriptorRecord = Record<string, FieldRendererDescriptor>
export type ActionDescriptorRecord = Record<string, ActionRendererDescriptor>

export type RegisterableFieldRenderers =
  | FieldRendererRecord
  | Map<string, FieldRendererDefinition>

export type RegisterableActionRenderers =
  | ActionRendererRecord
  | Map<string, ActionRendererDefinition>

export type RegisterableFieldDescriptors =
  | FieldRendererDescriptor[]
  | FieldDescriptorRecord
  | Map<string, FieldRendererDescriptor>

export type RegisterableActionDescriptors =
  | ActionRendererDescriptor[]
  | ActionDescriptorRecord
  | Map<string, ActionRendererDescriptor>

export type FormGeneratorActionEvent = {
  item: FormActionItem
  payload: unknown
}

export type FormValidationErrors = Record<string, string[]>

export type FormValidationResult = {
  valid: boolean
  errors: FormValidationErrors
}

export type FieldRegistrationMeta = Omit<FieldRendererDescriptor, "name" | "renderer">
export type ActionRegistrationMeta = Omit<ActionRendererDescriptor, "name" | "renderer">

export type RegisterFieldFn = {
  (descriptor: FieldRendererDescriptor): void
  (name: string, renderer: FieldRendererDefinition, meta: FieldRegistrationMeta): void
}

export type RegisterActionFn = {
  (descriptor: ActionRendererDescriptor): void
  (name: string, renderer: ActionRendererDefinition, meta: ActionRegistrationMeta): void
}

export type FormGeneratorExposed = {
  registerField: RegisterFieldFn
  unregisterField: (fieldType: string) => void
  registerAction: RegisterActionFn
  unregisterAction: (actionType: string) => void
  validate: () => Promise<FormValidationResult>
  validateField: (fieldId: string) => Promise<string[]>
  clearValidation: () => void
  getValidationErrors: () => FormValidationErrors
  getFieldDescriptor: (fieldType: string) => FieldComponentCatalogItem | undefined
  listFieldDescriptors: () => FieldComponentCatalogItem[]
  getActionDescriptor: (actionType: string) => ActionComponentCatalogItem | undefined
  listActionDescriptors: () => ActionComponentCatalogItem[]
  getComponentCatalog: () => FormComponentCatalog
}
