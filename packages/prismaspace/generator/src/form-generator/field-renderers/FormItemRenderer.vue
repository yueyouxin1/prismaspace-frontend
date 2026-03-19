<script setup lang="ts">
import { computed, watchEffect } from "vue"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@prismaspace/ui-shadcn/components/ui/field"
import type {
  ActionRendererDefinition,
  ExpressionRuntimeScope,
  FieldOption,
  FieldRendererDefinition,
  FormValidationErrors,
  FormGeneratorActionEvent,
  FormContext,
  FormModel,
} from "../types"
import type {
  Expr,
  FormActionItem,
  FormFieldItem,
  FormLayoutItem,
  FormItem,
} from "../types/form-schema"
import {
  createExpressionScope,
  evaluateExpression,
  getValueByModelPath,
  resolveDynamicValue,
  setValueByModelPath,
} from "../utils"
import { resolveActionRenderer, resolveFieldRenderer } from "../component-registry"

const props = withDefaults(defineProps<{
  item: FormItem
  model: FormModel
  context?: FormContext
  fieldRegistry: Map<string, FieldRendererDefinition>
  actionRegistry: Map<string, ActionRendererDefinition>
  validationErrors?: FormValidationErrors
  onFieldChange?: (item: FormFieldItem) => void | Promise<void>
  beforeAction?: (item: FormActionItem) => boolean | Promise<boolean>
}>(), {
  context: () => ({}),
  validationErrors: () => ({}),
})

const emit = defineEmits<{
  (event: "action", payload: FormGeneratorActionEvent): void
  (event: "emit-event", payload: { event: string, payload: unknown }): void
  (event: "model-change"): void
  (event: "error", payload: Error): void
}>()

function getExpressionScope(overrides?: Partial<ExpressionRuntimeScope>) {
  return createExpressionScope({
    model: props.model,
    context: props.context,
    item: props.item,
    value: getFieldValue(),
    overrides,
  })
}

function evaluateExpr<T>(
  expr: Expr<T> | undefined,
  fallback?: T,
  overrides?: Partial<ExpressionRuntimeScope>,
): T | undefined {
  return evaluateExpression(expr, getExpressionScope(overrides), fallback)
}

function resolveDynamic<T>(value: T, overrides?: Partial<ExpressionRuntimeScope>): T {
  return resolveDynamicValue(value, getExpressionScope(overrides))
}

function getFieldItem(): FormFieldItem | undefined {
  if (props.item.type !== "form") {
    return undefined
  }
  return props.item
}

function getBoundItem(): FormFieldItem | FormLayoutItem | undefined {
  if (props.item.type === "form") {
    return props.item
  }

  if (props.item.type === "layout" && props.item.modelPath) {
    return props.item
  }

  return undefined
}

function getRenderableItem(): FormFieldItem | FormLayoutItem | undefined {
  if (props.item.type === "action") {
    return undefined
  }
  return props.item
}

function getActionItem(): FormActionItem | undefined {
  if (props.item.type !== "action") {
    return undefined
  }
  return props.item
}

function getFieldValue(): unknown {
  const item = getBoundItem()
  if (!item?.modelPath) {
    return undefined
  }
  return getValueByModelPath(props.model, item.modelPath)
}

function setFieldValue(next: unknown): void {
  const item = getBoundItem()
  if (!item?.modelPath) {
    return
  }
  setValueByModelPath(props.model, item.modelPath, next)
  emit("model-change")
}

function normalizeOptions(rawOptions: unknown): FieldOption[] {
  if (!Array.isArray(rawOptions)) {
    return []
  }

  return rawOptions.map((option) => {
    if (option && typeof option === "object") {
      const candidate = option as Record<string, unknown>
      return {
        label: candidate.label ? String(candidate.label) : undefined,
        value: candidate.value,
        disabled: Boolean(candidate.disabled),
        ...candidate,
      }
    }
    return {
      label: String(option),
      value: option,
      disabled: false,
    }
  })
}

const boundItem = computed(() => getBoundItem())
const renderItem = computed(() => getRenderableItem())
const fieldItem = computed(() => getFieldItem())
const actionItem = computed(() => getActionItem())

const isVisible = computed(() => {
  const value = evaluateExpr(props.item.state?.visible, true)
  return value !== false
})

const isDisabled = computed(() => {
  const value = evaluateExpr(props.item.state?.disabled, false)
  return value === true
})

const containerClass = computed(() => props.item.ui?.className)
const containerStyle = computed<Record<string, string | number>>(() => {
  const baseStyle = props.item.ui?.style ?? {}
  if (props.item.ui?.width === undefined) {
    return baseStyle
  }
  return {
    ...baseStyle,
    width: props.item.ui.width,
  }
})

const fieldRenderer = computed(() => {
  const item = renderItem.value
  if (!item) {
    return undefined
  }
  return resolveFieldRenderer(props.fieldRegistry, item.control)
})

const fieldOptions = computed(() => {
  const item = renderItem.value
  if (!item) {
    return []
  }
  const resolvedProps = resolveDynamic(item.props ?? {})
  const rawOptions = (resolvedProps as Record<string, unknown>).options
  return normalizeOptions(rawOptions)
})

const fieldRequired = computed(() => {
  const item = fieldItem.value
  if (!item) {
    return false
  }
  return evaluateExpr(item.required, false) === true
})

const fieldErrors = computed<string[]>(() => {
  const item = fieldItem.value
  if (!item) {
    return []
  }
  return props.validationErrors?.[item.id] ?? []
})

const fieldInvalid = computed(() => fieldErrors.value.length > 0)

const renderChildren = computed(() => {
  const item = renderItem.value
  if (!item?.children?.length) {
    return []
  }
  return [...item.children].sort((left, right) => (left.ui?.order ?? 0) - (right.ui?.order ?? 0))
})

const fieldOwnsChildrenSlot = computed(() => {
  return Boolean(fieldRenderer.value?.rendersChildrenInDefaultSlot && renderChildren.value.length)
})

const fieldOrientation = computed<"vertical" | "horizontal">(() => {
  const control = fieldItem.value?.control.trim().toLowerCase()
  return control === "checkbox" || control === "switch" ? "horizontal" : "vertical"
})

const fieldLabelText = computed(() => {
  const item = fieldItem.value
  if (!item) {
    return ""
  }

  if (typeof item.label === "string" && item.label.trim()) {
    return item.label.trim()
  }

  const fallbackLabel = item.props && typeof item.props === "object"
    ? (item.props as Record<string, unknown>).label
    : undefined

  return typeof fallbackLabel === "string" ? fallbackLabel.trim() : ""
})

const baseFieldControlId = computed(() => {
  const item = fieldItem.value
  if (!item) {
    return undefined
  }
  return `fg-${item.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`
})

const fieldDescriptionId = computed(() => (
  fieldItem.value?.desc ? `${baseFieldControlId.value}-description` : undefined
))

const fieldErrorId = computed(() => (
  fieldInvalid.value ? `${baseFieldControlId.value}-error` : undefined
))

const commonFieldProps = computed<Record<string, unknown>>(() => {
  const item = fieldItem.value
  if (!item || !baseFieldControlId.value) {
    return {}
  }

  const describedBy = [fieldDescriptionId.value, fieldErrorId.value]
    .filter(Boolean)
    .join(" ")

  return {
    id: baseFieldControlId.value,
    name: item.modelPath,
    "aria-invalid": fieldInvalid.value ? "true" : undefined,
    "aria-describedby": describedBy || undefined,
  }
})

function mergeFieldProps(
  baseProps: Record<string, unknown>,
  extras: Record<string, unknown>,
): Record<string, unknown> {
  const existingProps = baseProps.fieldProps && typeof baseProps.fieldProps === "object"
    ? baseProps.fieldProps as Record<string, unknown>
    : undefined

  if (!existingProps) {
    return baseProps
  }

  const describedBy = [extras["aria-describedby"], existingProps["aria-describedby"]]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ")

  return {
    ...baseProps,
    fieldProps: {
      ...extras,
      ...existingProps,
      id: existingProps.id ?? extras.id,
      name: existingProps.name ?? extras.name,
      "aria-invalid": existingProps["aria-invalid"] ?? extras["aria-invalid"],
      "aria-describedby": describedBy || undefined,
    },
  }
}

function getFieldResolveContext() {
  const item = renderItem.value
  if (!item) {
    return undefined
  }
  return {
    item,
    model: props.model,
    context: props.context,
    value: getFieldValue(),
    errors: fieldErrors.value,
    invalid: fieldInvalid.value,
    setValue: setFieldValue,
    options: fieldOptions.value,
    evaluateExpr,
    resolveDynamic,
  }
}

const fieldModelProp = computed(() => fieldRenderer.value?.modelProp ?? "modelValue")
const fieldModelEvent = computed(() => fieldRenderer.value?.modelEvent ?? "update:modelValue")
const shouldBindFieldModel = computed(() => Boolean(boundItem.value?.modelPath))

const fieldComponentProps = computed(() => {
  const item = renderItem.value
  const renderer = fieldRenderer.value
  const context = getFieldResolveContext()

  if (!item || !renderer || !context) {
    return {}
  }

  const mappedProps = renderer.getProps?.(context) ?? {
    fieldProps: resolveDynamic(item.props ?? {}),
    options: fieldOptions.value,
  }

  const valueForComponent = renderer.transformInput
    ? renderer.transformInput(getFieldValue(), context)
    : getFieldValue()
  const modelBindingProps = shouldBindFieldModel.value
    ? {
        [fieldModelProp.value]: valueForComponent,
      }
    : {}

  if (item.type === "layout") {
    return {
      ...mappedProps,
      disabled: isDisabled.value,
      ...modelBindingProps,
    }
  }

  return mergeFieldProps({
    ...mappedProps,
    disabled: isDisabled.value,
    ...modelBindingProps,
  }, commonFieldProps.value)
})

function onFieldModelUpdate(nextValue: unknown): void {
  try {
    const renderer = fieldRenderer.value
    const context = getFieldResolveContext()
    const item = fieldItem.value
    if (!renderer || !context) {
      return
    }
    const outputValue = renderer.transformOutput
      ? renderer.transformOutput(nextValue, context)
      : nextValue
    setFieldValue(outputValue)
    if (item) {
      void props.onFieldChange?.(item)
    }
  } catch (error) {
    emit("error", error as Error)
  }
}

const fieldListeners = computed<Record<string, (value: unknown) => void>>(() => {
  if (!boundItem.value) {
    return {}
  }

  return {
    [fieldModelEvent.value]: onFieldModelUpdate,
  }
})

watchEffect(() => {
  const item = fieldItem.value
  if (!item) {
    return
  }

  const current = getFieldValue()
  if (current !== undefined && current !== null) {
    return
  }

  const defaultValue = evaluateExpr(
    (item.props?.defaultValue as Expr<unknown> | undefined),
    undefined,
  )

  if (defaultValue !== undefined) {
    setFieldValue(defaultValue)
  }
})

const actionRenderer = computed(() => {
  const item = actionItem.value
  if (!item) {
    return undefined
  }
  return resolveActionRenderer(props.actionRegistry, item.actionType)
})

const actionEventName = computed(() => actionRenderer.value?.eventName ?? "click")

function getActionResolveContext() {
  const item = actionItem.value
  if (!item) {
    return undefined
  }
  return {
    item,
    model: props.model,
    context: props.context,
    evaluateExpr,
    resolveDynamic,
  }
}

const actionComponentProps = computed(() => {
  const item = actionItem.value
  const renderer = actionRenderer.value
  const context = getActionResolveContext()

  if (!item || !renderer || !context) {
    return {}
  }

  return renderer.getProps?.(context) ?? {
    label: item.label,
    disabled: isDisabled.value,
    actionProps: resolveDynamic(item.props ?? {}),
  }
})

function resolveActionPayload(item: FormActionItem): unknown {
  if (!item.on) {
    return undefined
  }

  if (item.on.kind === "emit") {
    return evaluateExpr(item.on.payload)
  }

  if (item.on.kind === "callback") {
    return evaluateExpr(item.on.payload)
  }

  if (item.on.kind === "navigate") {
    return {
      to: item.on.to,
      params: evaluateExpr(item.on.params),
    }
  }

  if (item.on.kind === "api") {
    return {
      apiName: item.on.apiName,
      body: evaluateExpr(item.on.body),
    }
  }

  return undefined
}

async function onActionTrigger(): Promise<void> {
  const item = actionItem.value
  if (!item) {
    return
  }

  try {
    const canContinue = props.beforeAction ? await props.beforeAction(item) : true
    if (!canContinue) {
      return
    }

    const payload = resolveActionPayload(item)
    if (item.on?.kind === "emit") {
      emit("emit-event", {
        event: item.on.event,
        payload,
      })
    }

    if (item.on?.kind === "callback") {
      const callback = props.context?.[item.on.fn]
      if (typeof callback === "function") {
        callback(payload, {
          item,
          model: props.model,
          context: props.context,
        })
      }
    }

    emit("action", {
      item,
      payload,
    })
  } catch (error) {
    emit("error", error as Error)
  }
}

const actionListeners = computed<Record<string, () => void>>(() => ({
  [actionEventName.value]: onActionTrigger,
}))
</script>

<template>
  <div v-if="isVisible" :class="['space-y-2', containerClass]" :style="containerStyle">
    <template v-if="renderItem">
      <Field
        v-if="fieldItem"
        :orientation="fieldOrientation"
        :data-invalid="fieldInvalid ? 'true' : undefined"
        :data-disabled="isDisabled ? 'true' : undefined"
      >
        <template v-if="fieldOrientation === 'horizontal'">
          <component
            :is="fieldRenderer?.component"
            v-bind="fieldComponentProps"
            v-on="fieldListeners"
          >
            <template v-if="fieldOwnsChildrenSlot">
              <div class="space-y-3">
                <FormItemRenderer
                  v-for="child in renderChildren"
                  :key="child.id"
                  :item="child"
                  :model="model"
                  :context="context"
                  :field-registry="fieldRegistry"
                  :action-registry="actionRegistry"
                  :validation-errors="validationErrors"
                  :on-field-change="onFieldChange"
                  :before-action="beforeAction"
                  @action="emit('action', $event)"
                  @emit-event="emit('emit-event', $event)"
                  @model-change="emit('model-change')"
                  @error="emit('error', $event)"
                />
              </div>
            </template>
          </component>

          <FieldContent v-if="fieldLabelText || fieldItem.desc || fieldErrors.length">
            <FieldLabel v-if="fieldLabelText" :for="baseFieldControlId">
              {{ fieldLabelText }}
              <span v-if="fieldRequired" class="text-destructive">*</span>
            </FieldLabel>
            <FieldDescription v-if="fieldItem.desc" :id="fieldDescriptionId">
              {{ fieldItem.desc }}
            </FieldDescription>
            <FieldError v-if="fieldErrors.length" :id="fieldErrorId" :errors="fieldErrors" />
          </FieldContent>
        </template>

        <template v-else>
          <FieldLabel v-if="fieldLabelText" :for="baseFieldControlId">
            {{ fieldLabelText }}
            <span v-if="fieldRequired" class="text-destructive">*</span>
          </FieldLabel>

          <component
            :is="fieldRenderer?.component"
            v-bind="fieldComponentProps"
            v-on="fieldListeners"
          >
            <template v-if="fieldOwnsChildrenSlot">
              <div class="space-y-3">
                <FormItemRenderer
                  v-for="child in renderChildren"
                  :key="child.id"
                  :item="child"
                  :model="model"
                  :context="context"
                  :field-registry="fieldRegistry"
                  :action-registry="actionRegistry"
                  :validation-errors="validationErrors"
                  :on-field-change="onFieldChange"
                  :before-action="beforeAction"
                  @action="emit('action', $event)"
                  @emit-event="emit('emit-event', $event)"
                  @model-change="emit('model-change')"
                  @error="emit('error', $event)"
                />
              </div>
            </template>
          </component>

          <FieldDescription v-if="fieldItem.desc" :id="fieldDescriptionId">
            {{ fieldItem.desc }}
          </FieldDescription>
          <FieldError v-if="fieldErrors.length" :id="fieldErrorId" :errors="fieldErrors" />
        </template>
      </Field>

      <template v-else>
        <component
          :is="fieldRenderer?.component"
          v-bind="fieldComponentProps"
          v-on="fieldListeners"
        >
          <template v-if="fieldOwnsChildrenSlot">
            <div class="space-y-3">
              <FormItemRenderer
                v-for="child in renderChildren"
                :key="child.id"
                :item="child"
                :model="model"
                :context="context"
                :field-registry="fieldRegistry"
                :action-registry="actionRegistry"
                :validation-errors="validationErrors"
                :on-field-change="onFieldChange"
                :before-action="beforeAction"
                @action="emit('action', $event)"
                @emit-event="emit('emit-event', $event)"
                @model-change="emit('model-change')"
                @error="emit('error', $event)"
              />
            </div>
          </template>
        </component>
      </template>

      <FieldGroup
        v-if="renderChildren.length && !fieldOwnsChildrenSlot"
        :class="fieldItem ? 'border-l pl-4' : 'gap-3'"
      >
        <FormItemRenderer
          v-for="child in renderChildren"
          :key="child.id"
          :item="child"
          :model="model"
          :context="context"
          :field-registry="fieldRegistry"
          :action-registry="actionRegistry"
          :validation-errors="validationErrors"
          :on-field-change="onFieldChange"
          :before-action="beforeAction"
          @action="emit('action', $event)"
          @emit-event="emit('emit-event', $event)"
          @model-change="emit('model-change')"
          @error="emit('error', $event)"
        />
      </FieldGroup>
    </template>

    <template v-else-if="actionItem">
      <component
        :is="actionRenderer?.component"
        v-bind="actionComponentProps"
        v-on="actionListeners"
      />
      <p v-if="actionItem.desc" class="text-xs text-muted-foreground">
        {{ actionItem.desc }}
      </p>
    </template>
  </div>
</template>
