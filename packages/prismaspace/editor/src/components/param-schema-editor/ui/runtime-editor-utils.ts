import type { SchemaNode, SchemaType, SchemaValueDefinition, ValueRefContent } from "../core";
import type { ParamSchemaRuntimeMode } from "./mode";
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

export function getRuntimeValueEditLockMessage(
  node: Pick<SchemaNode, "type" | "children">,
  mode: ParamSchemaRuntimeMode,
  options: { withinArrayValueContext?: boolean } = {},
): string | null {
  if (mode !== "refine" && mode !== "bind") return null;
  if (options.withinArrayValueContext) {
    return "数组元素由父级数组整体赋值，不支持单独输入。";
  }
  if (node.type === "object" && (node.children?.length ?? 0) > 0) {
    return "已添加子节点，不再支持输入。";
  }
  return null;
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
  nextInheritedPath: string;
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

function normalizeVariableNodeValue(value: string | number | undefined | null): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function getVariableTreeNodeDisplayLabel(node: VariableTreeNode, index: number): string {
  return (
    normalizeVariableNodeValue(node.label)
    || normalizeVariableNodeValue(node.title)
    || normalizeVariableNodeValue(node.name)
    || normalizeVariableNodeValue(node.path)
    || normalizeVariableNodeValue(node.key)
    || normalizeVariableNodeValue(node.id)
    || `node-${index + 1}`
  );
}

function getVariableTreeNodeReferenceSeed(node: VariableTreeNode): string {
  return normalizeVariableNodeValue(node.id) || normalizeVariableNodeValue(node.key);
}

function getRelativePathFromSeed(seed: string, blockID: string): string | null {
  if (!seed) return null;
  if (!blockID) return seed;
  if (seed === blockID) return "";
  if (seed.startsWith(`${blockID}.`)) {
    return seed.slice(blockID.length + 1);
  }
  return null;
}

function joinVariablePath(base: string, segment: string): string {
  if (!base) return segment;
  if (!segment) return base;
  return `${base}.${segment}`;
}

function getFallbackVariableTreeNodePath(
  node: VariableTreeNode,
  currentBlockID: string,
  inheritedPath: string,
): string {
  const referenceSeed = getVariableTreeNodeReferenceSeed(node);
  const pathFromSeed = getRelativePathFromSeed(referenceSeed, currentBlockID);
  if (pathFromSeed !== null) return pathFromSeed;

  const segment = normalizeVariableNodeValue(node.name);
  if (segment) return joinVariablePath(inheritedPath, segment);

  return inheritedPath;
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
  inheritedPath = "",
  index = 0,
): ResolvedVariableTreeNodeRef {
  const label = getVariableTreeNodeDisplayLabel(node, index);
  const nextLabels = [...labels, label];
  const explicitBlockID = hasExplicitVariableRefValue(node.blockID);
  const explicitPath = hasExplicitVariableRefValue(node.path);
  const blockID = explicitBlockID
    ? normalizeVariableNodeValue(node.blockID)
    : inheritedBlockId || getVariableTreeNodeReferenceSeed(node);
  const explicitResolvedPath = normalizeVariableNodeValue(node.path);
  const path = explicitPath
    ? explicitResolvedPath
    : explicitBlockID
      ? ""
      : getFallbackVariableTreeNodePath(node, blockID, inheritedPath);
  const source = normalizeVariableNodeValue(node.source) || undefined;
  const ref = blockID
    ? {
        blockID,
        path,
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
    nextInheritedPath: path,
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
    inheritedPath = "",
  ): VariableTreeNodeRefMatch | null => {
    for (const [index, node] of nodes.entries()) {
      const resolved = resolveVariableTreeNodeRef(node, labels, inheritedBlockId, inheritedPath, index);
      if (buildValueRefKey(resolved.ref) === targetKey) {
        return { node, resolved };
      }
      const child = walk(node.children ?? [], resolved.nextLabels, resolved.nextInheritedBlockId, resolved.nextInheritedPath);
      if (child) return child;
    }
    return null;
  };

  return walk(tree ?? []);
}

export function getVariableTreeNodeLabel(node: VariableTreeNode | null | undefined): string {
  if (!node) return "";
  return (
    normalizeVariableNodeValue(node.label)
    || normalizeVariableNodeValue(node.title)
    || normalizeVariableNodeValue(node.name)
    || normalizeVariableNodeValue(node.path)
    || normalizeVariableNodeValue(node.key)
    || normalizeVariableNodeValue(node.id)
  );
}

export function getVariableTreeNodeCaption(node: VariableTreeNode | null | undefined): string {
  if (!node) return "";
  const label = getVariableTreeNodeLabel(node);
  const path = String(node.path ?? "").trim();
  if (!label) return path;
  if (!path || path === label) return label;
  return `${label} · ${path}`;
}
