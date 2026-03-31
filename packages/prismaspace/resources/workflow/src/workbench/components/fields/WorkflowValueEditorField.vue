<script setup lang="ts">
import { computed } from "vue";
import {
  SchemaValueEditor,
  type SchemaType,
  type SchemaValueDefinition,
  type VariableTreeNode,
} from "@prismaspace/editor";
import WorkflowCascadeValueRefPicker from "./WorkflowCascadeValueRefPicker.vue";

const props = withDefaults(
  defineProps<{
    modelValue?: unknown;
    fieldProps?: {
      schemaType?: SchemaType;
      valueRefTree?: VariableTreeNode[];
      allowExpression?: boolean;
      placeholder?: string;
      disabled?: boolean;
    };
  }>(),
  {
    modelValue: undefined,
    fieldProps: () => ({}),
  },
);

const emit = defineEmits<{
  (event: "update:modelValue", value: unknown): void;
}>();

const resolvedSchemaType = computed<SchemaType>(() => props.fieldProps?.schemaType ?? "string");
const resolvedValueRefTree = computed<VariableTreeNode[]>(() => props.fieldProps?.valueRefTree ?? []);
const resolvedModelValue = computed<SchemaValueDefinition | null>(() => {
  if (!props.modelValue || typeof props.modelValue !== "object") {
    return null;
  }
  return props.modelValue as SchemaValueDefinition;
});
</script>

<template>
  <SchemaValueEditor
    :model-value="resolvedModelValue"
    :schema-type="resolvedSchemaType"
    :value-ref-tree="resolvedValueRefTree"
    :allow-expression="fieldProps?.allowExpression ?? false"
    :disabled="fieldProps?.disabled"
    :placeholder="fieldProps?.placeholder || '输入值或选择变量'"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #value-ref-picker="{ picker, close }">
      <WorkflowCascadeValueRefPicker :picker="picker" :close="close" />
    </template>
  </SchemaValueEditor>
</template>
