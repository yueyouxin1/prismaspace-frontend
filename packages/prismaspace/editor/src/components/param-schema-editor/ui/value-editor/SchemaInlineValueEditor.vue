<script setup lang="ts">
import type { SchemaNode, SchemaType } from "../../core";
import type { ParamSchemaRuntimeMode } from "../mode";
import type { RuntimeValueKind } from "../runtime-editor-utils";
import type { ValueRefPickerViewModel } from "../value-ref-picker";
import { Textarea } from "@prismaspace/ui-shadcn/components/ui/textarea";
import { Button } from "@prismaspace/ui-shadcn/components/ui/button";
import { Field, FieldContent, FieldError } from "@prismaspace/ui-shadcn/components/ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "@prismaspace/ui-shadcn/components/ui/popover";
import { Hexagon, Link2, X } from "lucide-vue-next";
import { ref } from "vue";
import SchemaValueRefTreePanel from "../SchemaValueRefTreePanel.vue";
import SchemaLiteralValueInput from "./SchemaLiteralValueInput.vue";
import SchemaValueLockPlaceholder from "./SchemaValueLockPlaceholder.vue";
import SchemaValueTypePicker from "./SchemaValueTypePicker.vue";

defineOptions({ name: "SchemaInlineValueEditor" });
defineSlots<{
  "value-ref-picker"?: (props: { picker: ValueRefPickerViewModel; close: () => void }) => unknown;
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
    lockedMessage?: string | null;
    valueRefPicker?: ValueRefPickerViewModel | null;
    errors?: string[];
  }>(),
  {
    lockedMessage: null,
    valueRefPicker: null,
    errors: () => [],
  },
);

const emit = defineEmits<{
  (event: "change-type", payload: { nextType: SchemaType | "expr"; itemType?: SchemaType }): void;
  (event: "update:literalDraft", value: string): void;
  (event: "update:exprDraft", value: string): void;
  (event: "commit-literal", value?: string): void;
  (event: "commit-expr", value?: string): void;
  (event: "clear-reference"): void;
}>();

const refPickerOpen = ref(false);

function openReferencePicker() {
  if (!props.canEditValue || !props.valueRefPicker?.items.length) return;
  refPickerOpen.value = true;
}
</script>

<template>
  <Field :data-invalid="errors.length ? true : undefined" class="gap-1">
    <FieldContent class="gap-1">
      <div
        :data-invalid="errors.length ? true : undefined"
        class="border-input focus-within:border-ring focus-within:ring-ring/50 dark:bg-input/30 data-[invalid=true]:border-[#d45460] flex min-h-7 items-center overflow-hidden rounded-[10px] border bg-white shadow-xs transition-[color,box-shadow] focus-within:ring-[3px]"
      >
        <SchemaValueTypePicker
          :node="node"
          :value-mode="valueMode"
          :disabled="!canEditType"
          :disable-expr="Boolean(lockedMessage) || !canEditValue"
          @change="emit('change-type', $event)"
        />

        <div class="min-w-0 flex-1 border-l border-[#eceaf2]">
          <SchemaValueLockPlaceholder
            v-if="lockedMessage"
            :message="lockedMessage"
            variant="embedded"
          />

          <div v-else-if="valueMode === 'expr'" class="relative h-7">
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
            v-else-if="valueKind === 'ref' && valueRefPicker?.selected"
            class="flex h-7 min-w-0 items-center gap-1.5 px-2 text-[12px] text-[#4f45a3]"
          >
            <Link2 class="size-3.5 shrink-0" />
            <span class="min-w-0 flex-1 truncate" :title="valueRefPicker.selectedSummary">
              {{ valueRefPicker.selectedSummary }}
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
          <SchemaLiteralValueInput
            v-else
            :schema-type="node.type"
            :model-value="literalDraft"
            :disabled="!canEditValue"
            placeholder="输入或引用..."
            variant="embedded"
            @update:modelValue="emit('update:literalDraft', $event)"
            @commit="emit('commit-literal', typeof $event === 'string' ? $event : literalDraft)"
          />
        </div>

        <Popover v-if="!lockedMessage" v-model:open="refPickerOpen">
          <PopoverTrigger as-child>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              class="h-auto w-7 shrink-0 self-stretch rounded-none border-l border-[#eceaf2] px-0 text-[#6c60bd]"
              :disabled="!canEditValue || !valueRefPicker?.items.length"
              @click="openReferencePicker"
            >
              <Hexagon class="size-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            side="bottom"
            :side-offset="6"
            class="flex max-h-[260px] w-full rounded-lg border-[#e9e7f1] p-0 overflow-auto"
          >
            <slot
              v-if="$slots['value-ref-picker'] && valueRefPicker"
              name="value-ref-picker"
              :picker="valueRefPicker"
              :close="() => { refPickerOpen = false; }"
            />
            <SchemaValueRefTreePanel
              v-else-if="valueRefPicker"
              :picker="valueRefPicker"
              class="min-h-0 flex-1"
              @request-close="refPickerOpen = false"
            />
          </PopoverContent>
        </Popover>
      </div>
    </FieldContent>

    <FieldError v-if="errors.length" :errors="errors" class="px-1 text-[10px] leading-4" />
  </Field>
</template>
