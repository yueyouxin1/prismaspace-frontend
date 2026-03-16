<script setup lang="ts">
import { computed, reactive, ref, shallowReactive, watch } from "vue"
import { FieldGroup } from "@prismaspace/ui-shadcn/components/ui/field"
import type {
  ActionRendererDefinition,
  FieldRendererDefinition,
  FormContext,
  FormGeneratorActionEvent,
  FormGeneratorExposed,
  FormModel,
  FormValidationErrors,
  FormValidationResult,
  RegisterableActionRenderers,
  RegisterableFieldRenderers,
} from "./types"
import type { FormActionItem, FormFieldItem, FormItem } from "./types/form-schema"
import { createActionRendererRegistry, createFieldRendererRegistry } from "./component-registry"
import { FormItemRenderer } from "./field-renderers"
import { collectFormFieldItems, normalizeFormItems, validateFormField } from "./utils"

const props = withDefaults(defineProps<{
  schema: FormItem[]
  modelValue?: FormModel
  context?: FormContext
  fieldRenderers?: RegisterableFieldRenderers
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
const localFieldRenderers = shallowReactive(new Map<string, FieldRendererDefinition>())
const localActionRenderers = shallowReactive(new Map<string, ActionRendererDefinition>())
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

const fieldRegistry = computed(() => {
  const registry = createFieldRendererRegistry(props.fieldRenderers)
  for (const [key, renderer] of localFieldRenderers.entries()) {
    registry.set(key.trim().toLowerCase(), renderer)
  }
  return registry
})

const actionRegistry = computed(() => {
  const registry = createActionRendererRegistry(props.actionRenderers)
  for (const [key, renderer] of localActionRenderers.entries()) {
    registry.set(key.trim().toLowerCase(), renderer)
  }
  return registry
})

function registerField(fieldType: string, renderer: FieldRendererDefinition): void {
  localFieldRenderers.set(fieldType.trim().toLowerCase(), renderer)
}

function unregisterField(fieldType: string): void {
  localFieldRenderers.delete(fieldType.trim().toLowerCase())
}

function registerAction(actionType: string, renderer: ActionRendererDefinition): void {
  localActionRenderers.set(actionType.trim().toLowerCase(), renderer)
}

function unregisterAction(actionType: string): void {
  localActionRenderers.delete(actionType.trim().toLowerCase())
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
})
</script>

<template>
  <FieldGroup class="gap-4">
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
