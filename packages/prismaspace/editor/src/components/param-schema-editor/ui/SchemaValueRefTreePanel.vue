<script setup lang="ts">
import { computed } from "vue";
import { VariableTreePanelShell } from "../../variable-tree";
import type { ValueRefPickerViewModel } from "./value-ref-picker";
import { getValueRefPickerItemIssue } from "./value-ref-picker";
import { formatValueRefSummary } from "./runtime-editor-utils";
import SchemaValueRefTree from "./SchemaValueRefTree.vue";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@prismaspace/ui-shadcn/components/ui/tooltip";
import { AlertCircle } from "lucide-vue-next";

defineOptions({ name: "SchemaValueRefTreePanel" });

const props = withDefaults(
  defineProps<{
    picker: ValueRefPickerViewModel;
    placeholder?: string;
    emptyText?: string;
    searchPlaceholder?: string;
  }>(),
  {
    placeholder: "请选择变量引用",
    emptyText: "没有可用的变量项",
    searchPlaceholder: "搜索变量 / 节点",
  },
);

const emit = defineEmits<{
  (event: "request-close"): void;
}>();

const selectedLabel = computed(() => {
  return props.picker.selectedItem?.label || formatValueRefSummary(props.picker.selected);
});
const selectedType = computed(() => props.picker.selectedItem?.schemaType ?? null);
const selectedIssue = computed(() => {
  if (props.picker.selectedValidation.status === "empty" || props.picker.selectedValidation.status === "ok") {
    return null;
  }
  return props.picker.selectedValidation.message;
});
</script>

<template>
  <TooltipProvider :delay-duration="200">
    <VariableTreePanelShell
      :query="picker.query"
      :search-placeholder="searchPlaceholder"
      show-search
      content-class="min-h-full"
      footer-class="flex items-center gap-2 border-t px-3 py-2 text-xs text-muted-foreground"
      class="min-h-0"
      @update:query="picker.setQuery"
    >
      <template #default>
        <SchemaValueRefTree :picker="picker" :items="picker.filteredItems" :empty-text="emptyText" class="min-h-full"
          @request-close="emit('request-close')" />
      </template>

      <template v-if="picker.selected" #footer>
        <span class="truncate">{{ selectedLabel || placeholder }}</span>

        <Tooltip v-if="selectedIssue || getValueRefPickerItemIssue(picker.selectedItem)">
          <TooltipTrigger as-child>
            <span class="inline-flex size-4 shrink-0 items-center justify-center">
              <AlertCircle class="size-3.5" />
            </span>
          </TooltipTrigger>
          <TooltipContent side="top">
            {{ selectedIssue || getValueRefPickerItemIssue(picker.selectedItem) }}
          </TooltipContent>
        </Tooltip>

        <span v-if="selectedType" class="ml-auto shrink-0 font-medium">
          {{ selectedType }}
        </span>
      </template>
    </VariableTreePanelShell>
  </TooltipProvider>
</template>
