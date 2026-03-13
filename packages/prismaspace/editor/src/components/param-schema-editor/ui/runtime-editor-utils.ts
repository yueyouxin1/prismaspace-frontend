import type { SchemaNode, SchemaType, SchemaValueDefinition, ValueRefContent } from "../core";
import type { VariableTreeNode } from "./tree-types";

export const schemaTypes: SchemaType[] = ["string", "number", "integer", "boolean", "object", "array"];

export const schemaTypeLabelMap: Record<SchemaType, string> = {
  string: "String",
  number: "Number",
  integer: "Integer",
  boolean: "Boolean",
  object: "Object",
  array: "Array",
};

export const schemaTypeShortLabelMap: Record<SchemaType, string> = {
  string: "str.",
  number: "num.",
  integer: "int.",
  boolean: "bool.",
  object: "{}",
  array: "[]",
};

export type RuntimeValueKind = "literal" | "expr" | "ref";

export function getNodeChildren(node: SchemaNode): SchemaNode[] {
  if (node.type === "object") return node.children ?? [];
  if (node.type === "array" && node.item) return [node.item];
  return [];
}

export function getSchemaTypeDisplay(node: SchemaNode): string {
  if (node.type !== "array" || !node.item) return schemaTypeLabelMap[node.type];
  return `Array<${schemaTypeLabelMap[node.item.type]}>`;
}

export function getDefaultLiteral(type: SchemaType): unknown {
  if (type === "string") return "";
  if (type === "number" || type === "integer") return 0;
  if (type === "boolean") return false;
  if (type === "object") return {};
  if (type === "array") return [];
  return "";
}

export function serializeJson(value: unknown): string {
  if (value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function parseValueByType(
  raw: string,
  type: SchemaType,
  target: "default" | "value",
): { ok: true; value: unknown } | { ok: false; error: string } {
  if (raw.trim() === "") {
    return { ok: true, value: undefined };
  }

  if (type === "string") {
    return { ok: true, value: raw };
  }

  if (type === "boolean") {
    if (raw === "true" || raw === "false") {
      return { ok: true, value: raw === "true" };
    }
    return { ok: false, error: `${target === "default" ? "默认值" : "值"}必须为 true 或 false。` };
  }

  if (type === "number" || type === "integer") {
    const numberValue = Number(raw);
    if (Number.isNaN(numberValue)) {
      return { ok: false, error: `${target === "default" ? "默认值" : "值"}必须为合法数字。` };
    }
    return { ok: true, value: type === "integer" ? Math.trunc(numberValue) : numberValue };
  }

  try {
    const parsed = JSON.parse(raw);
    if (type === "object" && (typeof parsed !== "object" || Array.isArray(parsed) || parsed === null)) {
      return { ok: false, error: `${target === "default" ? "默认值" : "值"}必须为 JSON 对象。` };
    }
    if (type === "array" && !Array.isArray(parsed)) {
      return { ok: false, error: `${target === "default" ? "默认值" : "值"}必须为 JSON 数组。` };
    }
    return { ok: true, value: parsed };
  } catch {
    return { ok: false, error: `${target === "default" ? "默认值" : "值"}必须为合法 JSON。` };
  }
}

export function formatValueRefSummary(ref: ValueRefContent | undefined | null): string {
  if (!ref) return "";
  const blockId = ref.blockID?.trim();
  const path = ref.path?.trim();
  if (!blockId && !path) return "";
  if (!blockId) return path;
  if (!path) return blockId;
  return `${blockId} · ${path}`;
}

export function getRuntimeValueKind(value: SchemaValueDefinition | undefined): RuntimeValueKind {
  return value?.type ?? "literal";
}

export function formatRuntimeValueSummary(value: SchemaValueDefinition | undefined): string {
  if (!value) return "";
  if (value.type === "ref") return formatValueRefSummary(value.content);
  if (value.type === "expr") return value.content ?? "";
  return serializeJson(value.content);
}

export function cloneVariableTree(tree: VariableTreeNode[] | undefined | null): VariableTreeNode[] {
  return (tree ?? []).map((node) => ({
    ...node,
    children: cloneVariableTree(node.children),
  }));
}
