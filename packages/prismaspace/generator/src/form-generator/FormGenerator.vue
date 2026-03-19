<script setup lang="ts">
import { computed, reactive, ref, shallowReactive, watch } from "vue"
import { FieldGroup } from "@prismaspace/ui-shadcn/components/ui/field"
import type {
  ActionRendererDescriptor,
  ActionRendererDefinition,
  FieldRendererDefinition,
  FieldRendererDescriptor,
  FieldRegistrationMeta,
  FormContext,
  FormComponentCatalog,
  FormGeneratorActionEvent,
  FormGeneratorExposed,
  FormModel,
  FormValidationErrors,
  FormValidationResult,
  RegisterableActionDescriptors,
  RegisterableActionRenderers,
  RegisterableFieldDescriptors,
  RegisterableFieldRenderers,
  ActionRegistrationMeta,
} from "./types"
import type { FormActionItem, FormFieldItem, FormItem } from "./types/form-schema"
import {
  createActionDescriptorRegistry,
  createActionRendererRegistry,
  createFieldDescriptorRegistry,
  createFieldRendererRegistry,
  getActionDescriptor,
  getFieldDescriptor,
  listActionDescriptors,
  listFieldDescriptors,
} from "./component-registry"
import { FormItemRenderer } from "./field-renderers"
import { collectFormFieldItems, normalizeFormItems, validateFormField } from "./utils"

const props = withDefaults(defineProps<{
  schema: FormItem[]
  modelValue?: FormModel
  context?: FormContext
  fieldDescriptors?: RegisterableFieldDescriptors
  fieldRenderers?: RegisterableFieldRenderers
  actionDescriptors?: RegisterableActionDescriptors
  actionRenderers?: RegisterableActionRenderers
}>(), {
  context: () => ({}),
})

const emit = defineEmits<{
  (event: "update:modelValue", payload: FormModel): void
  (event: "action", payload: FormGeneratorActionEvent): void
  (event: "error", payload: Error): void
  (event: string, payload?: unknown): void
}>()

const localModel = reactive<FormModel>({})
const localFieldDescriptors = shallowReactive(new Map<string, FieldRendererDescriptor>())
const localActionDescriptors = shallowReactive(new Map<string, ActionRendererDescriptor>())
const validationErrors = reactive<FormValidationErrors>({})
const touchedFields = reactive<Record<string, boolean>>({})
const validationRunTokens = reactive<Record<string, number>>({})
const validationSubmitted = ref(false)

const runtimeModel = computed<FormModel>(() => props.modelValue ?? localModel)

const normalizedSchema = computed<FormItem[]>(() => {
  try {
    return normalizeFormItems(props.schema ?? [])
  } catch (error) {
    emit("error", error as Error)
    return []
  }
})

function toFieldDescriptorRecord(input?: RegisterableFieldDescriptors): Record<string, FieldRendererDescriptor> {
  if (!input) {
    return {}
  }

  if (Array.isArray(input)) {
    return Object.fromEntries(input.map((descriptor) => [descriptor.name, descriptor]))
  }

  if (input instanceof Map) {
    return Object.fromEntries(input.entries())
  }

  return { ...input }
}

function toActionDescriptorRecord(input?: RegisterableActionDescriptors): Record<string, ActionRendererDescriptor> {
  if (!input) {
    return {}
  }

  if (Array.isArray(input)) {
    return Object.fromEntries(input.map((descriptor) => [descriptor.name, descriptor]))
  }

  if (input instanceof Map) {
    return Object.fromEntries(input.entries())
  }

  return { ...input }
}

function toFieldRendererRecord(input?: RegisterableFieldRenderers): Record<string, FieldRendererDefinition> {
  if (!input) {
    return {}
  }

  if (input instanceof Map) {
    return Object.fromEntries(input.entries())
  }

  return { ...input }
}

function toActionRendererRecord(input?: RegisterableActionRenderers): Record<string, ActionRendererDefinition> {
  if (!input) {
    return {}
  }

  if (input instanceof Map) {
    return Object.fromEntries(input.entries())
  }

  return { ...input }
}

const mergedFieldDescriptors = computed<Record<string, FieldRendererDescriptor>>(() => ({
  ...toFieldDescriptorRecord(props.fieldDescriptors),
  ...Object.fromEntries(localFieldDescriptors.entries()),
}))

const mergedFieldRenderers = computed<Record<string, FieldRendererDefinition>>(() => ({
  ...toFieldRendererRecord(props.fieldRenderers),
}))

const fieldDescriptorRegistry = computed(() => {
  return createFieldDescriptorRegistry(
    mergedFieldDescriptors.value,
    mergedFieldRenderers.value,
  )
})

const fieldRegistry = computed(() => {
  return createFieldRendererRegistry(
    mergedFieldRenderers.value,
    mergedFieldDescriptors.value,
  )
})

const mergedActionDescriptors = computed<Record<string, ActionRendererDescriptor>>(() => ({
  ...toActionDescriptorRecord(props.actionDescriptors),
  ...Object.fromEntries(localActionDescriptors.entries()),
}))

const mergedActionRenderers = computed<Record<string, ActionRendererDefinition>>(() => ({
  ...toActionRendererRecord(props.actionRenderers),
}))

const actionDescriptorRegistry = computed(() => {
  return createActionDescriptorRegistry(
    mergedActionDescriptors.value,
    mergedActionRenderers.value,
  )
})

const actionRegistry = computed(() => {
  return createActionRendererRegistry(
    mergedActionRenderers.value,
    mergedActionDescriptors.value,
  )
})

function createFieldDescriptor(name: string, renderer: FieldRendererDefinition, meta: FieldRegistrationMeta): FieldRendererDescriptor {
  return {
    name,
    renderer,
    ...meta,
  }
}

function createActionDescriptor(name: string, renderer: ActionRendererDefinition, meta: ActionRegistrationMeta): ActionRendererDescriptor {
  return {
    name,
    renderer,
    ...meta,
  }
}

function registerField(
  descriptorOrName: FieldRendererDescriptor | string,
  renderer?: FieldRendererDefinition,
  meta?: FieldRegistrationMeta,
): void {
  const descriptor = typeof descriptorOrName === "string"
    ? (renderer && meta ? createFieldDescriptor(descriptorOrName, renderer, meta) : undefined)
    : descriptorOrName

  if (!descriptor) {
    throw new Error("registerField 需要传入 descriptor，或传入 name + renderer + meta。")
  }

  localFieldDescriptors.set(descriptor.name.trim().toLowerCase(), descriptor)
}

function unregisterField(fieldType: string): void {
  const normalized = fieldType.trim().toLowerCase()
  localFieldDescriptors.delete(normalized)
}

function registerAction(
  descriptorOrName: ActionRendererDescriptor | string,
  renderer?: ActionRendererDefinition,
  meta?: ActionRegistrationMeta,
): void {
  const descriptor = typeof descriptorOrName === "string"
    ? (renderer && meta ? createActionDescriptor(descriptorOrName, renderer, meta) : undefined)
    : descriptorOrName

  if (!descriptor) {
    throw new Error("registerAction 需要传入 descriptor，或传入 name + renderer + meta。")
  }

  localActionDescriptors.set(descriptor.name.trim().toLowerCase(), descriptor)
}

function unregisterAction(actionType: string): void {
  const normalized = actionType.trim().toLowerCase()
  localActionDescriptors.delete(normalized)
}

function syncValidationErrors(fieldId: string, errors: string[]): void {
  if (errors.length > 0) {
    validationErrors[fieldId] = [...errors]
    return
  }

  delete validationErrors[fieldId]
}

function snapshotValidationErrors(): FormValidationErrors {
  return Object.fromEntries(
    Object.entries(validationErrors).map(([fieldId, errors]) => [fieldId, [...errors]]),
  )
}

function getFieldItems(): FormFieldItem[] {
  return collectFormFieldItems(normalizedSchema.value)
}

function getFieldItemById(fieldId: string): FormFieldItem | undefined {
  return getFieldItems().find((item) => item.id === fieldId)
}

async function validateFieldItem(
  item: FormFieldItem,
  options?: { markTouched?: boolean },
): Promise<string[]> {
  if (options?.markTouched) {
    touchedFields[item.id] = true
  }

  const nextToken = (validationRunTokens[item.id] ?? 0) + 1
  validationRunTokens[item.id] = nextToken

  const nextErrors = await validateFormField(item, runtimeModel.value, props.context)

  if (validationRunTokens[item.id] !== nextToken) {
    return validationErrors[item.id] ?? []
  }

  syncValidationErrors(item.id, nextErrors)
  return nextErrors
}

async function revalidateTrackedFields(changedField?: FormFieldItem): Promise<void> {
  const fieldMap = new Map(getFieldItems().map((item) => [item.id, item] as const))
  const trackedFieldIds = new Set<string>()

  if (changedField) {
    trackedFieldIds.add(changedField.id)
  }

  for (const [fieldId, touched] of Object.entries(touchedFields)) {
    if (touched) {
      trackedFieldIds.add(fieldId)
    }
  }

  for (const fieldId of Object.keys(validationErrors)) {
    trackedFieldIds.add(fieldId)
  }

  const tasks: Promise<string[]>[] = []

  for (const fieldId of trackedFieldIds) {
    const item = fieldMap.get(fieldId)
    if (!item) {
      delete validationErrors[fieldId]
      delete touchedFields[fieldId]
      continue
    }
    tasks.push(validateFieldItem(item))
  }

  await Promise.all(tasks)
}

async function validate(): Promise<FormValidationResult> {
  validationSubmitted.value = true

  const results = await Promise.all(
    getFieldItems().map((item) => validateFieldItem(item, { markTouched: true })),
  )

  return {
    valid: results.every((errors) => errors.length === 0),
    errors: snapshotValidationErrors(),
  }
}

async function validateField(fieldId: string): Promise<string[]> {
  const item = getFieldItemById(fieldId)
  if (!item) {
    delete validationErrors[fieldId]
    return []
  }

  return validateFieldItem(item, { markTouched: true })
}

function clearValidation(): void {
  validationSubmitted.value = false
  for (const fieldId of Object.keys(validationErrors)) {
    delete validationErrors[fieldId]
  }
  for (const fieldId of Object.keys(touchedFields)) {
    delete touchedFields[fieldId]
  }
  for (const fieldId of Object.keys(validationRunTokens)) {
    delete validationRunTokens[fieldId]
  }
}

function getComponentCatalog(): FormComponentCatalog {
  return {
    fields: listFieldDescriptors(fieldDescriptorRegistry.value),
    actions: listActionDescriptors(actionDescriptorRegistry.value),
  }
}

async function onFieldChange(item: FormFieldItem): Promise<void> {
  touchedFields[item.id] = true

  if (validationSubmitted.value || Object.keys(validationErrors).length > 0) {
    await revalidateTrackedFields(item)
    return
  }

  await validateFieldItem(item)
}

async function beforeAction(item: FormActionItem): Promise<boolean> {
  const explicitValidation = item.props?.validate
  const shouldValidate = typeof explicitValidation === "boolean"
    ? explicitValidation
    : item.on?.kind === "emit" && item.on.event === "submit"

  if (!shouldValidate) {
    return true
  }

  const result = await validate()
  return result.valid
}

watch(
  () => props.context,
  () => {
    if (validationSubmitted.value || Object.keys(validationErrors).length > 0) {
      void revalidateTrackedFields()
    }
  },
  { deep: true },
)

watch(
  normalizedSchema,
  () => {
    if (validationSubmitted.value || Object.keys(validationErrors).length > 0) {
      void revalidateTrackedFields()
    }
  },
  { deep: true },
)

function onModelChange(): void {
  emit("update:modelValue", runtimeModel.value)
}

function onAction(payload: FormGeneratorActionEvent): void {
  emit("action", payload)
}

function onEmitEvent(payload: { event: string, payload: unknown }): void {
  emit(payload.event, payload.payload)
}

function onError(error: Error): void {
  emit("error", error)
}

defineExpose<FormGeneratorExposed>({
  registerField,
  unregisterField,
  registerAction,
  unregisterAction,
  validate,
  validateField,
  clearValidation,
  getValidationErrors: snapshotValidationErrors,
  getFieldDescriptor: (fieldType) => getFieldDescriptor(fieldDescriptorRegistry.value, fieldType),
  listFieldDescriptors: () => listFieldDescriptors(fieldDescriptorRegistry.value),
  getActionDescriptor: (actionType) => getActionDescriptor(actionDescriptorRegistry.value, actionType),
  listActionDescriptors: () => listActionDescriptors(actionDescriptorRegistry.value),
  getComponentCatalog,
})
</script>

<template>
  <FieldGroup class="gap-2">
    <FormItemRenderer
      v-for="item in normalizedSchema"
      :key="item.id"
      :item="item"
      :model="runtimeModel"
      :context="context"
      :field-registry="fieldRegistry"
      :action-registry="actionRegistry"
      :validation-errors="validationErrors"
      :on-field-change="onFieldChange"
      :before-action="beforeAction"
      @model-change="onModelChange"
      @action="onAction"
      @emit-event="onEmitEvent"
      @error="onError"
    />
  </FieldGroup>
</template>
