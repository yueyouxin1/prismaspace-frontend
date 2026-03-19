import type {
  DefaultVariableTreeItem,
  FlatDefaultVariableTreeItem,
  ResolvedVariableTreeNodeValue,
  VariableTreeInsertValueResolver,
  VariableTreeNode,
} from "./types";

function hasExplicitVariableValue(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

export function normalizeVariableTreeNodeValue(value: string | number | undefined | null): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export function getVariableTreeNodeLabel(node: VariableTreeNode, index = 0): string {
  return (
    normalizeVariableTreeNodeValue(node.label)
    || normalizeVariableTreeNodeValue(node.title)
    || normalizeVariableTreeNodeValue(node.name)
    || normalizeVariableTreeNodeValue(node.path)
    || normalizeVariableTreeNodeValue(node.key)
    || normalizeVariableTreeNodeValue(node.id)
    || `node-${index + 1}`
  );
}

function getVariableTreeNodeReferenceSeed(node: VariableTreeNode): string {
  return normalizeVariableTreeNodeValue(node.id) || normalizeVariableTreeNodeValue(node.key);
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

  const segment = normalizeVariableTreeNodeValue(node.name);
  if (segment) return joinVariablePath(inheritedPath, segment);

  return inheritedPath;
}

function buildDefaultVariableTreeExpression(blockID: string, path: string): string | null {
  if (blockID && path) return `${blockID}.${path}`;
  if (blockID) return blockID;
  if (path) return path;
  return null;
}

function getVariableTreeNodeSelectableState(
  node: VariableTreeNode,
  resolved: Pick<ResolvedVariableTreeNodeValue, "expression" | "explicitBlockID" | "explicitPath" | "source">,
): { selectable: boolean; message: string | null } {
  if (!resolved.expression) {
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

  const hasExplicitValue =
    resolved.explicitBlockID
    || resolved.explicitPath
    || Boolean(resolved.source?.trim());

  if (hasExplicitValue || !(node.children?.length)) {
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

export function resolveVariableTreeNodeValue(
  node: VariableTreeNode,
  labels: string[] = [],
  inheritedBlockId = "",
  inheritedPath = "",
  index = 0,
): ResolvedVariableTreeNodeValue {
  const label = getVariableTreeNodeLabel(node, index);
  const nextLabels = [...labels, label];
  const explicitBlockID = hasExplicitVariableValue(node.blockID);
  const explicitPath = hasExplicitVariableValue(node.path);
  const blockID = explicitBlockID
    ? normalizeVariableTreeNodeValue(node.blockID)
    : inheritedBlockId || getVariableTreeNodeReferenceSeed(node);
  const explicitResolvedPath = normalizeVariableTreeNodeValue(node.path);
  const path = explicitPath
    ? explicitResolvedPath
    : explicitBlockID
      ? ""
      : getFallbackVariableTreeNodePath(node, blockID, inheritedPath);
  const source = normalizeVariableTreeNodeValue(node.source) || undefined;
  const expression = buildDefaultVariableTreeExpression(blockID, path);
  const selectableState = getVariableTreeNodeSelectableState(node, {
    expression,
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
    expression,
    nextInheritedBlockId: blockID || inheritedBlockId,
    nextInheritedPath: path,
    explicitBlockID,
    explicitPath,
    selectable: selectableState.selectable,
    selectableMessage: selectableState.message,
  };
}

export interface NormalizeDefaultVariableTreeOptions {
  resolveInsertValue?: VariableTreeInsertValueResolver;
}

export function normalizeDefaultVariableTree(
  nodes: VariableTreeNode[],
  options: NormalizeDefaultVariableTreeOptions = {},
  labels: string[] = [],
  inheritedBlockId = "",
  inheritedPath = "",
): DefaultVariableTreeItem[] {
  return nodes.map((node, index) => {
    const resolved = resolveVariableTreeNodeValue(node, labels, inheritedBlockId, inheritedPath, index);
    const children = normalizeDefaultVariableTree(
      node.children ?? [],
      options,
      resolved.nextLabels,
      resolved.nextInheritedBlockId,
      resolved.nextInheritedPath,
    );
    const insertValue = options.resolveInsertValue?.(node, resolved) ?? resolved.expression;
    const selectable = resolved.selectable && Boolean(insertValue);
    const selectableMessage = selectable
      ? null
      : resolved.selectableMessage ?? (insertValue ? "当前节点不可引用。" : "当前节点没有可用的插入文本。");

    return {
      key: String(node.key ?? node.id ?? `${labels.join(".")}:${resolved.label}:${index}`),
      label: resolved.label,
      caption: insertValue ?? resolved.nextLabels.join(" / "),
      source: resolved.source,
      schemaType: node.schemaType,
      selectable,
      selectableMessage,
      insertValue,
      searchableText: [
        resolved.label,
        insertValue ?? "",
        resolved.source ?? "",
        resolved.nextLabels.join(" "),
        resolved.blockID,
        resolved.path,
      ].join(" ").toLowerCase(),
      node,
      resolved,
      children,
    };
  });
}

export function filterDefaultVariableTree(
  nodes: DefaultVariableTreeItem[],
  normalizedQuery: string,
): DefaultVariableTreeItem[] {
  const next: DefaultVariableTreeItem[] = [];

  for (const node of nodes) {
    const children = filterDefaultVariableTree(node.children, normalizedQuery);
    if (node.searchableText.includes(normalizedQuery) || children.length) {
      next.push({
        ...node,
        children,
      });
    }
  }

  return next;
}

export function flattenDefaultVariableTree(
  nodes: DefaultVariableTreeItem[],
  expanded: Set<string>,
  level: number,
): FlatDefaultVariableTreeItem[] {
  const list: FlatDefaultVariableTreeItem[] = [];

  for (const node of nodes) {
    const hasChildren = node.children.length > 0;
    list.push({
      ...node,
      level,
      hasChildren,
      isLeaf: !hasChildren,
    });

    if (hasChildren && expanded.has(node.key)) {
      list.push(...flattenDefaultVariableTree(node.children, expanded, level + 1));
    }
  }

  return list;
}

export function collectDefaultVariableTreeBranchKeys(nodes: DefaultVariableTreeItem[]): string[] {
  const keys: string[] = [];

  for (const node of nodes) {
    if (node.children.length) {
      keys.push(node.key);
      keys.push(...collectDefaultVariableTreeBranchKeys(node.children));
    }
  }

  return keys;
}
