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
export type RuntimeInlineValueMode = SchemaType | "expr";

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

export interface ResolvedVariableTreeNodeRef {
  label: string;
  nextLabels: string[];
  blockID: string;
  path: string;
  source?: string;
  ref: ValueRefContent | null;
  nextInheritedBlockId: string;
  explicitBlockID: boolean;
  explicitPath: boolean;
  selectable: boolean;
  selectableMessage: string | null;
}

export interface VariableTreeNodeRefMatch {
  node: VariableTreeNode;
  resolved: ResolvedVariableTreeNodeRef;
}

function hasExplicitVariableRefValue(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

export function getVariableTreeNodeSelectableState(
  node: VariableTreeNode,
  resolvedRef: Pick<ResolvedVariableTreeNodeRef, "ref" | "explicitBlockID" | "explicitPath" | "source">,
): { selectable: boolean; message: string | null } {
  if (!resolvedRef.ref) {
    return {
      selectable: false,
      message: "当前节点没有可用的引用标识。",
    };
  }

  if (typeof node.selectable === "boolean") {
    return {
      selectable: node.selectable,
      message: node.selectable ? null : "当前节点被标记为不可引用。",
    };
  }

  const hasExplicitRef =
    resolvedRef.explicitBlockID
    || resolvedRef.explicitPath
    || Boolean(resolvedRef.source?.trim());

  if (hasExplicitRef || !(node.children?.length)) {
    return {
      selectable: true,
      message: null,
    };
  }

  return {
    selectable: false,
    message: "当前节点默认作为分组容器，不可直接引用。",
  };
}

export function resolveVariableTreeNodeRef(
  node: VariableTreeNode,
  labels: string[] = [],
  inheritedBlockId = "",
  index = 0,
): ResolvedVariableTreeNodeRef {
  const rawLabel = node.label ?? node.name ?? node.title ?? node.path ?? node.id ?? `node-${index + 1}`;
  const label = String(rawLabel).trim() || `node-${index + 1}`;
  const nextLabels = [...labels, label];
  const explicitBlockID = hasExplicitVariableRefValue(node.blockID);
  const explicitPath = hasExplicitVariableRefValue(node.path);
  const blockID = String((explicitBlockID ? node.blockID : inheritedBlockId || node.id) ?? "").trim();
  const path = String(node.path ?? "").trim();
  const source = String(node.source ?? "").trim() || undefined;
  const fallbackPath = nextLabels.join(".");
  const ref =
    blockID || path
      ? {
          blockID: blockID || inheritedBlockId || label,
          path: path || fallbackPath,
          source,
        }
      : null;
  const selectableState = getVariableTreeNodeSelectableState(node, {
    ref,
    explicitBlockID,
    explicitPath,
    source,
  });

  return {
    label,
    nextLabels,
    blockID,
    path,
    source,
    ref,
    nextInheritedBlockId: blockID || inheritedBlockId,
    explicitBlockID,
    explicitPath,
    selectable: selectableState.selectable,
    selectableMessage: selectableState.message,
  };
}

export function buildValueRefKey(ref: ValueRefContent | null | undefined): string {
  if (!ref) return "";
  return `${ref.blockID ?? ""}::${ref.path ?? ""}::${ref.source ?? ""}`;
}

export function findVariableTreeNodeByRef(
  tree: VariableTreeNode[] | undefined | null,
  ref: ValueRefContent | null | undefined,
): VariableTreeNode | null {
  return findVariableTreeNodeRefMatchByRef(tree, ref)?.node ?? null;
}

export function findVariableTreeNodeRefMatchByRef(
  tree: VariableTreeNode[] | undefined | null,
  ref: ValueRefContent | null | undefined,
): VariableTreeNodeRefMatch | null {
  const targetKey = buildValueRefKey(ref);
  if (!targetKey) return null;

  const walk = (
    nodes: VariableTreeNode[],
    labels: string[] = [],
    inheritedBlockId = "",
  ): VariableTreeNodeRefMatch | null => {
    for (const [index, node] of nodes.entries()) {
      const resolved = resolveVariableTreeNodeRef(node, labels, inheritedBlockId, index);
      if (buildValueRefKey(resolved.ref) === targetKey) {
        return { node, resolved };
      }
      const child = walk(node.children ?? [], resolved.nextLabels, resolved.nextInheritedBlockId);
      if (child) return child;
    }
    return null;
  };

  return walk(tree ?? []);
}

export function getVariableTreeNodeLabel(node: VariableTreeNode | null | undefined): string {
  if (!node) return "";
  return String(node.label ?? node.name ?? node.title ?? node.path ?? node.id ?? "").trim();
}

export function getVariableTreeNodeCaption(node: VariableTreeNode | null | undefined): string {
  if (!node) return "";
  const label = getVariableTreeNodeLabel(node);
  const path = String(node.path ?? "").trim();
  if (!label) return path;
  if (!path || path === label) return label;
  return `${label} · ${path}`;
}
