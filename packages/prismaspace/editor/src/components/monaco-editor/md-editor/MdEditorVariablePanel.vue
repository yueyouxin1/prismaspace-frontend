<script setup lang="ts">
import { DefaultVariableTreePanel } from "../../variable-tree";
import type { ExpressionPopupSelectPayload, MdEditorVariablePanelProps } from "./types";

defineOptions({ name: "MdEditorVariablePanel" });

const props = withDefaults(defineProps<MdEditorVariablePanelProps>(), {
  tree: () => [],
  title: "表达式变量",
  emptyText: "没有匹配项",
  resolveInsertValue: undefined,
});

const emit = defineEmits<{
  (event: "select", payload: ExpressionPopupSelectPayload): void;
  (event: "close"): void;
}>();

function handlePick(payload: { insertValue: string }): void {
  const trigger = props.context?.triggerText ?? "{{";
  const closeToken = trigger === "${" ? "}" : "}}";

  emit("select", {
    insertText: `${trigger}${payload.insertValue}${closeToken}`,
    replaceRange: props.context?.defaultReplaceRange,
  });
}
</script>

<template>
  <DefaultVariableTreePanel
    :tree="tree"
    :query-text="context?.queryText"
    :title="title"
    :empty-text="emptyText"
    :resolve-insert-value="resolveInsertValue"
    @pick="handlePick"
    @close="emit('close')"
  />
</template>

