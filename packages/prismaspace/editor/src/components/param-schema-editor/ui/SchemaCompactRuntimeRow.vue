<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { SchemaIssue, SchemaNode, SchemaType, ValueRefContent } from "../core";
import type {
  ParamSchemaRegularDetailVisibility,
  ParamSchemaRegularInlineVisibility,
  ParamSchemaRuntimeMode,
} from "./mode";
import type { VariableTreeNode } from "./tree-types";
import type { CompactRuntimeLayout } from "./compact-runtime-layout";
import {
  canEditFieldInMode,
  canMutateStructureInMode,
} from "./mode";
import {
  getRuntimeValueEditLockMessage,
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
import { resolveValueRefValidation, useValueRefPickerController, type ValueRefPickerViewModel } from "./value-ref-picker";
import { Input } from "@prismaspace/ui-shadcn/components/ui/input";
import { Textarea } from "@prismaspace/ui-shadcn/components/ui/textarea";
import { Button } from "@prismaspace/ui-shadcn/components/ui/button";
import { Checkbox } from "@prismaspace/ui-shadcn/components/ui/checkbox";
import { Badge } from "@prismaspace/ui-shadcn/components/ui/badge";
import { Field, FieldError } from "@prismaspace/ui-shadcn/components/ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "@prismaspace/ui-shadcn/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@prismaspace/ui-shadcn/components/ui/select";
import { Toggle } from "@prismaspace/ui-shadcn/components/ui/toggle";
import {
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Info,
  Minus,
  Plus,
} from "lucide-vue-next";
import SchemaTypePicker from "./SchemaTypePicker.vue";
import SchemaInlineValueEditor from "./value-editor/SchemaInlineValueEditor.vue";
import SchemaLiteralValueInput from "./value-editor/SchemaLiteralValueInput.vue";
import SchemaValueLockPlaceholder from "./value-editor/SchemaValueLockPlaceholder.vue";
import SchemaValueRefTreePanel from "./SchemaValueRefTreePanel.vue";
import { schemaTreeOverlayKey, TREE_BASE_RAIL, TREE_INDENT } from "./tree-visuals";
import { MonacoTextareaEditor } from "../../monaco-editor";

defineOptions({ name: "SchemaCompactRuntimeRow" });
defineSlots<{
  "value-ref-picker"?: (props: { picker: ValueRefPickerViewModel; close: () => void }) => unknown;
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
  showTreeAffordance: boolean;
  layout: CompactRuntimeLayout;
  inlineVisibility: ParamSchemaRegularInlineVisibility;
  detailVisibility: ParamSchemaRegularDetailVisibility;
  mode: ParamSchemaRuntimeMode;
  issues: SchemaIssue[];
  canEdit?: (node: SchemaNode) => boolean;
  roleOptions?: string[];
  valueRefTree?: VariableTreeNode[];
  withinArrayValueContext?: boolean;
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
const isAccessible = computed(() => {
  const accessible = props.canEdit ? props.canEdit(props.node) : true;
  if (!accessible) return false;
  if (props.withinArrayValueContext && props.mode === "bind") return false;
  return true;
});
const nodeIssues = computed(() => props.issues.filter((issue) => issue.nodeId === props.node.id));
const nameFieldIssues = computed(() =>
  nodeIssues.value.filter((issue) =>
    issue.code === "property-name-missing" || issue.code === "property-name-duplicate" || issue.code === "property-name-duplicate-global",
  ),
);
const valueFieldIssues = computed(() =>
  nodeIssues.value.filter((issue) =>
    issue.code === "value-type-mismatch"
    || issue.code === "value-ref-missing"
    || issue.code === "value-ref-not-selectable"
    || issue.code === "value-ref-type-mismatch",
  ),
);

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
const runtimeValueLockMessage = computed(() =>
  getRuntimeValueEditLockMessage(props.node, props.mode, {
    withinArrayValueContext: props.withinArrayValueContext,
  }),
);
const canEditValue = computed(
  () => isAccessible.value && canEditFieldInMode(props.mode, "value") && !runtimeValueLockMessage.value,
);
const canMutateStructure = computed(() => isAccessible.value && canMutateStructureInMode(props.mode));

const canAddChild = computed(() => {
  if (!canMutateStructure.value) return false;
  if ((props.mode === "refine" || props.mode === "bind") && (props.node.type === "array" || props.withinArrayValueContext)) {
    return false;
  }
  if (props.node.type === "object") return true;
  if (props.node.type === "array") {
    if (!props.node.item) return true;
    return props.node.item.type === "object";
  }
  return false;
});
const canDelete = computed(() => isProperty.value && canMutateStructure.value);
const currentBranchX = computed(() => TREE_BASE_RAIL + props.level * TREE_INDENT);
const treeRailWidth = computed(() => (props.showTreeAffordance ? currentBranchX.value + 9 : 0));
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
const currentValueRefValidation = computed(() =>
  resolveValueRefValidation(
    props.node.type,
    props.node.value?.type === "ref" ? props.node.value.content : null,
    props.valueRefTree,
  ),
);
const inlineValueMode = computed<SchemaType | "expr">(() =>
  currentValueKind.value === "expr" ? "expr" : props.node.type,
);
const hasReferenceSelection = computed(
  () => props.node.value?.type === "ref" && Boolean(props.node.value.content.blockID || props.node.value.content.path),
);
const inlineRefValidationMessage = computed(() => {
  if (props.node.value?.type !== "ref") return null;
  if (!hasReferenceSelection.value) return null;
  if (currentValueRefValidation.value.status === "ok" || currentValueRefValidation.value.status === "empty") return null;
  return currentValueRefValidation.value.message;
});
const inlineMissingValueMessage = computed(() => {
  if (runtimeValueLockMessage.value) return null;
  if (props.mode !== "bind" && props.mode !== "refine") return null;
  const value = props.node.value;
  if (!value) return "变量值不可为空。";
  if (value.type === "ref") return null;
  if (value.type === "expr") {
    return value.content.trim() ? null : "变量值不可为空。";
  }
  if (props.node.type === "string") {
    return typeof value.content === "string" && value.content.length === 0 ? "变量值不可为空。" : null;
  }
  return value.content === undefined ? "变量值不可为空。" : null;
});
const showInlineNameInput = computed(
  () => props.inlineVisibility.name && isProperty.value && props.mode !== "read" && props.mode !== "bind",
);
const showInlineType = computed(() => props.layout.inlineType && props.inlineVisibility.type);
const showTypeBadge = computed(() => props.inlineVisibility.type && (props.mode === "read" || !props.layout.inlineType));
const showInlineValue = computed(() => props.layout.valueField === "value");
const showInlineDefault = computed(() => props.layout.valueField === "default");
const showDetailDefault = computed(() => {
  if (!props.detailVisibility.default) return false;
  return !showInlineDefault.value;
});
const showDetailDescription = computed(() => props.detailVisibility.description);
const showDetailLabel = computed(() => props.detailVisibility.label);
const showDetailRole = computed(() => props.detailVisibility.role);
const showDetailArrayItemType = computed(() => props.detailVisibility.arrayItemType && props.node.type === "array");
const showDetailEnum = computed(() => props.detailVisibility.enum);
const showDetailMeta = computed(() => props.detailVisibility.meta);
const showDetailOpen = computed(() => props.detailVisibility.open);
const showDetailValueLiteral = computed(() => {
  if (!props.detailVisibility.value) return false;
  if (props.mode !== "refine" && props.mode !== "bind") return false;
  if (currentValueKind.value !== "literal") return false;
  return props.node.type === "object" || props.node.type === "array" || !showInlineValue.value;
});
const showDetailValueExpr = computed(() => {
  if (!props.detailVisibility.value) return false;
  if (props.mode !== "refine" && props.mode !== "bind") return false;
  return currentValueKind.value === "expr" && !showInlineValue.value;
});
const showDetailValueRef = computed(() => {
  if (!props.detailVisibility.value) return false;
  if (props.mode !== "refine" && props.mode !== "bind") return false;
  return currentValueKind.value === "ref";
});
const valueRefPicker = useValueRefPickerController({
  getTree: () => props.valueRefTree,
  getModelValue: () => (props.node.value?.type === "ref" ? props.node.value.content : null),
  getExpectedType: () => props.node.type,
  rejectIncompatible: true,
  onSelect: (ref) => onPickReference(ref),
});
const detailPanelOffset = computed(() => `${treeRailWidth.value + 8}px`);
const hasExpandableDetail = computed(() => {
  return (
    showDetailDefault.value
    || showDetailDescription.value
    || showDetailLabel.value
    || showDetailRole.value
    || showDetailArrayItemType.value
    || showDetailEnum.value
    || showDetailMeta.value
    || showDetailOpen.value
    || showDetailValueLiteral.value
    || showDetailValueExpr.value
    || showDetailValueRef.value
  );
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
const inlineValueValidationMessage = computed(
  () => valueError.value ?? inlineRefValidationMessage.value ?? inlineMissingValueMessage.value,
);
const inlineValueErrors = computed(() => [
  ...valueFieldIssues.value.map((issue) => issue.message),
  ...(inlineValueValidationMessage.value ? [inlineValueValidationMessage.value] : []),
]);

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

function onDetailToggleChange(nextValue: boolean) {
  if (nextValue === isDetailOpen.value) return;
  toggleDetail();
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

function syncNodeType(nextType: SchemaType, itemType?: SchemaType) {
  if (!canEditType.value) return;
  if (
    props.node.type === nextType
    && (nextType !== "array" || !itemType || props.node.item?.type === itemType)
  ) {
    return;
  }
  emit("change-type", { nodeId: props.node.id, nextType, itemType });
}

function onInlineValueModeChange(payload: { nextType: SchemaType | "expr"; itemType?: SchemaType }) {
  if (payload.nextType === "expr") {
    if (!canEditType.value || !canEditValue.value) return;
    syncNodeType("string");
    valueError.value = null;
    emitField("value", { type: "expr", content: valueExprDraft.value ?? "" });
    return;
  }

  if (!schemaTypes.includes(payload.nextType as SchemaType)) return;
  const nextType = payload.nextType as SchemaType;
  syncNodeType(nextType, payload.itemType);
  if (!canEditValue.value) return;
  valueError.value = null;

  if (props.node.value?.type === "ref") {
    return;
  }

  if (!props.node.value || props.node.value.type !== "literal") {
    const nextLiteral = getDefaultLiteral(nextType);
    valueLiteralDraft.value = serializeJson(nextLiteral);
    emitField("value", { type: "literal", content: nextLiteral });
  }
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

  if (!nextRef.blockID && !nextRef.path) {
    valueError.value = null;
    emitField("value", undefined);
    return;
  }

  const nextRefValidation = resolveValueRefValidation(props.node.type, nextRef, props.valueRefTree);
  if (nextRefValidation.status === "type-mismatch" || nextRefValidation.status === "not-selectable") {
    valueError.value = nextRefValidation.message;
    return;
  }

  valueError.value = null;
  emitField("value", { type: "ref", content: nextRef });
}

function onPickReference(ref: ValueRefContent) {
  refPickerOpen.value = false;
  valueError.value = null;
  emitField("value", { type: "ref", content: ref });
}

function onOpenReferencePicker() {
  if (!canEditValue.value || !valueRefPicker.value.items.length) return;
  refPickerOpen.value = true;
}

function clearReferenceSelection() {
  if (!canEditValue.value) return;
  valueError.value = null;
  emitField("value", undefined);
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

function onRoleChange(value: string) {
  if (!canEditRole.value) return;
  emitField("role", value === UNSET ? undefined : value);
}

function onArrayItemTypeChange(nextType: string) {
  if (props.node.type !== "array" || !props.node.item || !canEditType.value) return;
  if (!schemaTypes.includes(nextType as SchemaType)) return;
  emit("change-type", { nodeId: props.node.item.id, nextType: nextType as SchemaType });
}

function syncOverlayRegistration() {
  if (!overlayApi || !rowShellRef.value) return;
  overlayApi.registerRow({
    id: props.node.id,
    parentId: props.parentNodeId ?? null,
    level: props.level,
    branchCenterX: props.showTreeAffordance ? 3 + currentBranchX.value : 0,
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
      class="param-row relative grid items-stretch shadow-[inset_0_-1px_0_0_#eceaf2] transition-colors"
      :style="{ gridTemplateColumns: layout.gridTemplate }"
      @click="onSelectRow"
    >
      <div class="relative z-20 px-0.5 py-1">
        <Field :data-invalid="nameFieldIssues.length ? true : undefined" class="gap-1">
          <div class="relative min-h-8 min-w-0" :style="{ paddingLeft: `${treeRailWidth}px` }">
            <div v-if="showTreeAffordance" class="absolute inset-y-0 left-0" :style="{ width: `${treeRailWidth}px` }">
              <button
                type="button"
                :disabled="!hasChildren"
                class="absolute top-1/2 inline-flex size-5 -translate-y-1/2 items-center justify-center rounded-[7px] text-[#7d7c92] disabled:opacity-40"
                :style="{ left: `${currentBranchX - 10}px` }"
                @click.stop="toggleTree"
              >
                <ChevronDown v-if="hasChildren && isExpanded" class="size-3.5" />
                <ChevronRight v-else-if="hasChildren" class="size-3.5" />
                <span v-else class="size-3.5" />
              </button>
            </div>

            <div class="flex min-h-7 min-w-0 items-center gap-1">
              <Input
                v-if="showInlineNameInput"
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
                v-if="showTypeBadge"
                variant="secondary"
                class="rounded-full bg-[#f3f3f8] px-1 py-0 text-[11px] font-medium text-[#6f7083]"
              >
                {{ typeDisplay }}
              </Badge>
            </div>
          </div>
          <FieldError
            v-if="nameFieldIssues.length"
            :errors="nameFieldIssues.map((issue) => issue.message)"
            class="px-1 text-[10px] leading-4"
          />
        </Field>
      </div>

      <div v-if="showInlineType" class="relative z-20 px-0.5 py-1" @click.stop>
        <SchemaTypePicker
          :node="props.node"
          :disabled="!canEditType"
          compact
          @change="onTypeChange"
        />
      </div>

      <div
        v-if="showInlineValue"
        class="relative z-20 px-0.5 py-1"
        @click.stop
      >
        <SchemaInlineValueEditor
          :node="props.node"
          :mode="mode"
          :value-kind="currentValueKind"
          :value-mode="inlineValueMode"
          :literal-draft="valueLiteralDraft"
          :expr-draft="valueExprDraft"
          :can-edit-type="canEditType"
          :can-edit-value="canEditValue"
          :locked-message="runtimeValueLockMessage"
          :value-ref-picker="valueRefPicker"
          :errors="inlineValueErrors"
          @change-type="onInlineValueModeChange($event)"
          @update:literalDraft="valueLiteralDraft = $event"
          @update:exprDraft="valueExprDraft = $event"
          @commit-literal="commitValueLiteral(typeof $event === 'string' ? $event : valueLiteralDraft)"
          @commit-expr="commitValueExpr(typeof $event === 'string' ? $event : valueExprDraft)"
          @clear-reference="clearReferenceSelection"
        >
          <template v-if="$slots['value-ref-picker']" #value-ref-picker="{ picker, close }">
            <slot name="value-ref-picker" :picker="picker" :close="close" />
          </template>
        </SchemaInlineValueEditor>
      </div>

      <div
        v-if="showInlineDefault"
        class="relative z-20 px-0.5 py-1"
        @click.stop
      >
        <SchemaLiteralValueInput
          :schema-type="props.node.type"
          :model-value="defaultDraft"
          :disabled="!canEditDefault"
          placeholder="默认值"
          variant="field"
          @update:modelValue="defaultDraft = $event"
          @commit="commitDefault(typeof $event === 'string' ? $event : defaultDraft)"
        />
      </div>

      <template v-for="column in layout.controlColumns" :key="column.key">
        <div
          v-if="column.key === 'required'"
          class="relative z-20 flex items-center justify-center px-0.5 py-1"
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
          v-else-if="column.key === 'add-child'"
          class="relative z-20 flex items-center justify-center px-0.5 py-1"
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
        </div>

        <div
          v-else-if="column.key === 'toggle-detail'"
          class="relative z-20 flex items-center justify-center px-0.5 py-1"
          @click.stop
        >
          <Toggle
            v-if="hasExpandableDetail"
            :model-value="isDetailOpen"
            size="sm"
            class="h-6 min-w-6 rounded-[7px] px-0 text-[#7c7d90] hover:bg-[#f6f4ff] hover:text-[#675bc0] data-[state=on]:border-[#c9c5ff] data-[state=on]:bg-[#f2efff] data-[state=on]:text-[#5d50c6]"
            :title="isDetailOpen ? '收起更多' : '展开更多'"
            @update:model-value="onDetailToggleChange"
          >
            <ChevronsUpDown class="size-3.5" />
          </Toggle>
        </div>

        <div
          v-else-if="column.key === 'delete-node'"
          class="relative z-20 flex items-center justify-center px-0.5 py-1"
          @click.stop
        >
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
      </template>
    </div>

      <div v-if="showSubtreeBody" class="relative">
      <div
        v-if="isDetailOpen"
        class="relative z-20 mb-1 overflow-hidden rounded-[16px] border border-[#ece8f6] bg-[linear-gradient(180deg,#fbfaff_0%,#f7f6fc_100%)] px-3 py-3 shadow-[0_1px_0_rgba(255,255,255,0.72)_inset]"
        :style="{ marginLeft: detailPanelOffset }"
      >
        <div class="grid gap-3" :class="layout.density === 'xs' ? 'grid-cols-1' : 'grid-cols-2'">
        <div v-if="showDetailDefault" class="space-y-1.5">
          <label class="text-[11px] font-medium text-[#7f8094]">默认值</label>
          <SchemaLiteralValueInput
            :schema-type="props.node.type"
            :model-value="defaultDraft"
            :disabled="!canEditDefault"
            placeholder="默认值"
            variant="field"
            @update:modelValue="defaultDraft = $event"
            @commit="commitDefault(typeof $event === 'string' ? $event : defaultDraft)"
          />
          <p v-if="defaultError" class="text-[11px] text-[#d45460]">{{ defaultError }}</p>
        </div>

        <div v-if="showDetailDescription" class="space-y-1.5">
          <label class="text-[11px] font-medium text-[#7f8094]">描述</label>
          <Textarea
            v-model="descriptionDraft"
            :rows="1"
            :disabled="!canEditDescription"
            class="min-h-0 resize-none rounded-[10px] border-[#dddce6] bg-white text-[12px]"
            placeholder="帮助描述此参数的用途"
            @blur="commitDescription"
          />
        </div>

        <div v-if="showDetailLabel" class="space-y-1.5">
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

        <div v-if="showDetailRole" class="space-y-1.5">
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

        <div v-if="showDetailArrayItemType" class="space-y-1.5">
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

        <div v-if="showDetailEnum" class="space-y-1.5">
          <label class="text-[11px] font-medium text-[#7f8094]">枚举（JSON 数组）</label>
          <MonacoTextareaEditor
            :model-value="enumDraft"
            language="json"
            :font-size="12"
            :min-rows="1"
            :readonly="!canEditEnum"
            @update:modelValue="enumDraft = $event"
            @blur="commitEnum"
          />
          <p v-if="enumError" class="text-[11px] text-[#d45460]">{{ enumError }}</p>
        </div>

        <div v-if="showDetailMeta" class="space-y-1.5">
          <label class="text-[11px] font-medium text-[#7f8094]">Meta（JSON 对象）</label>
          <MonacoTextareaEditor
            :model-value="metaDraft"
            language="json"
            :font-size="12"
            :min-rows="1"
            :readonly="!canEditMeta"
            @update:modelValue="metaDraft = $event"
            @blur="commitMeta"
          />
          <p v-if="metaError" class="text-[11px] text-[#d45460]">{{ metaError }}</p>
        </div>

        <div v-if="showDetailOpen" class="space-y-1.5">
          <label class="flex items-center gap-2 text-[11px] font-medium text-[#7f8094]">
            <Checkbox
              :model-value="props.node.open ?? true"
              :disabled="!canEditOpen"
              class="border-[#cfcde0] data-[state=checked]:border-[#7366d5] data-[state=checked]:bg-[#7366d5]"
              @update:model-value="onOpenChange"
            />
            公开
          </label>
        </div>

        <div v-if="showDetailValueLiteral" class="col-span-full space-y-1.5">
          <label class="text-[11px] font-medium text-[#7f8094]">值</label>
          <SchemaValueLockPlaceholder
            v-if="runtimeValueLockMessage"
            :message="runtimeValueLockMessage"
            variant="field"
          />
          <SchemaLiteralValueInput
            v-else
            :schema-type="props.node.type"
            :model-value="valueLiteralDraft"
            :disabled="!canEditValue"
            placeholder="输入值"
            variant="field"
            @update:modelValue="valueLiteralDraft = $event"
            @commit="commitValueLiteral(typeof $event === 'string' ? $event : valueLiteralDraft)"
          />
        </div>

        <div v-if="showDetailValueExpr" class="col-span-full space-y-1.5">
          <label class="text-[11px] font-medium text-[#7f8094]">表达式</label>
          <SchemaValueLockPlaceholder
            v-if="runtimeValueLockMessage"
            :message="runtimeValueLockMessage"
            variant="field"
          />
          <Textarea
            v-else
            v-model="valueExprDraft"
            :rows="1"
            :disabled="!canEditValue"
            class="min-h-0 rounded-[10px] border-[#dddce6] bg-white text-[12px]"
            placeholder="{{ expression }}"
            @blur="commitValueExpr"
          />
        </div>

        <template v-if="showDetailValueRef">
          <template v-if="runtimeValueLockMessage">
            <div class="col-span-full">
              <SchemaValueLockPlaceholder :message="runtimeValueLockMessage" variant="field" />
            </div>
          </template>
          <template v-else>
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
              <Popover v-model:open="refPickerOpen">
                <PopoverTrigger as-child>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    class="rounded-[10px]"
                    :disabled="!canEditValue || !valueRefPicker.items.length"
                    @click="onOpenReferencePicker"
                  >
                    <Link2 class="mr-1 size-3.5" />
                    选择变量
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  side="bottom"
                  :side-offset="6"
                  class="flex h-[360px] w-[min(520px,calc(100vw-24px))] flex-col rounded-[18px] border-[#e9e7f1] p-3"
                >
                  <slot
                    v-if="$slots['value-ref-picker']"
                    name="value-ref-picker"
                    :picker="valueRefPicker"
                    :close="() => { refPickerOpen = false; }"
                  />
                  <SchemaValueRefTreePanel
                    v-else
                    :picker="valueRefPicker"
                    class="min-h-0 flex-1"
                    @request-close="refPickerOpen = false"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </template>
        </template>

        <div v-if="valueError" class="col-span-full rounded-[12px] border border-[#ffd6db] bg-[#fff6f7] px-3 py-2 text-[11px] text-[#d45460]">
          {{ valueError }}
        </div>
        </div>
      </div>

      <div v-if="hasChildren && isExpanded" class="relative">
        <div v-for="(child, index) in children" :key="child.id" class="relative z-20">
          <SchemaCompactRuntimeRow
            :node="child"
            :parent-node-id="props.node.id"
            :level="level + 1"
            :is-last="index === children.length - 1"
            :lineage="[...lineage, !isLast]"
            :selected-id="selectedId"
            :tree-expanded-ids="treeExpandedIds"
            :detail-open-ids="detailOpenIds"
            :show-tree-affordance="showTreeAffordance"
            :layout="layout"
            :inline-visibility="inlineVisibility"
            :detail-visibility="detailVisibility"
            :mode="mode"
            :issues="issues"
            :can-edit="canEdit"
            :role-options="roleOptions"
            :value-ref-tree="valueRefTree"
            :within-array-value-context="withinArrayValueContext || props.node.type === 'array'"
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
