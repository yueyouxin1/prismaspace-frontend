<script setup lang="ts">
import type { SchemaNode, SchemaType } from "../../core";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@prismaspace/ui-shadcn/components/ui/dropdown-menu";
import { Button } from "@prismaspace/ui-shadcn/components/ui/button";
import { ChevronDown } from "lucide-vue-next";
import { schemaTypeLabelMap, schemaTypeShortLabelMap } from "../runtime-editor-utils";

const props = withDefaults(
  defineProps<{
    node: SchemaNode;
    valueMode: SchemaType | "expr";
    disabled?: boolean;
  }>(),
  {
    disabled: false,
  },
);

const emit = defineEmits<{
  (event: "change", payload: { nextType: SchemaType | "expr"; itemType?: SchemaType }): void;
}>();

const baseTypes: SchemaType[] = ["string", "integer", "number", "boolean", "object"];
const arrayItemTypes: SchemaType[] = ["string", "integer", "number", "boolean", "object", "array"];

function getDisplayLabel() {
  if (props.valueMode === "expr") return "expr";
  if (props.node.type !== "array") return schemaTypeShortLabelMap[props.node.type];
  const itemType = props.node.item?.type ?? "string";
  return `[${schemaTypeShortLabelMap[itemType].replace(".", "")}]`;
}

function onSelectBaseType(type: SchemaType) {
  emit("change", { nextType: type });
}

function onSelectArrayType(itemType: SchemaType) {
  emit("change", { nextType: "array", itemType });
}

function onSelectExpr() {
  emit("change", { nextType: "expr" });
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button
        type="button"
        variant="ghost"
        :disabled="disabled"
        class="h-auto min-h-7 min-w-[40px] max-w-[46px] shrink-0 self-stretch justify-between gap-0 rounded-none border-0 bg-[#f5f4fa] px-0.5 text-[11px] font-medium text-[#66687b] shadow-none hover:bg-[#efedf8] focus-visible:ring-0"
      >
        <span class="truncate text-left">{{ getDisplayLabel() }}</span>
        <ChevronDown class="size-3 shrink-0 text-[#8d8fa2]" />
      </Button>
    </DropdownMenuTrigger>

    <DropdownMenuContent align="start" class="min-w-[196px] rounded-[14px] border-[#e7e5ef] p-1.5">
      <DropdownMenuItem class="rounded-[10px] px-3 py-2 text-[13px]" @select="onSelectExpr">
        Expression
      </DropdownMenuItem>

      <DropdownMenuItem
        v-for="type in baseTypes"
        :key="type"
        class="rounded-[10px] px-3 py-2 text-[13px]"
        @select="onSelectBaseType(type)"
      >
        {{ schemaTypeLabelMap[type] }}
      </DropdownMenuItem>

      <DropdownMenuSub>
        <DropdownMenuSubTrigger class="rounded-[10px] px-3 py-2 text-[13px]">
          Array
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent class="min-w-[180px] rounded-[14px] border-[#e7e5ef] p-1.5">
          <DropdownMenuItem
            v-for="type in arrayItemTypes"
            :key="`array-${type}`"
            class="rounded-[10px] px-3 py-2 text-[13px]"
            @select="onSelectArrayType(type)"
          >
            Array&lt;{{ schemaTypeLabelMap[type] }}&gt;
          </DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
