<script setup lang="ts">
import { computed } from "vue";
import type { ValueRefPickerViewModel } from "./value-ref-picker";
import { getValueRefPickerItemIssue } from "./value-ref-picker";
import { formatValueRefSummary } from "./runtime-editor-utils";
import SchemaValueRefTree from "./SchemaValueRefTree.vue";
import { Button } from "@prismaspace/ui-shadcn/components/ui/button";
import { Input } from "@prismaspace/ui-shadcn/components/ui/input";
import { ScrollArea } from "@prismaspace/ui-shadcn/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@prismaspace/ui-shadcn/components/ui/tooltip";
import { AlertCircle, Search, X } from "lucide-vue-next";

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
    <div class="flex min-h-0 flex-col overflow-hidden rounded-lg bg-background">
      <div class="flex items-center gap-2 border-b px-3">
        <Search class="size-4 shrink-0 text-muted-foreground" />
        <Input :model-value="picker.query" :placeholder="searchPlaceholder"
          class="h-10 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
          @update:model-value="picker.setQuery(String($event))" />
        <Button v-if="picker.query" type="button" size="icon-sm" variant="ghost" class="size-7 rounded-sm"
          @click="picker.clearQuery">
          <X class="size-3.5" />
        </Button>
      </div>

      <ScrollArea class="min-h-0 flex-1">
        <SchemaValueRefTree :picker="picker" :items="picker.filteredItems" :empty-text="emptyText" class="min-h-full"
          @request-close="emit('request-close')" />
      </ScrollArea>

      <div v-if="picker.selected" class="flex items-center gap-2 border-t px-3 py-2 text-xs text-muted-foreground">
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
      </div>
    </div>
  </TooltipProvider>
</template>
