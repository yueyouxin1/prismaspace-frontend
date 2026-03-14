<script setup lang="ts">
import type { SchemaEditorAction, SchemaEditorState, SchemaNode } from "../core";
import type { ParamSchemaFieldVisibilityOverrides, ParamSchemaRuntimeMode } from "./mode";
import type { VariableTreeNode } from "./tree-types";
import ParamSchemaEditorShell from "./ParamSchemaEditorShell.vue";

const props = withDefaults(
  defineProps<{
    state: SchemaEditorState;
    dispatch: (action: SchemaEditorAction) => void;
    canEdit?: (node: SchemaNode) => boolean;
    roleOptions?: string[];
    runtimeMode?: ParamSchemaRuntimeMode;
    valueRefTree?: VariableTreeNode[];
    fieldVisibility?: ParamSchemaFieldVisibilityOverrides;
  }>(),
  {
    runtimeMode: "define",
    valueRefTree: () => [],
  },
);
</script>

<template>
  <ParamSchemaEditorShell v-bind="props" editor-kind="professional">
    <template v-if="$slots['value-ref-picker']" #value-ref-picker="slotProps">
      <slot name="value-ref-picker" v-bind="slotProps" />
    </template>
  </ParamSchemaEditorShell>
</template>
