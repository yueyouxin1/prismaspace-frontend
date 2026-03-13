<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { SchemaEditorAction, SchemaEditorState, SchemaIssue, SchemaNode, SchemaType } from "../core";
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
import type { ParamSchemaRuntimeMode } from "./mode";
import type { VariableTreeNode } from "./tree-types";
import type { CompactRuntimeLayout } from "./compact-runtime-layout";
import {
  canEditFieldInMode,
  canMutateStructureInMode,
} from "./mode";
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

const props = withDefaults(
  defineProps<{
    state: SchemaEditorState;
    dispatch: (action: SchemaEditorAction) => void;
    canEdit?: (node: SchemaNode) => boolean;
    roleOptions?: string[];
    runtimeMode?: ParamSchemaRuntimeMode;
    valueRefTree?: VariableTreeNode[];
  }>(),
  {
    runtimeMode: "define",
    valueRefTree: () => [],
  },
);

const containerRef = ref<HTMLElement | null>(null);
const layoutWidth = ref(0);
const treeExpandedIds = ref<string[]>([]);
const detailOpenIds = ref<string[]>([]);
const localIssues = ref<SchemaIssue[]>([]);
const isImportOpen = ref(false);
const importMode = ref<"parameter" | "json-schema" | "json">("json-schema");
const importText = ref("");
const importError = ref<string | null>(null);
let resizeObserver: ResizeObserver | null = null;

const nameIdManager = new IdManager({ idKey: "uid", onDuplicate: "reassign" });

const runtimeMode = computed<ParamSchemaRuntimeMode>(() => props.runtimeMode);
const rootChildren = computed(() => props.state.tree.children ?? []);
const canUndo = computed(() => props.state.undoStack.length > 0);
const canRedo = computed(() => props.state.redoStack.length > 0);
const validation = computed(() => validateTree(props.state.tree));
const allIssues = computed(() => [...validation.value.issues, ...localIssues.value]);
const issueCount = computed(() => allIssues.value.length);

const layout = computed<CompactRuntimeLayout>(() => resolveCompactLayout(runtimeMode.value, layoutWidth.value));
const expandedSet = computed(() => new Set(treeExpandedIds.value));
const contentMinWidth = computed(() => {
  const depth = collectVisibleMaxDepth(props.state.tree, expandedSet.value);
  const treeIndentWidth = 18 + depth * 16;
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
  const requiredMin = layout.value.inlineRequired ? 34 : 0;
  const actionsMin = layout.value.actionButtons > 1 ? 54 : layout.value.actionButtons === 1 ? 34 : 0;
  return treeIndentWidth + nameInputMin + typeMin + valueMin + requiredMin + actionsMin + 22;
});
const modeLabel = computed(() => {
  if (runtimeMode.value === "define") return "Define";
  if (runtimeMode.value === "refine") return "Refine";
  if (runtimeMode.value === "bind") return "Bind";
  if (runtimeMode.value === "default") return "Default";
  return "Read";
});

const headerLabels = computed(() => {
  const labels = [{ key: "name", label: "变量名" }];
  if (layout.value.inlineType) labels.push({ key: "type", label: "变量类型" });
  if (layout.value.valueField === "value") labels.push({ key: "value", label: "变量值" });
  if (layout.value.valueField === "default") labels.push({ key: "default", label: "默认值" });
  if (layout.value.inlineRequired) labels.push({ key: "required", label: "必填" });
  if (layout.value.actionButtons > 0) labels.push({ key: "actions", label: "" });
  return labels;
});

const showHeader = computed(() => runtimeMode.value !== "read");
const canAddRoot = computed(() => {
  if (!canMutateStructureInMode(runtimeMode.value)) return false;
  return props.canEdit ? props.canEdit(props.state.tree) : true;
});

const exportPayloads = computed(() => ({
  parameter: JSON.stringify(exportParameterSchema(props.state.tree), null, 2),
  "json-schema": JSON.stringify(exportJsonSchema(props.state.tree), null, 2),
  json: JSON.stringify(exportJsonValue(props.state.tree), null, 2),
}));

watch(
  () => props.state.tree,
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
  () => props.state.selection.nodeId,
  (selectedId) => {
    if (!selectedId) return;
    const path = findPathToNode(props.state.tree, selectedId);
    if (!path.length) return;
    const next = new Set(treeExpandedIds.value);
    path.slice(0, -1).forEach((nodeId) => next.add(nodeId));
    treeExpandedIds.value = [...next];
    if (
      !detailOpenIds.value.length
      && (runtimeMode.value === "define" || runtimeMode.value === "default")
    ) {
      detailOpenIds.value = [selectedId];
    }
  },
  { immediate: true },
);

watch(
  [() => props.state.tree, () => props.state.selection.nodeId],
  ([root, selectedNodeId]) => {
    if (selectedNodeId) return;
    const first = root.children?.[0] ?? null;
    if (first) props.dispatch({ type: "select", nodeId: first.id });
  },
  { immediate: true },
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
});

function resolveCompactLayout(mode: ParamSchemaRuntimeMode, width: number): CompactRuntimeLayout {
  const density = width < 360 ? "xs" : width < 520 ? "sm" : width < 760 ? "md" : "lg";
  const railWidth = density === "xs" ? 22 : density === "sm" ? 28 : density === "md" ? 32 : 36;

  if (mode === "read") {
    return {
      density,
      railWidth,
      gridTemplate: "minmax(0,1fr)",
      inlineType: false,
      inlineRequired: false,
      inlineDefault: false,
      valueField: null,
      readBadgeOnly: true,
      actionButtons: 0,
    };
  }

  if (mode === "bind" || mode === "refine") {
    return {
      density,
      railWidth,
      gridTemplate:
        density === "xs"
          ? "minmax(0,1fr) minmax(112px,1fr) 38px"
          : "minmax(0,1.08fr) minmax(152px,1.12fr) 44px",
      inlineType: false,
      inlineRequired: false,
      inlineDefault: false,
      valueField: "value",
      readBadgeOnly: false,
      actionButtons: 1,
    };
  }

  if (mode === "default") {
    return {
      density,
      railWidth,
      gridTemplate:
        density === "xs"
          ? "minmax(0,1fr) minmax(108px,1fr) 38px"
          : "minmax(0,1.1fr) minmax(148px,1.1fr) 44px",
      inlineType: false,
      inlineRequired: false,
      inlineDefault: true,
      valueField: "default",
      readBadgeOnly: false,
      actionButtons: 1,
    };
  }

  if (width >= 720) {
    return {
      density,
      railWidth,
      gridTemplate: "minmax(0,1.16fr) 108px minmax(124px,0.92fr) 40px 72px",
      inlineType: true,
      inlineRequired: true,
      inlineDefault: true,
      valueField: "default",
      readBadgeOnly: false,
      actionButtons: 2,
    };
  }

  return {
    density,
    railWidth,
    gridTemplate: "minmax(0,1fr) 104px 38px 68px",
    inlineType: true,
    inlineRequired: true,
    inlineDefault: false,
    valueField: null,
    readBadgeOnly: false,
    actionButtons: 2,
  };
}

function canAccessNode(node: SchemaNode) {
  return props.canEdit ? props.canEdit(node) : true;
}

function canMutateStructure(node: SchemaNode) {
  return canAccessNode(node) && canMutateStructureInMode(runtimeMode.value);
}

function onSelect(nodeId: string) {
  if (props.state.selection.nodeId === nodeId) return;
  props.dispatch({ type: "select", nodeId });
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
  const node = findNodeById(props.state.tree, payload.nodeId);
  if (!node) return;
  if (!canAccessNode(node) || !canEditFieldInMode(runtimeMode.value, payload.field as never)) return;

  if (payload.field === "name" && typeof payload.value === "string") {
    const trimmed = payload.value.trim();
    if (node.kind !== "property") return;
    const parentInfo = findParentInfo(props.state.tree, payload.nodeId);
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

  const op = createSetFieldOp(props.state.tree, payload.nodeId, payload.field, payload.value);
  if (!op) return;
  props.dispatch({ type: "apply", op });
}

function onChangeType(payload: { nodeId: string; nextType: SchemaType; itemType?: SchemaType }) {
  const node = findNodeById(props.state.tree, payload.nodeId);
  if (!node) return;
  if (!canAccessNode(node) || !canEditFieldInMode(runtimeMode.value, "type")) return;

  if (payload.nextType === "array" && payload.itemType) {
    if (node.type === "array" && node.item?.type === payload.itemType) return;
    const nextNode = buildArrayTypeNode(props.state.tree, node, payload.itemType);
    if (!nextNode) return;
    const replaceOp = createReplaceNodeOp(props.state.tree, payload.nodeId, nextNode);
    if (!replaceOp) return;
    props.dispatch({ type: "apply", op: replaceOp });
    return;
  }

  if (node.type === payload.nextType && !payload.itemType) return;
  const op = createChangeTypeOp(props.state.tree, payload.nodeId, payload.nextType, "stash");
  if (!op) return;
  props.dispatch({ type: "apply", op });
}

function onAddProperty(parentId: string) {
  const node = findNodeById(props.state.tree, parentId);
  if (!node || node.type !== "object") return;
  if (!canMutateStructure(node)) return;
  const nameId = allocateNameId(props.state.tree);
  const child = createSchemaNode({
    kind: "property",
    type: "string",
    name: `param_${nameId}`,
    uid: nameId,
    required: false,
    open: true,
  });
  props.dispatch({ type: "apply", op: createAddPropertyOp(parentId, child) });
}

function onAddRootProperty() {
  if (!canAddRoot.value) return;
  onAddProperty(props.state.tree.id);
}

function onAddItem(parentId: string) {
  const node = findNodeById(props.state.tree, parentId);
  if (!node || node.type !== "array") return;
  if (!canMutateStructure(node)) return;
  const itemNode = createSchemaNode({ kind: "item", type: "string" });
  const op = createSetFieldOp(props.state.tree, parentId, "item", itemNode);
  if (!op) return;
  props.dispatch({ type: "apply", op });
}

function onDeleteNode(nodeId: string) {
  const node = findNodeById(props.state.tree, nodeId);
  if (!node || node.kind === "root" || node.kind === "item") return;
  if (!canMutateStructure(node)) return;
  const op = createRemoveNodeOp(props.state.tree, node.id);
  if (!op) return;
  props.dispatch({ type: "apply", op });
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

function openImport(mode: "parameter" | "json-schema" | "json") {
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
    props.dispatch({ type: "reset", tree: nextTree });
    treeExpandedIds.value = [];
    detailOpenIds.value = [];
    isImportOpen.value = false;
  } catch (error) {
    importError.value = error instanceof Error ? error.message : "Invalid JSON";
  }
}

async function copyExport(kind: "parameter" | "json-schema" | "json") {
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
</script>

<template>
  <div
    ref="containerRef"
    class="flex h-full min-h-0 flex-col overflow-hidden rounded-[16px] border border-[#eceaf2] bg-[#fcfcff]"
  >
    <div class="flex items-center justify-between border-b border-[#eceaf2] px-3 py-2">
      <div class="flex min-w-0 items-center gap-2">
        <span class="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#7a7b8f]">
          {{ modeLabel }}
        </span>
        <Badge variant="secondary" class="rounded-full bg-[#f2f3f8] text-[#66687d]">
          {{ rootChildren.length }} 项
        </Badge>
        <button
          v-if="issueCount"
          type="button"
          class="inline-flex items-center gap-1 rounded-full bg-[#fff4f5] px-2 py-1 text-[11px] font-medium text-[#d45460]"
          :title="allIssues.map((issue) => issue.message).join('\n')"
        >
          <AlertCircle class="size-3.5" />
          {{ issueCount }}
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
          @click="onAddRootProperty"
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
          @click="props.dispatch({ type: 'undo' })"
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
          @click="props.dispatch({ type: 'redo' })"
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
          class="sticky top-0 z-10 grid items-center gap-0 border-b border-[#eceaf2] bg-[#f6f6fb]/95 px-2 py-1 text-[11px] font-semibold text-[#8b8ca0] backdrop-blur"
          :style="{ gridTemplateColumns: layout.gridTemplate }"
        >
          <div
            v-for="item in headerLabels"
            :key="item.key"
            :class="[
              'px-1.5',
              item.key === 'required' ? 'text-center' : '',
              item.key === 'actions' ? 'text-right' : '',
            ]"
            :style="item.key === 'name' ? { paddingLeft: '26px' } : undefined"
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

        <div v-else class="min-w-full">
          <SchemaCompactRuntimeRow
            v-for="(child, index) in rootChildren"
            :key="child.id"
            :node="child"
            :level="0"
            :is-last="index === rootChildren.length - 1"
            :lineage="[]"
            :selected-id="props.state.selection.nodeId"
            :tree-expanded-ids="treeExpandedIds"
            :detail-open-ids="detailOpenIds"
            :layout="layout"
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
