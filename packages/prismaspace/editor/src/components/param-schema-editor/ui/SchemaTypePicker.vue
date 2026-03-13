<script setup lang="ts">
import { computed } from "vue";
import type { SchemaNode, SchemaType } from "../core";
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
import { schemaTypeLabelMap, schemaTypeShortLabelMap } from "./runtime-editor-utils";

const props = withDefaults(
  defineProps<{
    node: SchemaNode;
    disabled?: boolean;
    class?: string;
    compact?: boolean;
  }>(),
  {
    disabled: false,
    class: "",
    compact: false,
  },
);

const emit = defineEmits<{
  (event: "change", payload: { nextType: SchemaType; itemType?: SchemaType }): void;
}>();

const baseTypes: SchemaType[] = ["string", "integer", "number", "boolean", "object"];
const arrayItemTypes: SchemaType[] = ["string", "integer", "number", "boolean", "object", "array"];

const displayLabel = computed(() => {
  if (props.node.type !== "array") {
    return `${schemaTypeShortLabelMap[props.node.type]} ${schemaTypeLabelMap[props.node.type]}`;
  }

  const itemType = props.node.item?.type ?? "string";
  return `${schemaTypeShortLabelMap[itemType]} Array<${schemaTypeLabelMap[itemType]}>`;
});

function onSelectBaseType(type: SchemaType) {
  emit("change", { nextType: type });
}

function onSelectArrayType(itemType: SchemaType) {
  emit("change", { nextType: "array", itemType });
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button
        type="button"
        variant="outline"
        :disabled="disabled"
        :class="[
          compact
            ? 'h-7 w-full justify-between rounded-[9px] border-[#dddce6] bg-white px-2 text-[12px] font-normal text-[#373a48] shadow-none'
            : 'h-8 w-full justify-between rounded-[10px] border-[#dddce6] bg-white px-2 text-[12px] font-normal text-[#373a48] shadow-none',
          props.class,
        ]"
      >
        <span class="truncate text-left">{{ displayLabel }}</span>
        <ChevronDown class="ml-1 size-3.5 shrink-0 text-[#8d8fa2]" />
      </Button>
    </DropdownMenuTrigger>

    <DropdownMenuContent align="start" class="min-w-[196px] rounded-[14px] border-[#e7e5ef] p-1.5">
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
            {{ schemaTypeLabelMap[type] }}
          </DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
