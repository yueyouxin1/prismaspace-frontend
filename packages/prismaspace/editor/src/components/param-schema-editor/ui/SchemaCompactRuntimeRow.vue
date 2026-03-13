<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { SchemaIssue, SchemaNode, SchemaType, ValueRefContent } from "../core";
import type { ParamSchemaRuntimeMode } from "./mode";
import type { VariableTreeNode } from "./tree-types";
import type { CompactRuntimeLayout } from "./compact-runtime-layout";
import {
  canEditFieldInMode,
  canMutateStructureInMode,
} from "./mode";
import {
  formatRuntimeValueSummary,
  getDefaultLiteral,
  getNodeChildren,
  getRuntimeValueKind,
  getSchemaTypeDisplay,
  parseValueByType,
  schemaTypeLabelMap,
  schemaTypeShortLabelMap,
  schemaTypes,
  serializeJson,
} from "./runtime-editor-utils";
import { Input } from "@prismaspace/ui-shadcn/components/ui/input";
import { Textarea } from "@prismaspace/ui-shadcn/components/ui/textarea";
import { Button } from "@prismaspace/ui-shadcn/components/ui/button";
import { Checkbox } from "@prismaspace/ui-shadcn/components/ui/checkbox";
import { Badge } from "@prismaspace/ui-shadcn/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@prismaspace/ui-shadcn/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@prismaspace/ui-shadcn/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@prismaspace/ui-shadcn/components/ui/select";
import {
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Hexagon,
  Info,
  Link2,
  Minus,
  Plus,
} from "lucide-vue-next";
import SchemaValueRefTreePanel from "./SchemaValueRefTreePanel.vue";
import SchemaTypePicker from "./SchemaTypePicker.vue";
import { schemaTreeOverlayKey, TREE_BASE_RAIL, TREE_INDENT } from "./tree-visuals";
import { MonacoEditor } from "../../monaco-editor";

defineOptions({ name: "SchemaCompactRuntimeRow" });
defineSlots<{
  "value-ref-picker"?: (props: Record<string, unknown>) => unknown;
}>();

const props = defineProps<{
  node: SchemaNode;
  parentNodeId?: string | null;
  level: number;
  isLast: boolean;
  lineage: boolean[];
  selectedId: string | null;
  treeExpandedIds: string[];
  detailOpenIds: string[];
  layout: CompactRuntimeLayout;
  mode: ParamSchemaRuntimeMode;
  issues: SchemaIssue[];
  canEdit?: (node: SchemaNode) => boolean;
  roleOptions?: string[];
  valueRefTree?: VariableTreeNode[];
}>();

const emit = defineEmits<{
  (event: "select", nodeId: string): void;
  (event: "toggle-tree", nodeId: string): void;
  (event: "toggle-detail", nodeId: string): void;
  (event: "set-field", payload: { nodeId: string; field: keyof SchemaNode; value: unknown }): void;
  (event: "change-type", payload: { nodeId: string; nextType: SchemaType; itemType?: SchemaType }): void;
  (event: "add-property", parentId: string): void;
  (event: "add-item", parentId: string): void;
  (event: "delete-node", nodeId: string): void;
}>();

const ROW_HEADER_HEIGHT = 40;
const UNSET = "__unset__";
const BOOLEAN_TRUE = "__true__";
const BOOLEAN_FALSE = "__false__";

const isSelected = computed(() => props.selectedId === props.node.id);
const isProperty = computed(() => props.node.kind === "property");
const isItem = computed(() => props.node.kind === "item");
const arrayObjectItem = computed(() => {
  if (props.node.type !== "array" || !props.node.item || props.node.item.type !== "object") return null;
  return props.node.item;
});
const children = computed(() => {
  if (props.node.type === "array") {
    if (arrayObjectItem.value) return arrayObjectItem.value.children ?? [];
    return [];
  }
  return getNodeChildren(props.node);
});
const hasChildren = computed(() => children.value.length > 0);
const isExpanded = computed(() => props.treeExpandedIds.includes(props.node.id));
const isDetailOpen = computed(() => props.detailOpenIds.includes(props.node.id));
const isAccessible = computed(() => (props.canEdit ? props.canEdit(props.node) : true));
const nodeIssues = computed(() => props.issues.filter((issue) => issue.nodeId === props.node.id));

const canEditName = computed(() => isProperty.value && isAccessible.value && canEditFieldInMode(props.mode, "name"));
const canEditType = computed(() => isAccessible.value && canEditFieldInMode(props.mode, "type"));
const canEditRequired = computed(
  () => isProperty.value && isAccessible.value && canEditFieldInMode(props.mode, "required"),
);
const canEditOpen = computed(() => isProperty.value && isAccessible.value && canEditFieldInMode(props.mode, "open"));
const canEditDefault = computed(() => isAccessible.value && canEditFieldInMode(props.mode, "default"));
const canEditDescription = computed(() => isAccessible.value && canEditFieldInMode(props.mode, "description"));
const canEditRole = computed(() => isAccessible.value && canEditFieldInMode(props.mode, "role"));
const canEditLabel = computed(() => isAccessible.value && canEditFieldInMode(props.mode, "label"));
const canEditEnum = computed(() => isAccessible.value && canEditFieldInMode(props.mode, "enum"));
const canEditMeta = computed(() => isAccessible.value && canEditFieldInMode(props.mode, "meta"));
const canEditValue = computed(() => isAccessible.value && canEditFieldInMode(props.mode, "value"));
const canMutateStructure = computed(() => isAccessible.value && canMutateStructureInMode(props.mode));

const canAddChild = computed(() => {
  if (!canMutateStructure.value) return false;
  if (props.node.type === "object") return true;
  if (props.node.type === "array") {
    if (!props.node.item) return true;
    return props.node.item.type === "object";
  }
  return false;
});
const canDelete = computed(() => isProperty.value && canMutateStructure.value);
const currentBranchX = computed(() => TREE_BASE_RAIL + props.level * TREE_INDENT);
const parentBranchX = computed(() => (props.level > 0 ? TREE_BASE_RAIL + (props.level - 1) * TREE_INDENT : 0));
const treeRailWidth = computed(() => currentBranchX.value + 9);
const showSubtreeBody = computed(() => isDetailOpen.value || (hasChildren.value && isExpanded.value));
const rowShellRef = ref<HTMLElement | null>(null);
const overlayApi = inject(schemaTreeOverlayKey, null);
let rowResizeObserver: ResizeObserver | null = null;

const nodeTitle = computed(() => {
  if (isItem.value) return "items";
  return props.node.name || props.node.label || "param";
});
const typeDisplay = computed(() => getSchemaTypeDisplay(props.node));
const currentValueKind = computed(() => getRuntimeValueKind(props.node.value));

const canEditInlineDefault = computed(() => {
  return (
    canEditDefault.value
    && (props.node.type === "string" || props.node.type === "number" || props.node.type === "integer" || props.node.type === "boolean")
  );
});

const defaultDisplay = computed(() => serializeJson(props.node.default));
const inlineValueSummary = computed(() => formatRuntimeValueSummary(props.node.value));
const detailPanelOffset = computed(() => `${treeRailWidth.value + 8}px`);
const hasExpandableDetail = computed(() => {
  if (props.mode === "read") {
    return Boolean(props.node.description || props.node.default !== undefined || props.node.value || props.node.meta);
  }
  if (props.mode === "bind") return currentValueKind.value === "expr" || currentValueKind.value === "ref";
  if (props.mode === "default") return props.node.type === "object" || props.node.type === "array" || Boolean(props.node.description);
  return true;
});

const nameDraft = ref("");
const defaultDraft = ref("");
const descriptionDraft = ref("");
const labelDraft = ref("");
const enumDraft = ref("");
const metaDraft = ref("");
const valueLiteralDraft = ref("");
const valueExprDraft = ref("");
const valueRefBlockId = ref("");
const valueRefPath = ref("");
const valueRefSource = ref("");
const valueError = ref<string | null>(null);
const defaultError = ref<string | null>(null);
const enumError = ref<string | null>(null);
const metaError = ref<string | null>(null);
const refPickerOpen = ref(false);

watch(
  () => [props.node.id, props.node.name, props.node.default, props.node.value, props.node.description, props.node.label, props.node.enum, props.node.meta] as const,
  () => {
    nameDraft.value = props.node.name ?? "";
    defaultDraft.value = serializeJson(props.node.default);
    descriptionDraft.value = props.node.description ?? "";
    labelDraft.value = props.node.label ?? "";
    enumDraft.value = serializeJson(props.node.enum);
    metaDraft.value = serializeJson(props.node.meta);
    syncValueDrafts();
    valueError.value = null;
    defaultError.value = null;
    enumError.value = null;
    metaError.value = null;
  },
  { immediate: true, deep: true },
);

function syncValueDrafts() {
  const value = props.node.value;
  if (!value) {
    valueLiteralDraft.value = "";
    valueExprDraft.value = "";
    valueRefBlockId.value = "";
    valueRefPath.value = "";
    valueRefSource.value = "";
    return;
  }
  if (value.type === "literal") {
    valueLiteralDraft.value = serializeJson(value.content);
    valueExprDraft.value = "";
    valueRefBlockId.value = "";
    valueRefPath.value = "";
    valueRefSource.value = "";
    return;
  }
  if (value.type === "expr") {
    valueLiteralDraft.value = "";
    valueExprDraft.value = value.content ?? "";
    valueRefBlockId.value = "";
    valueRefPath.value = "";
    valueRefSource.value = "";
    return;
  }
  valueLiteralDraft.value = "";
  valueExprDraft.value = "";
  valueRefBlockId.value = value.content.blockID ?? "";
  valueRefPath.value = value.content.path ?? "";
  valueRefSource.value = value.content.source ?? "";
}

function onSelectRow() {
  emit("select", props.node.id);
}

function toggleTree() {
  if (!hasChildren.value) return;
  emit("toggle-tree", props.node.id);
}

function toggleDetail() {
  if (!hasExpandableDetail.value) return;
  emit("toggle-detail", props.node.id);
}

function emitField(field: keyof SchemaNode, value: unknown) {
  emit("set-field", { nodeId: props.node.id, field, value });
}

function commitName() {
  if (!canEditName.value) return;
  emitField("name", nameDraft.value);
}

function commitDefault(raw = defaultDraft.value) {
  if (!canEditDefault.value) return;
  const parsed = parseValueByType(raw, props.node.type, "default");
  if (!parsed.ok) {
    defaultError.value = parsed.error;
    return;
  }
  defaultError.value = null;
  emitField("default", parsed.value);
}

function commitDescription() {
  if (!canEditDescription.value) return;
  emitField("description", descriptionDraft.value.trim() || undefined);
}

function commitLabel() {
  if (!canEditLabel.value) return;
  emitField("label", labelDraft.value.trim() || undefined);
}

function commitEnum() {
  if (!canEditEnum.value) return;
  if (!enumDraft.value.trim()) {
    enumError.value = null;
    emitField("enum", undefined);
    return;
  }
  try {
    const parsed = JSON.parse(enumDraft.value);
    if (!Array.isArray(parsed)) {
      enumError.value = "枚举必须是 JSON 数组。";
      return;
    }
    enumError.value = null;
    emitField("enum", parsed);
  } catch {
    enumError.value = "枚举必须是合法 JSON。";
  }
}

function commitMeta() {
  if (!canEditMeta.value) return;
  if (!metaDraft.value.trim()) {
    metaError.value = null;
    emitField("meta", undefined);
    return;
  }
  try {
    const parsed = JSON.parse(metaDraft.value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      metaError.value = "Meta 必须是 JSON 对象。";
      return;
    }
    metaError.value = null;
    emitField("meta", parsed);
  } catch {
    metaError.value = "Meta 必须是合法 JSON。";
  }
}

function onTypeChange(payload: { nextType: SchemaType; itemType?: SchemaType }) {
  if (!canEditType.value) return;
  emit("change-type", { nodeId: props.node.id, nextType: payload.nextType, itemType: payload.itemType });
}

function onRequiredChange(value: boolean | "indeterminate") {
  if (!canEditRequired.value) return;
  emitField("required", value === "indeterminate" ? false : Boolean(value));
}

function onOpenChange(value: boolean | "indeterminate") {
  if (!canEditOpen.value) return;
  emitField("open", value === "indeterminate" ? true : Boolean(value));
}

function onAddChild() {
  if (!canAddChild.value) return;
  if (props.node.type === "object") {
    emit("add-property", props.node.id);
  } else if (props.node.type === "array") {
    if (!props.node.item) emit("add-item", props.node.id);
    else if (props.node.item.type === "object") emit("add-property", props.node.item.id);
  }
  if (!isExpanded.value) emit("toggle-tree", props.node.id);
}

function onDeleteNode() {
  if (!canDelete.value) return;
  emit("delete-node", props.node.id);
}

function onValueModeChange(next: "literal" | "expr" | "ref" | "unset") {
  if (!canEditValue.value) return;
  valueError.value = null;
  if (next === "unset") {
    emitField("value", undefined);
    return;
  }
  if (next === "literal") {
    emitField("value", { type: "literal", content: getDefaultLiteral(props.node.type) });
    return;
  }
  if (next === "expr") {
    emitField("value", { type: "expr", content: "" });
    return;
  }
  emitField("value", { type: "ref", content: { blockID: "", path: "" } });
}

function commitValueLiteral(raw = valueLiteralDraft.value) {
  if (!canEditValue.value) return;
  const parsed = parseValueByType(raw, props.node.type, "value");
  if (!parsed.ok) {
    valueError.value = parsed.error;
    return;
  }
  valueError.value = null;
  if (parsed.value === undefined) {
    emitField("value", undefined);
    return;
  }
  emitField("value", { type: "literal", content: parsed.value });
}

function commitValueExpr(raw = valueExprDraft.value) {
  if (!canEditValue.value) return;
  valueError.value = null;
  emitField("value", raw.trim() ? { type: "expr", content: raw } : undefined);
}

function commitValueRefField(field: keyof ValueRefContent, raw: string) {
  if (!canEditValue.value) return;
  if (field === "blockID") valueRefBlockId.value = raw;
  if (field === "path") valueRefPath.value = raw;
  if (field === "source") valueRefSource.value = raw;
  const nextRef: ValueRefContent = {
    blockID: valueRefBlockId.value,
    path: valueRefPath.value,
  };
  if (valueRefSource.value.trim()) nextRef.source = valueRefSource.value.trim();
  emitField("value", nextRef.blockID || nextRef.path ? { type: "ref", content: nextRef } : undefined);
}

function onPickReference(ref: ValueRefContent) {
  refPickerOpen.value = false;
  commitValueRefField("blockID", ref.blockID);
  commitValueRefField("path", ref.path);
  commitValueRefField("source", ref.source ?? "");
}

function onInlineValueCommit(event?: KeyboardEvent) {
  if (event) {
    event.preventDefault();
    (event.currentTarget as HTMLInputElement | HTMLTextAreaElement | null)?.blur();
  }
  if (currentValueKind.value === "expr") {
    commitValueExpr();
    return;
  }
  if (currentValueKind.value === "literal") {
    commitValueLiteral();
  }
}

function booleanValueForDefault() {
  if (props.node.default === true) return BOOLEAN_TRUE;
  if (props.node.default === false) return BOOLEAN_FALSE;
  return UNSET;
}

function onBooleanDefaultChange(value: string) {
  if (!canEditDefault.value) return;
  if (value === UNSET) {
    emitField("default", undefined);
    return;
  }
  emitField("default", value === BOOLEAN_TRUE);
}

function onRoleChange(value: string) {
  if (!canEditRole.value) return;
  emitField("role", value === UNSET ? undefined : value);
}

function onArrayItemTypeChange(nextType: string) {
  if (props.node.type !== "array" || !props.node.item || !canEditType.value) return;
  if (!schemaTypes.includes(nextType as SchemaType)) return;
  emit("change-type", { nodeId: props.node.item.id, nextType: nextType as SchemaType });
}

function onDetailBooleanDefaultChange(value: string) {
  if (!canEditDefault.value) return;
  defaultError.value = null;
  if (value === UNSET) {
    emitField("default", undefined);
    return;
  }
  emitField("default", value === BOOLEAN_TRUE);
}

function isIssueError(issue: SchemaIssue) {
  return issue.level === "error";
}

function syncOverlayRegistration() {
  if (!overlayApi || !rowShellRef.value) return;
  overlayApi.registerRow({
    id: props.node.id,
    parentId: props.parentNodeId ?? null,
    level: props.level,
    el: rowShellRef.value,
  });
}

onMounted(() => {
  syncOverlayRegistration();
  nextTick(() => overlayApi?.scheduleMeasure());

  if (rowShellRef.value && typeof ResizeObserver !== "undefined") {
    rowResizeObserver = new ResizeObserver(() => {
      overlayApi?.scheduleMeasure();
    });
    rowResizeObserver.observe(rowShellRef.value);
  }
});

onBeforeUnmount(() => {
  rowResizeObserver?.disconnect();
  rowResizeObserver = null;
  overlayApi?.unregisterRow(props.node.id);
  overlayApi?.scheduleMeasure();
});

watch(
  () => [props.node.id, props.parentNodeId, props.level] as const,
  () => {
    syncOverlayRegistration();
    nextTick(() => overlayApi?.scheduleMeasure());
  },
);

</script>

<template>
  <div class="relative">
    <div
      ref="rowShellRef"
      :class="[
        'relative grid items-stretch shadow-[inset_0_-1px_0_0_#eceaf2] transition-colors',
        isDetailOpen ? 'bg-[#f5f2ff]' : 'bg-transparent hover:bg-[#faf9fe]',
      ]"
      :style="{ gridTemplateColumns: layout.gridTemplate }"
      @click="onSelectRow"
    >
      <div class="relative z-20 px-2 py-1.5">
        <div class="relative min-h-8 min-w-0" :style="{ paddingLeft: `${treeRailWidth}px` }">
          <div class="absolute inset-y-0 left-0" :style="{ width: `${treeRailWidth}px` }">
            <button
              type="button"
              :disabled="!hasChildren"
              class="absolute top-1/2 inline-flex size-5 -translate-y-1/2 items-center justify-center rounded-[7px] text-[#7d7c92] hover:bg-white disabled:opacity-40"
              :style="{ left: `${currentBranchX - 10}px` }"
              @click.stop="toggleTree"
            >
              <ChevronDown v-if="hasChildren && isExpanded" class="size-3.5" />
              <ChevronRight v-else-if="hasChildren" class="size-3.5" />
              <span v-else class="size-3.5" />
            </button>
          </div>

          <div class="flex min-h-7 min-w-0 items-center gap-1.5">
            <Input
              v-if="isProperty && props.mode !== 'read' && props.mode !== 'bind' && props.mode !== 'default'"
              v-model="nameDraft"
              :disabled="!canEditName"
              class="h-7 min-w-0 w-full flex-1 rounded-[9px] border-[#dddce6] bg-white px-2 text-[13px]"
              placeholder="变量名"
              @click.stop
              @blur="commitName"
              @keydown.enter.prevent="commitName"
            />
            <span
              v-else
              class="min-w-0 flex-1 truncate text-[13px] font-medium text-[#2e3243]"
              :title="nodeTitle"
            >
              {{ nodeTitle }}
            </span>

            <button
              v-if="props.node.description"
              type="button"
              class="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-[#9a9bad] hover:bg-white"
              :title="props.node.description"
              @click.stop
            >
              <Info class="size-3.5" />
            </button>

            <Badge
              v-if="props.mode === 'read' || !layout.inlineType"
              variant="secondary"
              class="rounded-full bg-[#f3f3f8] px-1.5 py-0 text-[11px] font-medium text-[#6f7083]"
            >
              {{ typeDisplay }}
            </Badge>

            <span
              v-if="nodeIssues.length"
              :class="[
                'inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-semibold',
                nodeIssues.some(isIssueError) ? 'bg-[#ffe8e9] text-[#d14f5c]' : 'bg-[#fff4db] text-[#bf8a29]',
              ]"
            >
              {{ nodeIssues.length }}
            </span>
          </div>
        </div>
      </div>

      <div v-if="layout.inlineType" class="relative z-20 px-1 py-1.5" @click.stop>
        <SchemaTypePicker
          :node="props.node"
          :disabled="!canEditType"
          compact
          @change="onTypeChange"
        />
      </div>

      <div
        v-if="layout.valueField === 'value'"
        class="relative z-20 px-1 py-1.5"
        @click.stop
      >
        <div class="flex min-h-7 items-center gap-1 rounded-[9px] border border-[#dddce6] bg-white px-1">
          <span class="inline-flex shrink-0 items-center rounded-[8px] bg-[#f5f4fa] px-1.5 py-1 text-[11px] font-medium text-[#66687b]">
            {{ schemaTypeShortLabelMap[props.node.type] }}
          </span>

          <Input
            v-if="currentValueKind === 'literal' && (props.node.type === 'string' || props.node.type === 'number' || props.node.type === 'integer')"
            v-model="valueLiteralDraft"
            :disabled="!canEditValue"
            class="h-6 min-w-0 border-0 bg-transparent px-1 text-[12px] shadow-none focus-visible:ring-0"
            :placeholder="props.mode === 'refine' ? '输入或覆盖值' : '输入或引用参数值'"
            @blur="commitValueLiteral"
            @keydown.enter="onInlineValueCommit"
          />

          <Select
            v-else-if="currentValueKind === 'literal' && props.node.type === 'boolean'"
            :disabled="!canEditValue"
            :model-value="valueLiteralDraft || UNSET"
            @update:model-value="commitValueLiteral($event === UNSET ? '' : String($event))"
          >
            <SelectTrigger class="h-6 min-w-0 border-0 bg-transparent px-1 text-[12px] shadow-none focus-visible:ring-0">
              <SelectValue placeholder="布尔值" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem :value="UNSET">未设置</SelectItem>
              <SelectItem value="true">true</SelectItem>
              <SelectItem value="false">false</SelectItem>
            </SelectContent>
          </Select>

          <button
            v-else-if="currentValueKind === 'ref'"
            type="button"
            class="flex min-w-0 flex-1 items-center gap-1 rounded-[7px] bg-[#f6f3ff] px-2 py-1 text-left text-[12px] text-[#5848a5]"
            :disabled="!canEditValue"
            @click="refPickerOpen = true"
          >
            <Link2 class="size-3.5 shrink-0" />
            <span class="truncate">
              {{ inlineValueSummary || "选择变量引用" }}
            </span>
          </button>

          <Input
            v-else-if="currentValueKind === 'expr'"
            v-model="valueExprDraft"
            :disabled="!canEditValue"
            class="h-6 min-w-0 border-0 bg-transparent px-1 text-[12px] shadow-none focus-visible:ring-0"
            placeholder="输入表达式"
            @blur="commitValueExpr"
            @keydown.enter="onInlineValueCommit"
          />

          <button
            v-else
            type="button"
            class="flex min-w-0 flex-1 items-center rounded-[8px] px-2 py-1 text-left text-[12px] text-[#9899a8]"
            :disabled="!canEditValue"
            @click="onValueModeChange('literal')"
          >
            点击输入值
          </button>

          <Popover v-model:open="refPickerOpen">
            <PopoverTrigger as-child>
              <Button
                v-if="currentValueKind === 'ref'"
                type="button"
                size="icon-sm"
                variant="ghost"
                class="size-6 shrink-0 rounded-[7px] text-[#6053ad]"
              >
                <Link2 class="size-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              side="bottom"
              :side-offset="6"
              class="flex h-[360px] w-[min(520px,calc(100vw-24px))] flex-col rounded-[18px] border-[#e9e7f1] p-3"
            >
              <SchemaValueRefTreePanel
                :tree="valueRefTree || []"
                :model-value="props.node.value?.type === 'ref' ? props.node.value.content : null"
                class="min-h-0 flex-1"
                @select="onPickReference"
                @request-close="refPickerOpen = false"
              >
                <template v-if="$slots['value-ref-picker']" #tree-panel="slotProps">
                  <slot name="value-ref-picker" v-bind="slotProps" />
                </template>
              </SchemaValueRefTreePanel>
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                class="size-6 shrink-0 rounded-[7px] text-[#7c7d90]"
              >
                <Hexagon class="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="min-w-[140px]">
              <DropdownMenuItem @select="onValueModeChange('literal')">字面量</DropdownMenuItem>
              <DropdownMenuItem @select="onValueModeChange('expr')">表达式</DropdownMenuItem>
              <DropdownMenuItem @select="onValueModeChange('ref')">变量引用</DropdownMenuItem>
              <DropdownMenuItem @select="onValueModeChange('unset')">清空</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div
        v-if="layout.valueField === 'default'"
        class="relative z-20 px-1 py-1.5"
        @click.stop
      >
        <Input
          v-if="props.node.type === 'string' || props.node.type === 'number' || props.node.type === 'integer'"
          v-model="defaultDraft"
          :disabled="!canEditInlineDefault"
          class="h-7 rounded-[9px] border-[#dddce6] bg-white px-2 text-[12px]"
          placeholder="默认值"
          @blur="commitDefault"
          @keydown.enter.prevent="commitDefault"
        />
        <Select
          v-else-if="props.node.type === 'boolean'"
          :disabled="!canEditDefault"
          :model-value="booleanValueForDefault()"
          @update:model-value="onBooleanDefaultChange(String($event))"
        >
          <SelectTrigger class="h-7 rounded-[9px] border-[#dddce6] bg-white px-2 text-[12px]">
            <SelectValue placeholder="默认值" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem :value="UNSET">未设置</SelectItem>
            <SelectItem :value="BOOLEAN_TRUE">true</SelectItem>
            <SelectItem :value="BOOLEAN_FALSE">false</SelectItem>
          </SelectContent>
        </Select>
        <button
          v-else
          type="button"
          class="flex h-7 w-full items-center rounded-[9px] border border-dashed border-[#dddce6] px-2 text-[12px] text-[#8f91a2]"
          @click="toggleDetail"
        >
          配置默认值
        </button>
      </div>

      <div
        v-if="layout.inlineRequired"
        class="relative z-20 flex items-center justify-center px-1 py-1.5"
        @click.stop
      >
        <Checkbox
          v-if="isProperty"
          :model-value="Boolean(props.node.required)"
          :disabled="!canEditRequired"
          class="border-[#cfcde0] data-[state=checked]:border-[#7366d5] data-[state=checked]:bg-[#7366d5]"
          @update:model-value="onRequiredChange"
        />
        <span v-else class="text-[11px] text-[#a0a2b1]">-</span>
      </div>

      <div
        v-if="layout.actionButtons > 0"
        class="relative z-20 flex items-center justify-end gap-0.5 px-1 py-1.5"
        @click.stop
      >
        <Button
          v-if="canAddChild"
          type="button"
          size="icon-sm"
          variant="ghost"
          class="size-6 rounded-[7px] text-[#6153ad]"
          :title="props.node.type === 'array' ? '添加数组项' : '添加子属性'"
          @click="onAddChild"
        >
          <Plus class="size-3.5" />
        </Button>
        <Button
          v-if="hasExpandableDetail"
          type="button"
          size="icon-sm"
          variant="ghost"
          class="size-6 rounded-[7px] text-[#7c7d90]"
          title="展开更多"
          @click="toggleDetail"
        >
          <ChevronsUpDown class="size-3.5" />
        </Button>
        <Button
          v-if="canDelete"
          type="button"
          size="icon-sm"
          variant="ghost"
          class="size-6 rounded-[7px] text-[#6f6f82] hover:bg-[#fff3f4] hover:text-[#d45460]"
          title="删除节点"
          @click="onDeleteNode"
        >
          <Minus class="size-3.5" />
        </Button>
      </div>
    </div>

    <div v-if="showSubtreeBody" class="relative">
      <div
        v-if="isDetailOpen"
        class="relative z-20 border-b border-[#eceaf2] bg-[#f5f2ff] px-3 py-3"
        :style="{ marginLeft: detailPanelOffset }"
      >
        <div class="grid gap-3" :class="layout.density === 'xs' ? 'grid-cols-1' : 'grid-cols-2'">
        <div v-if="props.mode === 'define' || props.mode === 'default' || props.mode === 'read'" class="space-y-1.5">
          <label class="text-[11px] font-medium text-[#7f8094]">默认值</label>
          <MonacoEditor
            v-if="props.node.type === 'object' || props.node.type === 'array'"
            :model-value="defaultDraft"
            language="json"
            height="180px"
            :read-only="!canEditDefault"
            @update:modelValue="defaultDraft = $event; commitDefault($event)"
          />
          <Select
            v-else-if="props.node.type === 'boolean' && !layout.inlineDefault"
            :disabled="!canEditDefault"
            :model-value="booleanValueForDefault()"
            @update:model-value="onDetailBooleanDefaultChange(String($event))"
          >
            <SelectTrigger class="h-8 rounded-[10px] border-[#dddce6] bg-white text-[12px]">
              <SelectValue placeholder="默认值" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem :value="UNSET">未设置</SelectItem>
              <SelectItem :value="BOOLEAN_TRUE">true</SelectItem>
              <SelectItem :value="BOOLEAN_FALSE">false</SelectItem>
            </SelectContent>
          </Select>
          <Input
            v-else-if="(props.node.type === 'number' || props.node.type === 'integer') && !layout.inlineDefault"
            v-model="defaultDraft"
            :disabled="!canEditDefault"
            type="number"
            class="h-8 rounded-[10px] border-[#dddce6] bg-white text-[12px]"
            placeholder="默认值"
            @blur="commitDefault"
            @keydown.enter.prevent="commitDefault"
          />
          <Input
            v-else-if="props.node.type === 'string' && !layout.inlineDefault"
            v-model="defaultDraft"
            :disabled="!canEditDefault"
            class="h-8 rounded-[10px] border-[#dddce6] bg-white text-[12px]"
            placeholder="默认值"
            @blur="commitDefault"
            @keydown.enter.prevent="commitDefault"
          />
          <p v-else class="rounded-[10px] border border-[#eceaf2] bg-white px-3 py-2 text-[12px] text-[#55586a]">
            {{ defaultDisplay || "未设置默认值" }}
          </p>
          <p v-if="defaultError" class="text-[11px] text-[#d45460]">{{ defaultError }}</p>
        </div>

        <div v-if="props.mode === 'define' || props.mode === 'read'" class="space-y-1.5">
          <label class="text-[11px] font-medium text-[#7f8094]">描述</label>
          <Textarea
            v-model="descriptionDraft"
            :disabled="!canEditDescription"
            class="min-h-[96px] rounded-[12px] border-[#dddce6] bg-white text-[12px]"
            placeholder="帮助描述此参数的用途"
            @blur="commitDescription"
          />
        </div>

        <div v-if="props.mode === 'define' || props.mode === 'read'" class="space-y-1.5">
          <label class="text-[11px] font-medium text-[#7f8094]">标签</label>
          <Input
            v-model="labelDraft"
            :disabled="!canEditLabel"
            class="h-8 rounded-[10px] border-[#dddce6] bg-white text-[12px]"
            placeholder="展示标签"
            @blur="commitLabel"
            @keydown.enter.prevent="commitLabel"
          />
        </div>

        <div v-if="props.mode === 'define' || props.mode === 'read'" class="space-y-1.5">
          <label class="text-[11px] font-medium text-[#7f8094]">角色</label>
          <Select
            v-if="roleOptions?.length"
            :disabled="!canEditRole"
            :model-value="props.node.role ?? UNSET"
            @update:model-value="onRoleChange(String($event))"
          >
            <SelectTrigger class="h-8 rounded-[10px] border-[#dddce6] bg-white text-[12px]">
              <SelectValue placeholder="角色" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem :value="UNSET">未设置</SelectItem>
              <SelectItem v-for="role in roleOptions" :key="role" :value="role">{{ role }}</SelectItem>
            </SelectContent>
          </Select>
          <Input
            v-else
            :disabled="!canEditRole"
            :model-value="props.node.role ?? ''"
            class="h-8 rounded-[10px] border-[#dddce6] bg-white text-[12px]"
            placeholder="system.type"
            @update:model-value="emitField('role', String($event).trim() || undefined)"
          />
        </div>

        <div v-if="props.node.type === 'array'" class="space-y-1.5">
          <label class="text-[11px] font-medium text-[#7f8094]">数组元素类型</label>
          <Select
            :disabled="!canEditType"
            :model-value="props.node.item?.type ?? 'string'"
            @update:model-value="onArrayItemTypeChange(String($event))"
          >
            <SelectTrigger class="h-8 rounded-[10px] border-[#dddce6] bg-white text-[12px]">
              <SelectValue placeholder="元素类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="type in schemaTypes" :key="type" :value="type">
                {{ schemaTypeLabelMap[type] }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div v-if="props.mode === 'define'" class="space-y-1.5">
          <label class="text-[11px] font-medium text-[#7f8094]">枚举（JSON 数组）</label>
          <Textarea
            v-model="enumDraft"
            :disabled="!canEditEnum"
            class="min-h-[96px] rounded-[12px] border-[#dddce6] bg-white text-[12px]"
            placeholder='["a", "b"]'
            @blur="commitEnum"
          />
          <p v-if="enumError" class="text-[11px] text-[#d45460]">{{ enumError }}</p>
        </div>

        <div v-if="props.mode === 'define'" class="space-y-1.5">
          <label class="text-[11px] font-medium text-[#7f8094]">Meta（JSON 对象）</label>
          <Textarea
            v-model="metaDraft"
            :disabled="!canEditMeta"
            class="min-h-[96px] rounded-[12px] border-[#dddce6] bg-white text-[12px]"
            placeholder='{"key":"value"}'
            @blur="commitMeta"
          />
          <p v-if="metaError" class="text-[11px] text-[#d45460]">{{ metaError }}</p>
        </div>

        <div v-if="props.mode === 'define' || props.mode === 'read'" class="space-y-1.5">
          <label class="flex items-center gap-2 text-[11px] font-medium text-[#7f8094]">
            <Checkbox
              :model-value="props.node.open ?? true"
              :disabled="!canEditOpen"
              class="border-[#cfcde0] data-[state=checked]:border-[#7366d5] data-[state=checked]:bg-[#7366d5]"
              @update:model-value="onOpenChange"
            />
            展开状态
          </label>
        </div>

        <div v-if="(props.mode === 'refine' || props.mode === 'bind') && currentValueKind === 'literal'" class="col-span-full space-y-1.5">
          <label class="text-[11px] font-medium text-[#7f8094]">值</label>
          <MonacoEditor
            v-if="props.node.type === 'object' || props.node.type === 'array'"
            :model-value="valueLiteralDraft"
            language="json"
            height="180px"
            :read-only="!canEditValue"
            @update:modelValue="valueLiteralDraft = $event; commitValueLiteral($event)"
          />
          <Select
            v-else-if="props.node.type === 'boolean'"
            :disabled="!canEditValue"
            :model-value="valueLiteralDraft || UNSET"
            @update:model-value="commitValueLiteral($event === UNSET ? '' : String($event))"
          >
            <SelectTrigger class="h-8 rounded-[10px] border-[#dddce6] bg-white text-[12px]">
              <SelectValue placeholder="值" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem :value="UNSET">未设置</SelectItem>
              <SelectItem value="true">true</SelectItem>
              <SelectItem value="false">false</SelectItem>
            </SelectContent>
          </Select>
          <Input
            v-else
            v-model="valueLiteralDraft"
            :disabled="!canEditValue"
            :type="props.node.type === 'number' || props.node.type === 'integer' ? 'number' : 'text'"
            class="h-8 rounded-[10px] border-[#dddce6] bg-white text-[12px]"
            placeholder="输入值"
            @blur="commitValueLiteral"
            @keydown.enter.prevent="commitValueLiteral"
          />
        </div>

        <div v-if="(props.mode === 'refine' || props.mode === 'bind') && currentValueKind === 'expr'" class="col-span-full space-y-1.5">
          <label class="text-[11px] font-medium text-[#7f8094]">表达式</label>
          <Textarea
            v-model="valueExprDraft"
            :disabled="!canEditValue"
            class="min-h-[96px] rounded-[12px] border-[#dddce6] bg-white text-[12px]"
            placeholder="{{ expression }}"
            @blur="commitValueExpr"
          />
        </div>

        <template v-if="(props.mode === 'refine' || props.mode === 'bind') && currentValueKind === 'ref'">
          <div class="space-y-1.5">
            <label class="text-[11px] font-medium text-[#7f8094]">引用节点</label>
            <Input
              v-model="valueRefBlockId"
              :disabled="!canEditValue"
              class="h-8 rounded-[10px] border-[#dddce6] bg-white text-[12px]"
              placeholder="blockID"
              @blur="commitValueRefField('blockID', valueRefBlockId)"
            />
          </div>
          <div class="space-y-1.5">
            <label class="text-[11px] font-medium text-[#7f8094]">引用路径</label>
            <Input
              v-model="valueRefPath"
              :disabled="!canEditValue"
              class="h-8 rounded-[10px] border-[#dddce6] bg-white text-[12px]"
              placeholder="path.to.value"
              @blur="commitValueRefField('path', valueRefPath)"
            />
          </div>
          <div class="space-y-1.5">
            <label class="text-[11px] font-medium text-[#7f8094]">来源标识</label>
            <Input
              v-model="valueRefSource"
              :disabled="!canEditValue"
              class="h-8 rounded-[10px] border-[#dddce6] bg-white text-[12px]"
              placeholder="source"
              @blur="commitValueRefField('source', valueRefSource)"
            />
          </div>
          <div class="flex items-end">
            <Button
              type="button"
              size="sm"
              variant="outline"
              class="rounded-[10px]"
              :disabled="!canEditValue || !valueRefTree?.length"
              @click="refPickerOpen = true"
            >
              <Link2 class="mr-1 size-3.5" />
              选择变量
            </Button>
          </div>
        </template>

        <div v-if="valueError" class="col-span-full rounded-[12px] border border-[#ffd6db] bg-[#fff6f7] px-3 py-2 text-[11px] text-[#d45460]">
          {{ valueError }}
        </div>
        </div>
      </div>

      <div class="relative">
        <div v-for="(child, index) in children" :key="child.id" class="relative z-10">
          <SchemaCompactRuntimeRow
            :node="child"
            :parent-node-id="props.node.id"
            :level="level + 1"
            :is-last="index === children.length - 1"
            :lineage="[...lineage, !isLast]"
            :selected-id="selectedId"
            :tree-expanded-ids="treeExpandedIds"
            :detail-open-ids="detailOpenIds"
            :layout="layout"
            :mode="mode"
            :issues="issues"
            :can-edit="canEdit"
            :role-options="roleOptions"
            :value-ref-tree="valueRefTree"
            @select="emit('select', $event)"
            @toggle-tree="emit('toggle-tree', $event)"
            @toggle-detail="emit('toggle-detail', $event)"
            @set-field="emit('set-field', $event)"
            @change-type="emit('change-type', $event)"
            @add-property="emit('add-property', $event)"
            @add-item="emit('add-item', $event)"
            @delete-node="emit('delete-node', $event)"
          >
            <template v-if="$slots['value-ref-picker']" #value-ref-picker="valueRefPickerSlotProps">
              <slot name="value-ref-picker" v-bind="valueRefPickerSlotProps" />
            </template>
          </SchemaCompactRuntimeRow>
        </div>
      </div>
    </div>
  </div>
</template>
