<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import type { SchemaType, SchemaValueDefinition, ValueRefContent } from "../../core";
import type { VariableTreeNode } from "../tree-types";
import { resolveValueRefValidation, useValueRefPickerController, type ValueRefPickerViewModel } from "../value-ref-picker";
import { Button } from "@prismaspace/ui-shadcn/components/ui/button";
import { Input } from "@prismaspace/ui-shadcn/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@prismaspace/ui-shadcn/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@prismaspace/ui-shadcn/components/ui/select";
import { Textarea } from "@prismaspace/ui-shadcn/components/ui/textarea";
import { AlertCircle, Link2, X } from "lucide-vue-next";
import SchemaValueRefTreePanel from "../SchemaValueRefTreePanel.vue";
import SchemaLiteralValueInput from "./SchemaLiteralValueInput.vue";

type ValueEditorMode = "literal" | "ref" | "expr";

defineOptions({ name: "SchemaValueEditor" });
defineSlots<{
  "value-ref-picker"?: (props: { picker: ValueRefPickerViewModel; close: () => void }) => unknown;
}>();

const props = withDefaults(
  defineProps<{
    modelValue?: SchemaValueDefinition | null;
    schemaType: SchemaType;
    valueRefTree?: VariableTreeNode[];
    allowExpression?: boolean;
    disabled?: boolean;
    placeholder?: string;
  }>(),
  {
    modelValue: null,
    valueRefTree: () => [],
    allowExpression: true,
    disabled: false,
    placeholder: "",
  },
);

const emit = defineEmits<{
  (event: "update:modelValue", value: SchemaValueDefinition | undefined): void;
}>();

const literalDraft = ref("");
const exprDraft = ref("");
const refPickerOpen = ref(false);

const mode = computed<ValueEditorMode>(() => {
  if (props.modelValue?.type === "ref") return "ref";
  if (props.modelValue?.type === "expr") return "expr";
  return "literal";
});

const availableModes = computed<Array<{ value: ValueEditorMode; label: string }>>(() => {
  const modes: Array<{ value: ValueEditorMode; label: string }> = [
    { value: "literal", label: "常量" },
    { value: "ref", label: "变量" },
  ];
  if (props.allowExpression) {
    modes.push({ value: "expr", label: "表达式" });
  }
  return modes;
});

const selectedRef = computed<ValueRefContent | null>(() =>
  props.modelValue?.type === "ref" ? props.modelValue.content : null,
);

const refValidation = computed(() =>
  resolveValueRefValidation(props.schemaType, selectedRef.value, props.valueRefTree),
);

const valueRefPicker = useValueRefPickerController({
  getTree: () => props.valueRefTree,
  getModelValue: () => selectedRef.value,
  getExpectedType: () => props.schemaType,
  rejectIncompatible: true,
  onSelect: (ref) => {
    emit("update:modelValue", {
      type: "ref",
      content: ref,
    });
    refPickerOpen.value = false;
  },
});

watch(
  () => props.modelValue,
  (value) => {
    if (value?.type === "literal") {
      literalDraft.value = stringifyLiteral(value.content);
      exprDraft.value = "";
      return;
    }
    if (value?.type === "expr") {
      exprDraft.value = value.content ?? "";
      literalDraft.value = "";
      return;
    }
    literalDraft.value = "";
    exprDraft.value = "";
  },
  { immediate: true, deep: true },
);

const referenceLabel = computed(() => valueRefPicker.value.selectedSummary || "选择变量");
const referenceError = computed(() => {
  if (mode.value !== "ref") return null;
  if (refValidation.value.status === "empty" || refValidation.value.status === "ok") return null;
  return refValidation.value.message;
});

function createDefaultLiteral(schemaType: SchemaType): unknown {
  switch (schemaType) {
    case "boolean":
      return false;
    case "number":
    case "integer":
      return 0;
    case "object":
      return {};
    case "array":
      return [];
    default:
      return "";
  }
}

function stringifyLiteral(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value == null) return "";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function parseLiteral(raw: string): unknown {
  if (props.schemaType === "boolean") {
    return raw === "true";
  }
  if (props.schemaType === "number" || props.schemaType === "integer") {
    if (!raw.trim()) {
      return undefined;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      return undefined;
    }
    return props.schemaType === "integer" ? Math.trunc(parsed) : parsed;
  }
  if (props.schemaType === "object" || props.schemaType === "array") {
    if (!raw.trim()) {
      return undefined;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return undefined;
    }
  }
  return raw;
}

async function switchMode(nextMode: string) {
  if (props.disabled) return;
  if (nextMode === "literal") {
    emit("update:modelValue", {
      type: "literal",
      content: parseLiteral(literalDraft.value) ?? createDefaultLiteral(props.schemaType),
    });
    return;
  }
  if (nextMode === "expr" && props.allowExpression) {
    emit("update:modelValue", {
      type: "expr",
      content: exprDraft.value,
    });
    return;
  }
  if (nextMode === "ref") {
    emit("update:modelValue", {
      type: "ref",
      content: selectedRef.value ?? { blockID: "", path: "" },
    });
    await nextTick();
    refPickerOpen.value = true;
  }
}

function commitLiteral() {
  if (props.disabled) return;
  const nextValue = parseLiteral(literalDraft.value);
  emit(
    "update:modelValue",
    nextValue === undefined
      ? undefined
      : {
          type: "literal",
          content: nextValue,
        },
  );
}

function commitExpr() {
  if (props.disabled || !props.allowExpression) return;
  emit(
    "update:modelValue",
    exprDraft.value.trim()
      ? {
          type: "expr",
          content: exprDraft.value,
        }
      : undefined,
  );
}

function clearReference() {
  if (props.disabled) return;
  emit("update:modelValue", undefined);
}
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center gap-2">
      <Select
        :disabled="disabled"
        :model-value="mode"
        @update:model-value="switchMode(String($event ?? 'literal'))"
      >
        <SelectTrigger class="h-8 w-[94px]">
          <SelectValue placeholder="模式" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="item in availableModes"
            :key="item.value"
            :value="item.value"
          >
            {{ item.label }}
          </SelectItem>
        </SelectContent>
      </Select>

      <div class="min-w-0 flex-1">
        <SchemaLiteralValueInput
          v-if="mode === 'literal'"
          :schema-type="schemaType"
          :model-value="literalDraft"
          :disabled="disabled"
          :placeholder="placeholder"
          @update:modelValue="literalDraft = $event"
          @commit="commitLiteral"
        />

        <div
          v-else-if="mode === 'ref'"
          class="flex h-8 min-w-0 items-center gap-1.5 rounded-[10px] border border-[#dddce6] bg-white px-2 text-[12px] text-[#4f45a3]"
        >
          <Link2 class="size-3.5 shrink-0" />
          <span class="min-w-0 flex-1 truncate" :title="referenceLabel">
            {{ referenceLabel }}
          </span>
          <button
            type="button"
            class="inline-flex size-4 shrink-0 items-center justify-center rounded-sm text-[#8076ae] hover:bg-[#f3efff]"
            :disabled="disabled"
            @click.stop="clearReference"
          >
            <X class="size-3" />
          </button>
        </div>

        <div v-else class="relative">
          <Textarea
            v-model="exprDraft"
            :rows="1"
            :disabled="disabled"
            class="min-h-8 resize-none rounded-[10px] border-[#dddce6] bg-white px-2 py-1 text-[12px] leading-5"
            :placeholder="placeholder"
            @blur="commitExpr"
          />
        </div>
      </div>

      <Popover v-if="mode === 'ref'" v-model:open="refPickerOpen">
        <PopoverTrigger as-child>
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            class="size-8 rounded-[10px]"
            :disabled="disabled || !valueRefPicker.items.length"
          >
            <Link2 class="size-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          side="bottom"
          :side-offset="6"
          class="flex max-h-[320px] w-[min(520px,calc(100vw-24px))] flex-col rounded-lg border-[#e9e7f1] p-0 overflow-auto"
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

    <div
      v-if="referenceError"
      class="flex items-center gap-1.5 rounded-[10px] border border-[#ffd6db] bg-[#fff6f7] px-2.5 py-2 text-[11px] text-[#d45460]"
    >
      <AlertCircle class="size-3.5 shrink-0" />
      <span class="min-w-0 flex-1">{{ referenceError }}</span>
    </div>
  </div>
</template>
