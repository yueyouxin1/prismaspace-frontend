<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, provide, ref, watch } from "vue";
import type { ParameterSchema, SchemaEditorAction, SchemaEditorState, SchemaIssue, SchemaNode, SchemaType } from "../core";
import {
  applyOp,
  cloneNode,
  createAddPropertyOp,
  createChangeTypeOp,
  createReplaceNodeOp,
  createSchemaNode,
  createRemoveNodeOp,
  createSetFieldOp,
  exportJsonSchema,
  exportJsonValue,
  exportParameterSchema,
  findNodeById,
  findParentInfo,
  importJsonSchema,
  importJsonValue,
  importParameterSchema,
  normalizeNode,
  stripPropertyFields,
  createWrapArrayOp,
  validateTree,
} from "../core";
import type {
  ParamSchemaFieldVisibilityOverrides,
  ParamSchemaRegularDetailVisibility,
  ParamSchemaRegularInlineVisibility,
  ParamSchemaRuntimeMode,
} from "./mode";
import type { VariableTreeNode } from "./tree-types";
import type {
  CompactRuntimeControlColumn,
  CompactRuntimeControlColumnKey,
  CompactRuntimeLayout,
} from "./compact-runtime-layout";
import type { ValueRefPickerViewModel } from "./value-ref-picker";
import { schemaTreeOverlayKey, TREE_BASE_RAIL, TREE_INDENT, type SchemaTreeOverlayRowRegistration } from "./tree-visuals";
import {
  canEditFieldInMode,
  canMutateStructureInMode,
  resolveRegularDetailVisibility,
  resolveRegularInlineVisibility,
} from "./mode";
import { getNodeChildren, getRuntimeValueEditLockMessage } from "./runtime-editor-utils";
import { resolveValueRefValidation } from "./value-ref-picker";
import SchemaCompactRuntimeRow from "./SchemaCompactRuntimeRow.vue";
import { ScrollArea, ScrollBar } from "@prismaspace/ui-shadcn/components/ui/scroll-area";
import { Button } from "@prismaspace/ui-shadcn/components/ui/button";
import { Badge } from "@prismaspace/ui-shadcn/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@prismaspace/ui-shadcn/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@prismaspace/ui-shadcn/components/ui/dialog";
import { MonacoEditor } from "../../monaco-editor";
import IdManager from "@prismaspace/common/tools/id-manager";
import {
  AlertCircle,
  Copy,
  Ellipsis,
  Plus,
  Redo2,
  Undo2,
  Upload,
} from "lucide-vue-next";
import { useParamSchemaEditor } from "./useParamSchemaEditor";

type ParamSchemaImportMode = "parameter" | "json-schema" | "json";
type ParamSchemaExportKind = ParamSchemaImportMode;

defineSlots<{
  "value-ref-picker"?: (props: { picker: ValueRefPickerViewModel; close: () => void }) => unknown;
}>();

const props = withDefaults(
  defineProps<{
    modelValue?: ParameterSchema[];
    state?: SchemaEditorState;
    dispatch?: (action: SchemaEditorAction) => void;
    canEdit?: (node: SchemaNode) => boolean;
    roleOptions?: string[];
    runtimeMode?: ParamSchemaRuntimeMode;
    valueRefTree?: VariableTreeNode[];
    fieldVisibility?: ParamSchemaFieldVisibilityOverrides;
    showHeader?: boolean;
    headerTitle?: string;
  }>(),
  {
    runtimeMode: "define",
    valueRefTree: () => [],
    showHeader: true,
    headerTitle: undefined,
  },
);

const emit = defineEmits<{
  (event: "update:modelValue", value: ParameterSchema[]): void;
}>();

const containerRef = ref<HTMLElement | null>(null);
const treeLayerRef = ref<HTMLElement | null>(null);
const layoutWidth = ref(0);
const treeExpandedIds = ref<string[]>([]);
const detailOpenIds = ref<string[]>([]);
const localIssues = ref<SchemaIssue[]>([]);
const isImportOpen = ref(false);
const importMode = ref<"parameter" | "json-schema" | "json">("json-schema");
const importText = ref("");
const importError = ref<string | null>(null);
const overlayPaths = ref<Array<{ key: string; d: string }>>([]);
let resizeObserver: ResizeObserver | null = null;
let overlayMeasureRaf: number | null = null;

const rowRegistry = new Map<string, SchemaTreeOverlayRowRegistration>();
const HEADER_BLOCKING_ISSUE_CODES = new Set([
  "object-missing-properties",
  "array-missing-items",
  "property-name-missing",
  "property-name-duplicate",
  "property-name-duplicate-global",
  "property-required-missing",
  "property-open-missing",
  "value-ref-missing",
  "value-ref-not-selectable",
  "value-ref-type-mismatch",
]);

const nameIdManager = new IdManager({ idKey: "uid", onDuplicate: "reassign" });
const hasExternalRuntime = computed(() => Boolean(props.state && props.dispatch));
const normalizedModelValue = computed<ParameterSchema[]>(() => props.modelValue ?? []);
const initialModelSnapshot = JSON.stringify(normalizedModelValue.value);
const internalEditor = useParamSchemaEditor({
  initialState: {
    tree: importParameterSchema(normalizedModelValue.value),
  },
});
const appliedModelSnapshot = ref(initialModelSnapshot);
const emittedModelSnapshot = ref(initialModelSnapshot);

const runtimeMode = computed<ParamSchemaRuntimeMode>(() => props.runtimeMode);
const editorState = computed<SchemaEditorState>(() => props.state ?? internalEditor.state.value);
const editorDispatch = (action: SchemaEditorAction) => {
  if (props.dispatch) {
    props.dispatch(action);
    return;
  }
  internalEditor.dispatch(action);
};
const rootChildren = computed(() => editorState.value.tree.children ?? []);
const canUndo = computed(() => editorState.value.undoStack.length > 0);
const canRedo = computed(() => editorState.value.redoStack.length > 0);
const validation = computed(() => validateTree(editorState.value.tree));
const runtimeValueIssues = computed(() => collectRuntimeValueIssues(editorState.value.tree));
const allIssues = computed(() => [...validation.value.issues, ...runtimeValueIssues.value, ...localIssues.value]);
const headerIssueSummaries = computed(() => {
  const blockingIssues = allIssues.value.filter((issue) =>
    issue.level === "error" && HEADER_BLOCKING_ISSUE_CODES.has(issue.code),
  );
  const grouped = new Map<string, SchemaIssue[]>();

  for (const issue of blockingIssues) {
    const current = grouped.get(issue.code) ?? [];
    current.push(issue);
    grouped.set(issue.code, current);
  }

  return Array.from(grouped.entries()).map(([code, issues]) => ({
    code,
    count: issues.length,
    text: summarizeHeaderIssueGroup(code, issues),
  }));
});
const headerIssueCount = computed(() => headerIssueSummaries.value.length);
const headerIssueTitle = computed(() => headerIssueSummaries.value.map((summary) => summary.text).join("\n"));

const inlineVisibility = computed<ParamSchemaRegularInlineVisibility>(() =>
  resolveRegularInlineVisibility(runtimeMode.value, layoutWidth.value, props.fieldVisibility),
);
const detailVisibility = computed<ParamSchemaRegularDetailVisibility>(() =>
  resolveRegularDetailVisibility(runtimeMode.value, props.fieldVisibility),
);
const layout = computed<CompactRuntimeLayout>(() =>
  resolveCompactLayout(runtimeMode.value, layoutWidth.value, inlineVisibility.value, detailVisibility.value),
);
const showTreeAffordance = computed(() => hasAnyNestedChildren(editorState.value.tree));
const expandedSet = computed(() => new Set(treeExpandedIds.value));
type HeaderLabel = {
  key: string;
  label: string;
  align?: CompactRuntimeControlColumn["align"];
};

const contentMinWidth = computed(() => {
  const depth = collectVisibleMaxDepth(editorState.value.tree, expandedSet.value);
  const treeIndentWidth = showTreeAffordance.value ? 20 + depth * 15 : 0;
  const nameInputMin = layout.value.density === "xs" ? 76 : 92;
  const typeMin = layout.value.inlineType ? (layout.value.density === "xs" ? 84 : 96) : 0;
  const valueMin =
    layout.value.valueField === "value"
      ? layout.value.density === "xs"
        ? 112
        : 132
      : layout.value.valueField === "default"
        ? layout.value.density === "xs"
          ? 96
          : 116
        : 0;
  const controlMin = layout.value.controlColumns.reduce((sum, column) => sum + column.minWidth, 0);
  return treeIndentWidth + nameInputMin + typeMin + valueMin + controlMin + 22;
});
const modeLabel = computed(() => {
  if (runtimeMode.value === "define") return "Define";
  if (runtimeMode.value === "refine") return "Refine";
  if (runtimeMode.value === "bind") return "Bind";
  return "Read";
});
const resolvedHeaderTitle = computed(() => {
  const customTitle = props.headerTitle?.trim();
  if (customTitle) return customTitle;
  return modeLabel.value.toUpperCase();
});

const headerLabels = computed<HeaderLabel[]>(() => {
  const labels: HeaderLabel[] = [{ key: "name", label: "变量名" }];
  if (layout.value.inlineType) labels.push({ key: "type", label: "变量类型" });
  if (layout.value.valueField === "value") labels.push({ key: "value", label: "变量值" });
  if (layout.value.valueField === "default") labels.push({ key: "default", label: "默认值" });
  labels.push(
    ...layout.value.controlColumns.map(({ key, label, align }) => ({
      key,
      label,
      align,
    })),
  );
  return labels;
});
const headerNamePadding = computed(() => (showTreeAffordance.value ? `${TREE_BASE_RAIL + 9}px` : "0.125rem"));

const showHeader = computed(() => props.showHeader && runtimeMode.value !== "read");
const canAddRoot = computed(() => {
  if (!canMutateStructureInMode(runtimeMode.value)) return false;
  return props.canEdit ? props.canEdit(editorState.value.tree) : true;
});

const exportPayloads = computed(() => ({
  parameter: JSON.stringify(exportParameterSchema(editorState.value.tree), null, 2),
  "json-schema": JSON.stringify(exportJsonSchema(editorState.value.tree), null, 2),
  json: JSON.stringify(exportJsonValue(editorState.value.tree), null, 2),
}));

provide(schemaTreeOverlayKey, {
  registerRow(registration) {
    rowRegistry.set(registration.id, registration);
  },
  unregisterRow(id) {
    rowRegistry.delete(id);
  },
  scheduleMeasure() {
    scheduleOverlayMeasure();
  },
});

watch(
  () => editorState.value.tree,
  (root) => {
    const validKeys = collectExpandableIds(root);
    treeExpandedIds.value = treeExpandedIds.value.filter((id) => validKeys.has(id));
    detailOpenIds.value = detailOpenIds.value.filter((id) => Boolean(findNodeById(root, id)));
    if (!treeExpandedIds.value.length) {
      const next: string[] = [];
      collectDefaultExpanded(root, 0, next);
      treeExpandedIds.value = next;
    }
  },
  { deep: true, immediate: true },
);

watch(
  () => editorState.value.selection.nodeId,
  (selectedId) => {
    if (!selectedId) return;
    const path = findPathToNode(editorState.value.tree, selectedId);
    if (!path.length) return;
    const next = new Set(treeExpandedIds.value);
    path.slice(0, -1).forEach((nodeId) => next.add(nodeId));
    treeExpandedIds.value = [...next];
  },
  { immediate: true },
);

watch(
  [() => editorState.value.tree, () => editorState.value.selection.nodeId],
  ([root, selectedNodeId]) => {
    if (selectedNodeId) return;
    const first = root.children?.[0] ?? null;
    if (first) editorDispatch({ type: "select", nodeId: first.id });
  },
  { immediate: true },
);

watch(
  [() => editorState.value.tree, treeExpandedIds, detailOpenIds, layoutWidth],
  async () => {
    await nextTick();
    scheduleOverlayMeasure();
  },
  { deep: true, immediate: true },
);

watch(
  normalizedModelValue,
  (nextModelValue) => {
    if (hasExternalRuntime.value) return;
    const nextSnapshot = JSON.stringify(nextModelValue);
    if (nextSnapshot === emittedModelSnapshot.value || nextSnapshot === appliedModelSnapshot.value) {
      return;
    }
    appliedModelSnapshot.value = nextSnapshot;
    editorDispatch({
      type: "reset",
      tree: importParameterSchema(nextModelValue),
    });
  },
  { deep: true },
);

watch(
  () => editorState.value.tree,
  (tree) => {
    if (hasExternalRuntime.value) return;
    const nextValue = exportParameterSchema(tree);
    const nextSnapshot = JSON.stringify(nextValue);
    emittedModelSnapshot.value = nextSnapshot;
    appliedModelSnapshot.value = nextSnapshot;
    emit("update:modelValue", nextValue);
  },
  { deep: true },
);

onMounted(() => {
  if (!containerRef.value || typeof ResizeObserver === "undefined") return;
  layoutWidth.value = containerRef.value.clientWidth;
  resizeObserver = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (!entry) return;
    layoutWidth.value = entry.contentRect.width;
  });
  resizeObserver.observe(containerRef.value);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
  if (overlayMeasureRaf !== null) {
    cancelAnimationFrame(overlayMeasureRaf);
    overlayMeasureRaf = null;
  }
});

function scheduleOverlayMeasure() {
  if (overlayMeasureRaf !== null) return;
  overlayMeasureRaf = requestAnimationFrame(() => {
    overlayMeasureRaf = null;
    measureOverlayPaths();
  });
}

function measureOverlayPaths() {
  const layer = treeLayerRef.value;
  if (!layer || !showTreeAffordance.value) {
    overlayPaths.value = [];
    return;
  }

  const layerRect = layer.getBoundingClientRect();
  const nextPaths: Array<{ key: string; d: string }> = [];

  for (const registration of rowRegistry.values()) {
    if (!registration.parentId) continue;
    const parent = rowRegistry.get(registration.parentId);
    if (!parent) continue;

    const rowRect = registration.el.getBoundingClientRect();
    const parentRect = parent.el.getBoundingClientRect();

    const childX = rowRect.left - layerRect.left + registration.branchCenterX;
    const parentX = parentRect.left - layerRect.left + parent.branchCenterX;
    const childY = rowRect.top - layerRect.top + rowRect.height / 2;
    const parentY = parentRect.top - layerRect.top + parentRect.height / 2;

    nextPaths.push({
      key: registration.id,
      d: `M ${parentX} ${parentY} V ${childY} H ${childX}`,
    });
  }

  overlayPaths.value = nextPaths;
}

function resolveCompactLayout(
  mode: ParamSchemaRuntimeMode,
  width: number,
  inlineVisibility: ParamSchemaRegularInlineVisibility,
  detailVisibility: ParamSchemaRegularDetailVisibility,
): CompactRuntimeLayout {
  const density = width < 360 ? "xs" : width < 520 ? "sm" : width < 760 ? "md" : "lg";
  const railWidth = density === "xs" ? 22 : density === "sm" ? 28 : density === "md" ? 32 : 36;
  const inlineType = mode !== "read" && inlineVisibility.type;
  const valueField = inlineVisibility.valueField;
  const inlineDefault = valueField === "default";
  const columns = ["minmax(0,1fr)"];
  const controlColumns: CompactRuntimeControlColumn[] = [];

  if (inlineType) {
    columns.push(density === "xs" ? "96px" : density === "sm" ? "104px" : "108px");
  }

  if (valueField === "value") {
    columns.push(density === "xs" ? "minmax(112px,1fr)" : "minmax(152px,1.12fr)");
  }

  if (valueField === "default") {
    columns.push(
      density === "lg"
        ? "minmax(124px,0.92fr)"
        : density === "xs"
          ? "minmax(108px,1fr)"
        : "minmax(148px,1.1fr)",
    );
  }

  if (mode !== "read" && inlineVisibility.required) {
    const requiredColumn = createControlColumn("required", density, "必填");
    controlColumns.push(requiredColumn);
    columns.push(requiredColumn.width);
  }

  if (mode !== "read" && inlineVisibility.actions) {
    if (canMutateStructureInMode(mode)) {
      const addChildColumn = createControlColumn("add-child", density);
      controlColumns.push(addChildColumn);
      columns.push(addChildColumn.width);
    }

    if (hasVisibleDetailColumns(detailVisibility)) {
      const detailColumn = createControlColumn("toggle-detail", density);
      controlColumns.push(detailColumn);
      columns.push(detailColumn.width);
    }

    if (canMutateStructureInMode(mode)) {
      const deleteColumn = createControlColumn("delete-node", density);
      controlColumns.push(deleteColumn);
      columns.push(deleteColumn.width);
    }
  }

  if (mode === "read") {
    return {
      density,
      railWidth,
      gridTemplate: columns.join(" "),
      inlineType: false,
      inlineDefault,
      valueField,
      readBadgeOnly: true,
      controlColumns,
    };
  }

  return {
    density,
    railWidth,
    gridTemplate: columns.join(" "),
    inlineType,
    inlineDefault,
    valueField,
    readBadgeOnly: false,
    controlColumns,
  };
}

function hasVisibleDetailColumns(detailVisibility: ParamSchemaRegularDetailVisibility) {
  return Object.values(detailVisibility).some(Boolean);
}

function createControlColumn(
  key: CompactRuntimeControlColumnKey,
  density: CompactRuntimeLayout["density"],
  label: CompactRuntimeControlColumn["label"] = ""
): CompactRuntimeControlColumn {
  const compactWidth = density === "xs" || density === "sm";

  const minWidth = compactWidth ? 28 : 32;
  return {
    key,
    label: label,
    width: `${minWidth}px`,
    minWidth,
    align: "center",
  };
}

function canAccessNode(node: SchemaNode) {
  return props.canEdit ? props.canEdit(node) : true;
}

function canMutateStructure(node: SchemaNode) {
  return canAccessNode(node) && canMutateStructureInMode(runtimeMode.value);
}

function onSelect(nodeId: string) {
  if (editorState.value.selection.nodeId === nodeId) return;
  editorDispatch({ type: "select", nodeId });
}

function onToggleTree(nodeId: string) {
  const next = new Set(treeExpandedIds.value);
  if (next.has(nodeId)) next.delete(nodeId);
  else next.add(nodeId);
  treeExpandedIds.value = [...next];
}

function onToggleDetail(nodeId: string) {
  const next = new Set(detailOpenIds.value);
  if (next.has(nodeId)) next.delete(nodeId);
  else next.add(nodeId);
  detailOpenIds.value = [...next];
}

function onSetField(payload: { nodeId: string; field: keyof SchemaNode; value: unknown }) {
  const node = findNodeById(editorState.value.tree, payload.nodeId);
  if (!node) return;
  if (!canAccessNode(node) || !canEditFieldInMode(runtimeMode.value, payload.field as never)) return;

  if (payload.field === "name" && typeof payload.value === "string") {
    const trimmed = payload.value.trim();
    if (node.kind !== "property") return;
    const parentInfo = findParentInfo(editorState.value.tree, payload.nodeId);
    if (parentInfo.parent?.children) {
      const hasDuplicate = parentInfo.parent.children.some(
        (child) => child.id !== payload.nodeId && child.name === trimmed,
      );
      localIssues.value = localIssues.value.filter(
        (issue) => !(issue.nodeId === payload.nodeId && issue.code === "property-name-duplicate"),
      );
      if (hasDuplicate) {
        localIssues.value.push({
          level: "error",
          code: "property-name-duplicate",
          message: `存在重复字段名：${trimmed}`,
          nodeId: payload.nodeId,
          path: "",
        });
        return;
      }
    }
    payload = { ...payload, value: trimmed };
  }

  const op = createSetFieldOp(editorState.value.tree, payload.nodeId, payload.field, payload.value);
  if (!op) return;
  editorDispatch({ type: "apply", op });
}

function onChangeType(payload: { nodeId: string; nextType: SchemaType; itemType?: SchemaType }) {
  const node = findNodeById(editorState.value.tree, payload.nodeId);
  if (!node) return;
  if (!canAccessNode(node) || !canEditFieldInMode(runtimeMode.value, "type")) return;

  if (payload.nextType === "array" && payload.itemType) {
    if (node.type === "array" && node.item?.type === payload.itemType) return;
    const nextNode = buildArrayTypeNode(editorState.value.tree, node, payload.itemType);
    if (!nextNode) return;
    const replaceOp = createReplaceNodeOp(editorState.value.tree, payload.nodeId, nextNode);
    if (!replaceOp) return;
    editorDispatch({ type: "apply", op: replaceOp });
    return;
  }

  if (node.type === payload.nextType && !payload.itemType) return;
  const op = createChangeTypeOp(editorState.value.tree, payload.nodeId, payload.nextType, "stash");
  if (!op) return;
  editorDispatch({ type: "apply", op });
}

function onAddProperty(parentId: string) {
  const node = findNodeById(editorState.value.tree, parentId);
  if (!node || node.type !== "object") return;
  if (!canMutateStructure(node)) return;
  const nameId = allocateNameId(editorState.value.tree);
  const child = createSchemaNode({
    kind: "property",
    type: "string",
    name: `param_${nameId}`,
    uid: nameId,
    required: false,
    open: true,
  });
  editorDispatch({ type: "apply", op: createAddPropertyOp(parentId, child) });
}

function onAddRootProperty() {
  if (!canAddRoot.value) return;
  onAddProperty(editorState.value.tree.id);
}

function onAddItem(parentId: string) {
  const node = findNodeById(editorState.value.tree, parentId);
  if (!node || node.type !== "array") return;
  if (!canMutateStructure(node)) return;
  const itemNode = createSchemaNode({ kind: "item", type: "string" });
  const op = createSetFieldOp(editorState.value.tree, parentId, "item", itemNode);
  if (!op) return;
  editorDispatch({ type: "apply", op });
}

function onDeleteNode(nodeId: string) {
  const node = findNodeById(editorState.value.tree, nodeId);
  if (!node || node.kind === "root" || node.kind === "item") return;
  if (!canMutateStructure(node)) return;
  const op = createRemoveNodeOp(editorState.value.tree, node.id);
  if (!op) return;
  editorDispatch({ type: "apply", op });
}

function collectExpandableIds(node: SchemaNode, bag = new Set<string>()) {
  if (node.type === "object" || node.type === "array") bag.add(node.id);
  node.children?.forEach((child) => collectExpandableIds(child, bag));
  if (node.item) collectExpandableIds(node.item, bag);
  return bag;
}

function collectDefaultExpanded(node: SchemaNode, level: number, bag: string[]) {
  if ((node.type === "object" || node.type === "array") && level <= 1) bag.push(node.id);
  node.children?.forEach((child) => collectDefaultExpanded(child, level + 1, bag));
  if (node.item) collectDefaultExpanded(node.item, level + 1, bag);
}

function collectVisibleMaxDepth(node: SchemaNode, expanded: Set<string>, level = -1): number {
  let maxDepth = Math.max(level, 0);
  const nextLevel = level + 1;

  if (node.children?.length && (node.kind === "root" || expanded.has(node.id))) {
    for (const child of node.children) {
      maxDepth = Math.max(maxDepth, collectVisibleMaxDepth(child, expanded, nextLevel));
    }
  }

  if (node.type === "array" && node.item?.type === "object" && node.item.children?.length && expanded.has(node.id)) {
    for (const child of node.item.children) {
      maxDepth = Math.max(maxDepth, collectVisibleMaxDepth(child, expanded, nextLevel));
    }
  }

  return maxDepth;
}

function hasAnyNestedChildren(node: SchemaNode): boolean {
  const children = getNodeChildren(node);
  for (const child of children) {
    if (getNodeChildren(child).length > 0) return true;
    if (hasAnyNestedChildren(child)) return true;
  }
  return false;
}

function findPathToNode(root: SchemaNode, targetId: string): string[] {
  const path: string[] = [];
  const walk = (node: SchemaNode): boolean => {
    path.push(node.id);
    if (node.id === targetId) return true;
    if (node.children) {
      for (const child of node.children) {
        if (walk(child)) return true;
      }
    }
    if (node.item && walk(node.item)) return true;
    path.pop();
    return false;
  };
  return walk(root) ? path : [];
}

function openImport(mode: ParamSchemaImportMode) {
  importMode.value = mode;
  importText.value = "";
  importError.value = null;
  isImportOpen.value = true;
}

function applyImport() {
  try {
    const parsed = JSON.parse(importText.value);
    const nextTree =
      importMode.value === "parameter"
        ? importParameterSchema(parsed)
        : importMode.value === "json-schema"
          ? importJsonSchema(parsed)
          : importJsonValue(parsed);
    initUidTree(nextTree);
    editorDispatch({ type: "reset", tree: nextTree });
    treeExpandedIds.value = [];
    detailOpenIds.value = [];
    isImportOpen.value = false;
  } catch (error) {
    importError.value = error instanceof Error ? error.message : "Invalid JSON";
  }
}

async function copyExport(kind: ParamSchemaExportKind) {
  const text = exportPayloads.value[kind];
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Silent fallback. The user can still use the import/export menu from the surrounding workbench.
  }
}

function initUidTree(root: SchemaNode) {
  const originalChildren = new Map<SchemaNode, SchemaNode[] | undefined>();
  const stack: SchemaNode[] = [root];

  while (stack.length) {
    const node = stack.pop();
    if (!node) continue;
    originalChildren.set(node, node.children);
    const merged: SchemaNode[] = [];
    if (node.children?.length) merged.push(...node.children);
    if (node.item) merged.push(node.item);
    node.children = merged.length ? merged : undefined;
    node.children?.forEach((child) => stack.push(child));
  }

  try {
    nameIdManager.init(root.children ?? [], { mutate: true });
  } finally {
    for (const [node, children] of originalChildren.entries()) {
      node.children = children;
    }
  }
}

function allocateNameId(root: SchemaNode): number {
  initUidTree(root);
  return nameIdManager.allocate();
}

function buildArrayTypeNode(root: SchemaNode, node: SchemaNode, itemType: SchemaType): SchemaNode | null {
  const previewRoot =
    node.type === "array"
      ? root
      : (() => {
          const wrapOp = createWrapArrayOp(root, node.id);
          return wrapOp ? applyOp(root, wrapOp) : null;
        })();

  if (!previewRoot) return null;

  const previewNode = findNodeById(previewRoot, node.id);
  if (!previewNode || previewNode.type !== "array") return null;

  const sourceItem = previewNode.item;
  const nextItemSeed =
    sourceItem && sourceItem.type === itemType
      ? {
          ...stripPropertyFields(cloneNode(sourceItem)),
          id: sourceItem.id,
        }
      : {};

  const nextItem = normalizeNode(
    createSchemaNode({
      kind: "item",
      type: itemType,
      ...nextItemSeed,
    }),
  );

  if (itemType === "array" && !nextItem.item) {
    nextItem.item = createSchemaNode({ kind: "item", type: "string" });
  }

  return normalizeNode({
    ...cloneNode(previewNode),
    type: "array",
    children: undefined,
    item: nextItem,
  });
}

function collectRuntimeValueIssues(root: SchemaNode): SchemaIssue[] {
  const issues: SchemaIssue[] = [];

  const walkRuntimeValueNode = (node: SchemaNode, path: string, withinArrayValueContext: boolean) => {
    const valueLockMessage = getRuntimeValueEditLockMessage(node, runtimeMode.value, {
      withinArrayValueContext,
    });
    if (valueLockMessage && node.value !== undefined) {
      issues.push({
        level: "error",
        code: "value-locked-by-structure",
        message: valueLockMessage,
        nodeId: node.id,
        path,
      });
    } else if (node.value?.type === "ref") {
      const refValidation = resolveValueRefValidation(node.type, node.value.content, props.valueRefTree);
      if (refValidation.status === "missing") {
        issues.push({
          level: "error",
          code: "value-ref-missing",
          message: refValidation.message ?? "引用变量不存在。",
          nodeId: node.id,
          path,
        });
      } else if (refValidation.status === "not-selectable") {
        issues.push({
          level: "error",
          code: "value-ref-not-selectable",
          message: refValidation.message ?? "引用变量当前不可选中。",
          nodeId: node.id,
          path,
        });
      } else if (refValidation.status === "type-mismatch") {
        issues.push({
          level: "error",
          code: "value-ref-type-mismatch",
          message: refValidation.message ?? "引用变量类型与当前 schema 类型不兼容。",
          nodeId: node.id,
          path,
        });
      }
    }

    if (node.children?.length) {
      const nextArrayContext =
        withinArrayValueContext || ((runtimeMode.value === "refine" || runtimeMode.value === "bind") && node.type === "array");
      node.children.forEach((child, index) =>
        walkRuntimeValueNode(child, `${path}.properties[${index}]`, nextArrayContext),
      );
    }
    if (node.item) {
      const nextArrayContext =
        withinArrayValueContext || ((runtimeMode.value === "refine" || runtimeMode.value === "bind") && node.type === "array");
      walkRuntimeValueNode(node.item, `${path}.items`, nextArrayContext);
    }
  };

  walkRuntimeValueNode(root, "root", false);
  return issues;
}

function summarizeHeaderIssueGroup(code: string, issues: SchemaIssue[]): string {
  const count = issues.length;
  if (code === "object-missing-properties") {
    return count === 1 ? "1 个对象节点缺少子属性定义" : `${count} 个对象节点缺少子属性定义`;
  }
  if (code === "array-missing-items") {
    return count === 1 ? "1 个数组节点缺少元素定义" : `${count} 个数组节点缺少元素定义`;
  }
  if (code === "property-name-missing") {
    return count === 1 ? "1 个字段缺少名称" : `${count} 个字段缺少名称`;
  }
  if (code === "property-name-duplicate" || code === "property-name-duplicate-global") {
    return count === 1 ? "1 个字段名重复" : `${count} 个字段名重复`;
  }
  if (code === "property-required-missing") {
    return count === 1 ? "1 个字段缺少 required 标记" : `${count} 个字段缺少 required 标记`;
  }
  if (code === "property-open-missing") {
    return count === 1 ? "1 个字段缺少 open 标记" : `${count} 个字段缺少 open 标记`;
  }
  if (code === "value-ref-missing") {
    return count === 1 ? "1 个变量引用失效" : `${count} 个变量引用失效`;
  }
  if (code === "value-ref-not-selectable") {
    return count === 1 ? "1 个变量引用当前不可用" : `${count} 个变量引用当前不可用`;
  }
  if (code === "value-ref-type-mismatch") {
    return count === 1 ? "1 个变量引用类型不兼容" : `${count} 个变量引用类型不兼容`;
  }

  const uniqueMessages = [...new Set(issues.map((issue) => issue.message).filter(Boolean))];
  if (uniqueMessages.length === 1) {
    const message = uniqueMessages[0] ?? "1 个阻塞性问题";
    return count === 1 ? message : `${message}（${count} 处）`;
  }
  return count === 1 ? "1 个阻塞性问题" : `${count} 个阻塞性问题`;
}

function undo() {
  if (!canUndo.value) return;
  editorDispatch({ type: "undo" });
}

function redo() {
  if (!canRedo.value) return;
  editorDispatch({ type: "redo" });
}

function addRootProperty() {
  if (!canAddRoot.value) return;
  onAddRootProperty();
}

function getHeaderState() {
  return {
    title: resolvedHeaderTitle.value,
    modeLabel: modeLabel.value,
    rootCount: rootChildren.value.length,
    issueCount: headerIssueCount.value,
    issueTitle: headerIssueTitle.value,
    canAddRoot: canAddRoot.value,
    canUndo: canUndo.value,
    canRedo: canRedo.value,
  };
}

defineExpose({
  addRootProperty,
  undo,
  redo,
  openImport,
  copyExport,
  getHeaderState,
});
</script>

<template>
  <div
    ref="containerRef"
    class="flex h-full min-h-0 flex-col overflow-hidden"
  >
    <div v-if="showHeader" class="flex items-center justify-between border-b border-[#eceaf2] px-3 py-2">
      <div class="flex min-w-0 items-center gap-2">
        <span class="text-[12px] font-semibold tracking-[0.14em] text-[#7a7b8f]">
          {{ resolvedHeaderTitle }}
        </span>
        <Badge variant="secondary" class="rounded-full bg-[#f2f3f8] text-[#66687d]">
          {{ rootChildren.length }} 项
        </Badge>
        <button
          v-if="headerIssueCount"
          type="button"
          class="inline-flex items-center gap-1 rounded-full bg-[#fff4f5] px-2 py-1 text-[11px] font-medium text-[#d45460]"
          :title="headerIssueTitle"
        >
          <AlertCircle class="size-3.5" />
          {{ headerIssueCount }}
        </button>
      </div>

      <div class="flex items-center gap-0.5">
        <Button
          v-if="canAddRoot"
          type="button"
          size="icon-sm"
          variant="ghost"
          class="size-8 rounded-[10px] text-[#6255af]"
          title="新增顶层参数"
          @click="addRootProperty"
        >
          <Plus class="size-4" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          class="size-8 rounded-[10px] text-[#7b7c90]"
          :disabled="!canUndo"
          title="撤销"
          @click="undo"
        >
          <Undo2 class="size-4" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          class="size-8 rounded-[10px] text-[#7b7c90]"
          :disabled="!canRedo"
          title="重做"
          @click="redo"
        >
          <Redo2 class="size-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              class="size-8 rounded-[10px] text-[#7b7c90]"
              title="更多操作"
            >
              <Ellipsis class="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="min-w-[180px]">
            <DropdownMenuItem @select="openImport('parameter')">
              <Upload class="mr-2 size-3.5" />
              导入 ParameterSchema
            </DropdownMenuItem>
            <DropdownMenuItem @select="openImport('json-schema')">
              <Upload class="mr-2 size-3.5" />
              导入 JSON Schema
            </DropdownMenuItem>
            <DropdownMenuItem @select="openImport('json')">
              <Upload class="mr-2 size-3.5" />
              导入 JSON
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem @select="copyExport('parameter')">
              <Copy class="mr-2 size-3.5" />
              复制 ParameterSchema
            </DropdownMenuItem>
            <DropdownMenuItem @select="copyExport('json-schema')">
              <Copy class="mr-2 size-3.5" />
              复制 JSON Schema
            </DropdownMenuItem>
            <DropdownMenuItem @select="copyExport('json')">
              <Copy class="mr-2 size-3.5" />
              复制 JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>

    <ScrollArea class="min-h-0 flex-1">
      <div class="min-w-full" :style="{ minWidth: `${contentMinWidth}px` }">
        <div
          v-if="showHeader"
          class="sticky top-0 z-10 grid items-center gap-0 border-b border-[#eceaf2] bg-[#f6f6fb]/95 px-0.5 py-1 text-[11px] font-semibold text-[#8b8ca0] backdrop-blur"
          :style="{ gridTemplateColumns: layout.gridTemplate }"
        >
          <div
            v-for="item in headerLabels"
            :key="item.key"
            :class="[
              item.key === 'name' ? 'pr-0.5' : 'px-0.5',
              item.align === 'center' ? 'text-center' : '',
              item.align === 'right' ? 'text-right' : '',
            ]"
            :style="item.key === 'name' ? { paddingLeft: headerNamePadding } : undefined"
          >
            {{ item.label }}
          </div>
        </div>

        <div v-if="!rootChildren.length" class="flex min-h-[220px] flex-col items-center justify-center gap-3 px-4 text-center">
          <p class="text-[13px] text-[#8e90a1]">还没有参数，先创建一个顶层字段。</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            class="rounded-[10px]"
            :disabled="!canAddRoot"
            @click="onAddRootProperty"
          >
            <Plus class="mr-1 size-3.5" />
            新增参数
          </Button>
        </div>

        <div v-else ref="treeLayerRef" class="relative min-w-full">
          <SchemaCompactRuntimeRow
            v-for="(child, index) in rootChildren"
            :key="child.id"
            :node="child"
            :parent-node-id="null"
            :level="0"
            :is-last="index === rootChildren.length - 1"
            :lineage="[]"
            :selected-id="editorState.selection.nodeId"
            :tree-expanded-ids="treeExpandedIds"
            :detail-open-ids="detailOpenIds"
            :show-tree-affordance="showTreeAffordance"
            :layout="layout"
            :inline-visibility="inlineVisibility"
            :detail-visibility="detailVisibility"
            :mode="runtimeMode"
            :issues="allIssues"
            :can-edit="canEdit"
            :role-options="roleOptions"
            :value-ref-tree="valueRefTree"
            @select="onSelect"
            @toggle-tree="onToggleTree"
            @toggle-detail="onToggleDetail"
            @set-field="onSetField"
            @change-type="onChangeType"
            @add-property="onAddProperty"
            @add-item="onAddItem"
            @delete-node="onDeleteNode"
          >
            <template v-if="$slots['value-ref-picker']" #value-ref-picker="slotProps">
              <slot name="value-ref-picker" v-bind="slotProps" />
            </template>
          </SchemaCompactRuntimeRow>

          <svg
            v-if="overlayPaths.length"
            class="pointer-events-none absolute inset-0 z-10 size-full overflow-visible"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              v-for="path in overlayPaths"
              :key="path.key"
              :d="path.d"
              fill="none"
              stroke="#e6e4ee"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1"
            />
          </svg>
        </div>
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>

    <Dialog v-model:open="isImportOpen">
      <DialogContent class="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>
            导入
            {{
              importMode === "parameter"
                ? "ParameterSchema"
                : importMode === "json-schema"
                  ? "JSON Schema"
                  : "JSON"
            }}
          </DialogTitle>
          <DialogDescription>粘贴 JSON 内容以生成新的参数树。</DialogDescription>
        </DialogHeader>
        <div class="space-y-2">
          <MonacoEditor v-model="importText" language="json" height="260px" />
          <p v-if="importError" class="text-xs text-[#d45460]">{{ importError }}</p>
        </div>
        <DialogFooter>
          <Button type="button" size="sm" variant="outline" @click="isImportOpen = false">取消</Button>
          <Button type="button" size="sm" @click="applyImport">应用</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
