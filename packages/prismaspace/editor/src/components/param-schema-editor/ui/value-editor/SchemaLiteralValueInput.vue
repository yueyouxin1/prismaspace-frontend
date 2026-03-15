<script setup lang="ts">
import type { SchemaType } from "../../core";
import { computed } from "vue";
import { Input } from "@prismaspace/ui-shadcn/components/ui/input";
import { Textarea } from "@prismaspace/ui-shadcn/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@prismaspace/ui-shadcn/components/ui/select";
import { MonacoTextareaEditor } from "../../../monaco-editor";

type SchemaLiteralInputVariant = "embedded" | "field";

const props = withDefaults(
  defineProps<{
    schemaType: SchemaType;
    modelValue: string;
    disabled?: boolean;
    placeholder?: string;
    variant?: SchemaLiteralInputVariant;
  }>(),
  {
    disabled: false,
    placeholder: "",
    variant: "field",
  },
);

const emit = defineEmits<{
  (event: "update:modelValue", value: string): void;
  (event: "commit", value?: string): void;
}>();

const UNSET = "__unset__";

const isEmbedded = computed(() => props.variant === "embedded");
const hasValue = computed(() => props.modelValue.trim().length > 0);
const inputClass = computed(() =>
  isEmbedded.value
    ? "h-7 border-0 bg-transparent px-2 text-[12px] shadow-none focus-visible:ring-0"
    : "h-7 rounded-[10px] border-[#dddce6] bg-white px-2 text-[12px]",
);
const textareaClass = computed(() =>
  isEmbedded.value
    ? "min-h-7 resize-none overflow-hidden border-0 bg-transparent px-2 py-1 text-[12px] leading-5 shadow-none focus-visible:ring-0"
    : "min-h-7 resize-none overflow-hidden rounded-[10px] border-[#dddce6] bg-white px-2 py-1 text-[12px] leading-5",
);
const selectTriggerClass = computed(() =>
  isEmbedded.value
    ? "h-7 w-full rounded-none border-0 bg-transparent px-2 text-[12px] shadow-none focus-visible:ring-0"
    : "h-7 w-full rounded-[10px] border-[#dddce6] bg-white px-2 text-[12px]",
);
const placeholderClass = computed(() =>
  isEmbedded.value
    ? "pointer-events-none absolute inset-x-2 top-1/2 -translate-y-1/2 truncate text-[12px] text-muted-foreground"
    : "pointer-events-none absolute inset-x-3 top-1/2 -translate-y-1/2 truncate text-[12px] text-muted-foreground",
);
</script>

<template>
  <Select
    v-if="schemaType === 'boolean'"
    :disabled="disabled"
    :model-value="modelValue || UNSET"
    @update:model-value="emit('commit', $event === UNSET ? '' : String($event))"
  >
    <SelectTrigger :class="selectTriggerClass">
      <SelectValue :placeholder="placeholder" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem :value="UNSET">未设置</SelectItem>
      <SelectItem value="true">true</SelectItem>
      <SelectItem value="false">false</SelectItem>
    </SelectContent>
  </Select>

  <div
    v-else-if="schemaType === 'object' || schemaType === 'array'"
    class="relative min-h-7"
  >
    <MonacoTextareaEditor
      :model-value="modelValue"
      language="json"
      :font-size="12"
      :min-rows="1"
      :readonly="disabled"
      :bare="isEmbedded"
      @update:modelValue="emit('update:modelValue', $event)"
      @blur="emit('commit')"
    />
    <span v-if="!hasValue && placeholder" :class="placeholderClass">
      {{ placeholder }}
    </span>
  </div>

  <div v-else-if="schemaType === 'number' || schemaType === 'integer'" class="relative h-7">
    <Input
      :model-value="modelValue"
      :disabled="disabled"
      type="number"
      :class="inputClass"
      placeholder=""
      @update:model-value="emit('update:modelValue', String($event))"
      @blur="emit('commit')"
    />
    <span v-if="!hasValue && placeholder" :class="placeholderClass">
      {{ placeholder }}
    </span>
  </div>

  <div v-else class="relative min-h-7">
    <Textarea
      :model-value="modelValue"
      :rows="1"
      :disabled="disabled"
      :class="textareaClass"
      placeholder=""
      @update:model-value="emit('update:modelValue', String($event))"
      @blur="emit('commit')"
    />
    <span v-if="!hasValue && placeholder" :class="placeholderClass">
      {{ placeholder }}
    </span>
  </div>
</template>
