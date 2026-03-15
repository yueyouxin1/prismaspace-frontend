import { computed, ref, watch, type ComputedRef } from "vue";
import type { SchemaType, ValueRefContent } from "../core";
import type { VariableTreeNode } from "./tree-types";
import {
  buildValueRefKey,
  findVariableTreeNodeRefMatchByRef,
  formatValueRefSummary,
  resolveVariableTreeNodeRef,
} from "./runtime-editor-utils";

export type ValueRefValidationStatus = "empty" | "ok" | "missing" | "not-selectable" | "type-mismatch";

export interface ValueRefCandidateCompatibility {
  compatible: boolean;
  actualType: SchemaType | null;
  message: string | null;
}

export interface ValueRefValidationResult {
  status: ValueRefValidationStatus;
  compatible: boolean;
  ref: ValueRefContent | null;
  refKey: string;
  refNode: VariableTreeNode | null;
  expectedType: SchemaType;
  actualType: SchemaType | null;
  message: string | null;
}

export interface ValueRefPickerItem {
  key: string;
  label: string;
  caption: string;
  source?: string;
  schemaType?: SchemaType;
  ref: ValueRefContent | null;
  selectable: boolean;
  selectableMessage: string | null;
  children: ValueRefPickerItem[];
  searchableText: string;
  compatibility: ValueRefCandidateCompatibility;
}

export interface ValueRefPickerFlatItem extends ValueRefPickerItem {
  level: number;
  hasChildren: boolean;
  isLeaf: boolean;
}

export interface ValueRefPickerViewModel {
  query: string;
  hasQuery: boolean;
  items: ValueRefPickerItem[];
  filteredItems: ValueRefPickerItem[];
  flatItems: ValueRefPickerFlatItem[];
  expandedKeys: string[];
  manualExpandedKeys: string[];
  selected: ValueRefContent | null;
  selectedKey: string;
  selectedItem: ValueRefPickerItem | null;
  selectedSummary: string;
  selectedValidation: ValueRefValidationResult;
  setQuery: (value: string) => void;
  clearQuery: () => void;
  toggleExpand: (key: string) => void;
  setExpandedKeys: (keys: string[]) => void;
  isExpanded: (key: string) => boolean;
  isSelected: (item: Pick<ValueRefPickerItem, "ref">) => boolean;
  canSelect: (item: Pick<ValueRefPickerItem, "ref" | "selectable" | "compatibility">) => boolean;
  selectItem: (item: Pick<ValueRefPickerItem, "ref" | "selectable" | "compatibility">) => boolean;
  selectReference: (ref: ValueRefContent) => boolean;
}

export interface UseValueRefPickerControllerOptions {
  getTree: () => VariableTreeNode[] | undefined | null;
  getModelValue: () => ValueRefContent | null | undefined;
  getExpectedType: () => SchemaType;
  rejectIncompatible?: boolean;
  onSelect?: (ref: ValueRefContent, item: ValueRefPickerItem | null) => void;
}

export function getValueRefCompatibility(
  expectedType: SchemaType,
  actualType: SchemaType | null | undefined,
): ValueRefCandidateCompatibility {
  if (!actualType || actualType === expectedType) {
    return {
      compatible: true,
      actualType: actualType ?? null,
      message: null,
    };
  }

  return {
    compatible: false,
    actualType,
    message: `变量类型 ${actualType} 与当前类型 ${expectedType} 不兼容。`,
  };
}

export function resolveValueRefValidation(
  expectedType: SchemaType,
  ref: ValueRefContent | null | undefined,
  tree: VariableTreeNode[] | undefined | null,
): ValueRefValidationResult {
  const normalizedRef = ref ?? null;
  const refKey = buildValueRefKey(normalizedRef);

  if (!normalizedRef || !refKey) {
    return {
      status: "empty",
      compatible: true,
      ref: null,
      refKey: "",
      refNode: null,
      expectedType,
      actualType: null,
      message: null,
    };
  }

  const refMatch = findVariableTreeNodeRefMatchByRef(tree, normalizedRef);
  if (!refMatch) {
    return {
      status: "missing",
      compatible: false,
      ref: normalizedRef,
      refKey,
      refNode: null,
      expectedType,
      actualType: null,
      message: "引用变量不存在。",
    };
  }

  if (!refMatch.resolved.selectable) {
    return {
      status: "not-selectable",
      compatible: false,
      ref: normalizedRef,
      refKey,
      refNode: refMatch.node,
      expectedType,
      actualType: refMatch.node.schemaType ?? null,
      message: refMatch.resolved.selectableMessage ?? "当前节点不可引用。",
    };
  }

  const compatibility = getValueRefCompatibility(expectedType, refMatch.node.schemaType);
  if (!compatibility.compatible) {
    return {
      status: "type-mismatch",
      compatible: false,
      ref: normalizedRef,
      refKey,
      refNode: refMatch.node,
      expectedType,
      actualType: compatibility.actualType,
      message: compatibility.message,
    };
  }

  return {
    status: "ok",
    compatible: true,
    ref: normalizedRef,
    refKey,
    refNode: refMatch.node,
    expectedType,
    actualType: compatibility.actualType,
    message: null,
  };
}

export function useValueRefPickerController(
  options: UseValueRefPickerControllerOptions,
): ComputedRef<ValueRefPickerViewModel> {
  const query = ref("");
  const manualExpandedKeys = ref<string[]>([]);
  const rejectIncompatible = options.rejectIncompatible ?? true;

  const items = computed<ValueRefPickerItem[]>(() =>
    normalizeValueRefPickerTree(options.getTree() ?? [], options.getExpectedType(), []),
  );
  const hasQuery = computed(() => query.value.trim().length > 0);
  const filteredItems = computed(() => {
    if (!hasQuery.value) return items.value;
    return filterValueRefPickerTree(items.value, query.value.trim().toLowerCase());
  });
  const queryExpandedKeys = computed(() => (hasQuery.value ? collectBranchKeys(filteredItems.value) : []));
  const expandedKeys = computed(() => (hasQuery.value ? queryExpandedKeys.value : manualExpandedKeys.value));
  const expandedSet = computed(() => new Set(expandedKeys.value));
  const selected = computed(() => options.getModelValue() ?? null);
  const selectedKey = computed(() => buildValueRefKey(selected.value));
  const selectedItem = computed(() => findValueRefPickerItemByRef(items.value, selected.value));
  const selectedSummary = computed(() => selectedItem.value?.caption || formatValueRefSummary(selected.value));
  const selectedValidation = computed(() =>
    resolveValueRefValidation(options.getExpectedType(), selected.value, options.getTree()),
  );
  const flatItems = computed<ValueRefPickerFlatItem[]>(() =>
    flattenValueRefPickerTree(filteredItems.value, expandedSet.value, 0),
  );

  watch(
    items,
    (nextItems) => {
      const validKeys = new Set(collectKeys(nextItems));
      const nextExpanded = manualExpandedKeys.value.filter((key) => validKeys.has(key));
      if (nextExpanded.length !== manualExpandedKeys.value.length) {
        manualExpandedKeys.value = nextExpanded;
      }
      expandPathToSelected();
    },
    { immediate: true },
  );

  watch(selectedKey, () => {
    expandPathToSelected();
  });

  function expandPathToSelected() {
    const key = selectedKey.value;
    if (!key) return;

    const path = findPathByRef(items.value, key);
    if (!path.length) return;

    const next = new Set(manualExpandedKeys.value);
    path.slice(0, -1).forEach((itemKey) => next.add(itemKey));
    manualExpandedKeys.value = [...next];
  }

  function setQuery(value: string) {
    query.value = value;
  }

  function clearQuery() {
    query.value = "";
  }

  function setExpandedKeys(keys: string[]) {
    if (hasQuery.value) return;
    manualExpandedKeys.value = [...new Set(keys)];
  }

  function toggleExpand(key: string) {
    if (hasQuery.value) return;
    const next = new Set(manualExpandedKeys.value);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    manualExpandedKeys.value = [...next];
  }

  function isSelected(item: Pick<ValueRefPickerItem, "ref">) {
    return Boolean(item.ref && selectedKey.value && buildValueRefKey(item.ref) === selectedKey.value);
  }

  function canSelect(item: Pick<ValueRefPickerItem, "ref" | "selectable" | "compatibility">) {
    if (!item.ref) return false;
    if (!item.selectable) return false;
    if (!rejectIncompatible) return true;
    return item.compatibility.compatible;
  }

  function selectItem(item: Pick<ValueRefPickerItem, "ref" | "selectable" | "compatibility">) {
    if (!item.ref || !canSelect(item)) return false;
    options.onSelect?.(item.ref, item.ref ? (findValueRefPickerItemByRef(items.value, item.ref) ?? null) : null);
    return true;
  }

  function selectReference(ref: ValueRefContent) {
    const item = findValueRefPickerItemByRef(items.value, ref);
    if (item) return selectItem(item);

    const validation = resolveValueRefValidation(options.getExpectedType(), ref, options.getTree());
    if (validation.status === "not-selectable") {
      return false;
    }
    if (rejectIncompatible && validation.status === "type-mismatch") {
      return false;
    }

    options.onSelect?.(ref, null);
    return true;
  }

  return computed<ValueRefPickerViewModel>(() => ({
    query: query.value,
    hasQuery: hasQuery.value,
    items: items.value,
    filteredItems: filteredItems.value,
    flatItems: flatItems.value,
    expandedKeys: expandedKeys.value,
    manualExpandedKeys: manualExpandedKeys.value,
    selected: selected.value,
    selectedKey: selectedKey.value,
    selectedItem: selectedItem.value,
    selectedSummary: selectedSummary.value,
    selectedValidation: selectedValidation.value,
    setQuery,
    clearQuery,
    toggleExpand,
    setExpandedKeys,
    isExpanded: (key) => expandedSet.value.has(key),
    isSelected,
    canSelect,
    selectItem,
    selectReference,
  }));
}

function normalizeValueRefPickerTree(
  nodes: VariableTreeNode[],
  expectedType: SchemaType,
  labels: string[],
  inheritedBlockId = "",
): ValueRefPickerItem[] {
  return nodes.map((node, index) => {
    const resolved = resolveVariableTreeNodeRef(node, labels, inheritedBlockId, index);
    const { label, nextLabels, blockID, path, source, ref } = resolved;
    const caption = ref ? `${ref.blockID} · ${ref.path}` : nextLabels.join(" / ");
    const children = normalizeValueRefPickerTree(node.children ?? [], expectedType, nextLabels, resolved.nextInheritedBlockId);

    return {
      key: String(node.key ?? node.id ?? `${labels.join(".")}:${label}:${index}`),
      label,
      caption,
      source,
      schemaType: node.schemaType,
      ref,
      selectable: resolved.selectable,
      selectableMessage: resolved.selectableMessage,
      children,
      searchableText: [label, caption, source ?? "", nextLabels.join(" "), blockID, path].join(" ").toLowerCase(),
      compatibility: getValueRefCompatibility(expectedType, node.schemaType),
    };
  });
}

function filterValueRefPickerTree(nodes: ValueRefPickerItem[], normalizedQuery: string): ValueRefPickerItem[] {
  const next: ValueRefPickerItem[] = [];
  for (const node of nodes) {
    const children = filterValueRefPickerTree(node.children, normalizedQuery);
    if (node.searchableText.includes(normalizedQuery) || children.length) {
      next.push({
        ...node,
        children,
      });
    }
  }
  return next;
}

function flattenValueRefPickerTree(
  nodes: ValueRefPickerItem[],
  expanded: Set<string>,
  level: number,
): ValueRefPickerFlatItem[] {
  const list: ValueRefPickerFlatItem[] = [];

  for (const node of nodes) {
    const hasChildren = node.children.length > 0;
    list.push({
      ...node,
      level,
      hasChildren,
      isLeaf: !hasChildren,
    });

    if (hasChildren && expanded.has(node.key)) {
      list.push(...flattenValueRefPickerTree(node.children, expanded, level + 1));
    }
  }

  return list;
}

function collectKeys(nodes: ValueRefPickerItem[]): string[] {
  const keys: string[] = [];
  for (const node of nodes) {
    keys.push(node.key);
    keys.push(...collectKeys(node.children));
  }
  return keys;
}

function collectBranchKeys(nodes: ValueRefPickerItem[]): string[] {
  const keys: string[] = [];
  for (const node of nodes) {
    if (node.children.length) {
      keys.push(node.key);
      keys.push(...collectBranchKeys(node.children));
    }
  }
  return keys;
}

function findValueRefPickerItemByRef(
  nodes: ValueRefPickerItem[],
  ref: ValueRefContent | null | undefined,
): ValueRefPickerItem | null {
  const targetKey = buildValueRefKey(ref);
  if (!targetKey) return null;

  for (const node of nodes) {
    if (node.ref && buildValueRefKey(node.ref) === targetKey) return node;
    const child = findValueRefPickerItemByRef(node.children, ref);
    if (child) return child;
  }

  return null;
}

function findPathByRef(nodes: ValueRefPickerItem[], key: string, path: string[] = []): string[] {
  for (const node of nodes) {
    const nextPath = [...path, node.key];
    if (node.ref && buildValueRefKey(node.ref) === key) return nextPath;
    const childPath = findPathByRef(node.children, key, nextPath);
    if (childPath.length) return childPath;
  }
  return [];
}
