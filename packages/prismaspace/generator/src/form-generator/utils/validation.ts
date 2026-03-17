import type { FieldRule, FormFieldItem, FormItem } from "../types/form-schema";
import type { FormContext, FormModel } from "../types";
import { createExpressionScope, evaluateExpression } from "./expression";
import { getValueByModelPath } from "./model-path";

function normalizeControl(control: string | undefined): string {
  return (control ?? "").trim().toLowerCase();
}

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === "string") {
    return value.trim().length === 0;
  }

  if (Array.isArray(value)) {
    return value.length === 0 || value.every((item) => isEmptyValue(item));
  }

  if (typeof value === "object") {
    const values = Object.values(value as Record<string, unknown>);
    return values.length === 0 || values.every((item) => isEmptyValue(item));
  }

  return false;
}

function passesRequiredCheck(item: FormFieldItem, value: unknown): boolean {
  const control = normalizeControl(item.control);

  if (control === "checkbox" || control === "switch") {
    return value === true;
  }

  return !isEmptyValue(value);
}

function getRequiredMessage(item: FormFieldItem): string {
  const displayName = item.label?.trim() || item.id;
  const control = normalizeControl(item.control);

  if (control === "checkbox" || control === "switch") {
    return `请确认「${displayName}」`;
  }

  return `请填写「${displayName}」`;
}

function uniqueMessages(messages: string[]): string[] {
  return [...new Set(messages.filter(Boolean))];
}

function isVisibleField(item: FormFieldItem, model: FormModel, context?: FormContext): boolean {
  const value = getValueByModelPath(model, item.modelPath);
  const scope = createExpressionScope({
    model,
    context,
    item,
    value,
  });

  return evaluateExpression(item.state?.visible, scope, true) !== false;
}

function isDisabledField(item: FormFieldItem, model: FormModel, context?: FormContext): boolean {
  const value = getValueByModelPath(model, item.modelPath);
  const scope = createExpressionScope({
    model,
    context,
    item,
    value,
  });

  return evaluateExpression(item.state?.disabled, scope, false) === true;
}

async function runRuleValidation(
  rule: FieldRule,
  item: FormFieldItem,
  model: FormModel,
  context?: FormContext,
): Promise<string | null> {
  const value = getValueByModelPath(model, item.modelPath);
  const scope = createExpressionScope({
    model,
    context,
    item,
    value,
  });

  if (evaluateExpression(rule.when, scope, true) === false) {
    return null;
  }

  if (!rule.validate) {
    return null;
  }

  try {
    const valid = typeof rule.validate === "function"
      ? await rule.validate(value, scope as any)
      : evaluateExpression(rule.validate, scope, true);

    if (valid === false) {
      return rule.message ?? `字段「${item.label?.trim() || item.id}」校验失败`;
    }
  } catch (error) {
    if (rule.message) {
      return rule.message;
    }
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }
    return `字段「${item.label?.trim() || item.id}」校验失败`;
  }

  return null;
}

export async function validateFormField(
  item: FormFieldItem,
  model: FormModel,
  context?: FormContext,
): Promise<string[]> {
  if (!isVisibleField(item, model, context) || isDisabledField(item, model, context)) {
    return [];
  }

  const value = getValueByModelPath(model, item.modelPath);
  const scope = createExpressionScope({
    model,
    context,
    item,
    value,
  });

  const errors: string[] = [];
  const isRequired = evaluateExpression(item.required, scope, false) === true;

  if (isRequired && !passesRequiredCheck(item, value)) {
    errors.push(getRequiredMessage(item));
  }

  for (const rule of item.rules ?? []) {
    const message = await runRuleValidation(rule, item, model, context);
    if (message) {
      errors.push(message);
    }
  }

  return uniqueMessages(errors);
}

export function collectFormFieldItems(items: FormItem[]): FormFieldItem[] {
  const collected: FormFieldItem[] = [];

  for (const item of items) {
    if (item.type === "form") {
      collected.push(item);
      if (item.children?.length) {
        collected.push(...collectFormFieldItems(item.children));
      }
      continue;
    }

    if (item.type === "layout" && item.children?.length) {
      collected.push(...collectFormFieldItems(item.children));
    }
  }

  return collected;
}
