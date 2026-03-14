<script setup lang="ts">
import type { SchemaNode, SchemaType, ValueRefContent } from "../../core";
import type { ParamSchemaRuntimeMode } from "../mode";
import type { VariableTreeNode } from "../tree-types";
import type { RuntimeValueKind } from "../runtime-editor-utils";
import { Input } from "@prismaspace/ui-shadcn/components/ui/input";
import { Textarea } from "@prismaspace/ui-shadcn/components/ui/textarea";
import { Button } from "@prismaspace/ui-shadcn/components/ui/button";
import { Field, FieldContent, FieldError } from "@prismaspace/ui-shadcn/components/ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "@prismaspace/ui-shadcn/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@prismaspace/ui-shadcn/components/ui/select";
import { Hexagon, Link2, X } from "lucide-vue-next";
import { ref } from "vue";
import { MonacoTextareaEditor } from "../../../monaco-editor";
import SchemaValueRefTreePanel from "../SchemaValueRefTreePanel.vue";
import SchemaValueTypePicker from "./SchemaValueTypePicker.vue";

defineOptions({ name: "SchemaInlineValueEditor" });
defineSlots<{
  "value-ref-picker"?: (props: Record<string, unknown>) => unknown;
}>();

const props = withDefaults(
  defineProps<{
    node: SchemaNode;
    mode: ParamSchemaRuntimeMode;
    valueKind: RuntimeValueKind;
    valueMode: SchemaType | "expr";
    literalDraft: string;
    exprDraft: string;
    canEditType: boolean;
    canEditValue: boolean;
    currentRef: ValueRefContent | null;
    currentRefCaption?: string;
    valueRefTree?: VariableTreeNode[];
    errors?: string[];
  }>(),
  {
    currentRef: null,
    currentRefCaption: "",
    valueRefTree: () => [],
    errors: () => [],
  },
);

const emit = defineEmits<{
  (event: "change-type", payload: { nextType: SchemaType | "expr"; itemType?: SchemaType }): void;
  (event: "update:literalDraft", value: string): void;
  (event: "update:exprDraft", value: string): void;
  (event: "commit-literal", value?: string): void;
  (event: "commit-expr", value?: string): void;
  (event: "select-reference", ref: ValueRefContent): void;
  (event: "clear-reference"): void;
}>();

const refPickerOpen = ref(false);
const UNSET = "__unset__";

function openReferencePicker() {
  if (!props.canEditValue || !props.valueRefTree?.length) return;
  refPickerOpen.value = true;
}

function onPickReference(ref: ValueRefContent) {
  refPickerOpen.value = false;
  emit("select-reference", ref);
}
</script>

<template>
  <Field :data-invalid="errors.length ? true : undefined" class="gap-1">
    <FieldContent class="gap-1">
      <div
        :data-invalid="errors.length ? true : undefined"
        class="border-input focus-within:border-ring focus-within:ring-ring/50 dark:bg-input/30 data-[invalid=true]:border-[#d45460] flex min-h-7 items-stretch overflow-hidden rounded-[10px] border bg-white shadow-xs transition-[color,box-shadow] focus-within:ring-[3px]"
      >
        <SchemaValueTypePicker
          :node="node"
          :value-mode="valueMode"
          :disabled="!canEditValue || !canEditType"
          @change="emit('change-type', $event)"
        />

        <div class="min-w-0 flex-1 border-l border-[#eceaf2]">
          <div v-if="valueMode === 'expr'" class="relative h-7">
            <Textarea
              :model-value="exprDraft"
              :rows="1"
              :disabled="!canEditValue"
              class="h-7 min-h-7 resize-none overflow-hidden border-0 bg-transparent px-2 py-1 text-[12px] leading-5 whitespace-nowrap shadow-none focus-visible:ring-0"
              placeholder=""
              @update:model-value="emit('update:exprDraft', String($event))"
              @blur="emit('commit-expr')"
            />
            <span
              v-if="!exprDraft"
              class="pointer-events-none absolute inset-x-2 top-1/2 -translate-y-1/2 truncate text-[12px] text-muted-foreground"
            >
              输入或引用...
            </span>
          </div>

          <div
            v-else-if="valueKind === 'ref' && currentRef"
            class="flex h-7 min-w-0 items-center gap-1.5 px-2 text-[12px] text-[#4f45a3]"
          >
            <Link2 class="size-3.5 shrink-0" />
            <span class="min-w-0 flex-1 truncate" :title="currentRefCaption">
              {{ currentRefCaption }}
            </span>
            <button
              type="button"
              class="inline-flex size-4 shrink-0 items-center justify-center rounded-sm text-[#8076ae] hover:bg-[#f3efff]"
              :disabled="!canEditValue"
              @click.stop="emit('clear-reference')"
            >
              <X class="size-3" />
            </button>
          </div>

          <Select
            v-else-if="node.type === 'boolean'"
            :disabled="!canEditValue"
            :model-value="literalDraft || UNSET"
            @update:model-value="emit('commit-literal', $event === UNSET ? '' : String($event))"
          >
            <SelectTrigger class="h-7 rounded-none border-0 bg-transparent px-2 text-[12px] shadow-none focus-visible:ring-0">
              <SelectValue placeholder="输入或引用..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem :value="UNSET">未设置</SelectItem>
              <SelectItem value="true">true</SelectItem>
              <SelectItem value="false">false</SelectItem>
            </SelectContent>
          </Select>

          <MonacoTextareaEditor
            v-else-if="node.type === 'object' || node.type === 'array'"
            :model-value="literalDraft"
            language="json"
            :font-size="12"
            :min-rows="1"
            :readonly="!canEditValue"
            bare
            @update:modelValue="emit('update:literalDraft', $event)"
            @blur="emit('commit-literal')"
          />

          <div v-else-if="node.type === 'number' || node.type === 'integer'" class="relative h-7">
            <Input
              :model-value="literalDraft"
              :disabled="!canEditValue"
              type="number"
              class="h-7 border-0 bg-transparent px-2 text-[12px] shadow-none focus-visible:ring-0"
              placeholder=""
              @update:model-value="emit('update:literalDraft', String($event))"
              @blur="emit('commit-literal')"
            />
            <span
              v-if="!literalDraft"
              class="pointer-events-none absolute inset-x-2 top-1/2 -translate-y-1/2 truncate text-[12px] text-muted-foreground"
            >
              输入或引用...
            </span>
          </div>

          <div v-else class="relative h-7">
            <Textarea
              :model-value="literalDraft"
              :rows="1"
              :disabled="!canEditValue"
              class="h-7 min-h-7 resize-none overflow-hidden border-0 bg-transparent px-2 py-1 text-[12px] leading-5 whitespace-nowrap shadow-none focus-visible:ring-0"
              placeholder=""
              @update:model-value="emit('update:literalDraft', String($event))"
              @blur="emit('commit-literal')"
            />
            <span
              v-if="!literalDraft"
              class="pointer-events-none absolute inset-x-2 top-1/2 -translate-y-1/2 truncate text-[12px] text-muted-foreground"
            >
              输入或引用...
            </span>
          </div>
        </div>

        <Popover v-model:open="refPickerOpen">
          <PopoverTrigger as-child>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              class="h-auto w-7 shrink-0 self-stretch rounded-none border-l border-[#eceaf2] px-0 text-[#6c60bd]"
              :disabled="!canEditValue || !valueRefTree?.length"
              @click="openReferencePicker"
            >
              <Hexagon class="size-3.5" />
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
              :model-value="valueKind === 'ref' ? currentRef : null"
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
      </div>
    </FieldContent>

    <FieldError v-if="errors.length" :errors="errors" class="px-1 text-[10px] leading-4" />
  </Field>
</template>
