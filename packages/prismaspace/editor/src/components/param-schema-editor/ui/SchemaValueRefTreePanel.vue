<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { ValueRefContent } from "../core";
import type { VariableTreeNode } from "./tree-types";
import { Input } from "@prismaspace/ui-shadcn/components/ui/input";
import { ScrollArea } from "@prismaspace/ui-shadcn/components/ui/scroll-area";
import { Badge } from "@prismaspace/ui-shadcn/components/ui/badge";
import { Button } from "@prismaspace/ui-shadcn/components/ui/button";
import { ChevronDown, ChevronRight, Search, X } from "lucide-vue-next";

defineOptions({ name: "SchemaValueRefTreePanel" });

interface NormalizedTreeItem {
  key: string;
  label: string;
  caption: string;
  source?: string;
  ref: ValueRefContent | null;
  children: NormalizedTreeItem[];
  searchableText: string;
}

interface FlatTreeItem extends NormalizedTreeItem {
  level: number;
  hasChildren: boolean;
  isLeaf: boolean;
}

const props = withDefaults(
  defineProps<{
    tree?: VariableTreeNode[];
    modelValue?: ValueRefContent | null;
    placeholder?: string;
    emptyText?: string;
    searchPlaceholder?: string;
  }>(),
  {
    tree: () => [],
    modelValue: null,
    placeholder: "请选择变量引用",
    emptyText: "没有可用的变量项",
    searchPlaceholder: "搜索变量 / 节点",
  },
);

const emit = defineEmits<{
  (event: "select", value: ValueRefContent): void;
  (event: "update:query", value: string): void;
  (event: "request-close"): void;
}>();

const query = ref("");
const expandedKeys = ref<string[]>([]);

const normalizedTree = computed<NormalizedTreeItem[]>(() => normalizeTree(props.tree ?? [], []));
const selectedKey = computed(() => getRefKey(props.modelValue));
const expandedSet = computed(() => new Set(expandedKeys.value));
const hasQuery = computed(() => query.value.trim().length > 0);

const filteredTree = computed(() => {
  if (!hasQuery.value) return normalizedTree.value;
  return filterTree(normalizedTree.value, query.value.trim().toLowerCase());
});

const flatItems = computed<FlatTreeItem[]>(() => {
  const autoExpand = hasQuery.value;
  return flattenTree(filteredTree.value, expandedSet.value, 0, autoExpand);
});

const selectedItem = computed(() => {
  const key = selectedKey.value;
  if (!key) return null;
  return findItemByKey(normalizedTree.value, key);
});

watch(
  normalizedTree,
  (tree) => {
    const validKeys = new Set(collectKeys(tree));
    const nextExpanded = expandedKeys.value.filter((key) => validKeys.has(key));
    if (nextExpanded.length !== expandedKeys.value.length) {
      expandedKeys.value = nextExpanded;
    }
    expandPathToSelected();
  },
  { immediate: true },
);

watch(
  () => props.modelValue,
  () => {
    expandPathToSelected();
  },
  { deep: true },
);

watch(query, (value) => {
  emit("update:query", value);
});

function normalizeTree(nodes: VariableTreeNode[], labels: string[], inheritedBlockId = ""): NormalizedTreeItem[] {
  return nodes.map((node, index) => {
    const rawLabel = node.label ?? node.name ?? node.title ?? node.path ?? node.id ?? `node-${index + 1}`;
    const label = String(rawLabel).trim() || `node-${index + 1}`;
    const nextLabels = [...labels, label];
    const blockID = String(node.blockID ?? inheritedBlockId ?? node.id ?? "").trim();
    const path = String(node.path ?? "").trim();
    const source = String(node.source ?? "").trim() || undefined;
    const fallbackPath = nextLabels.join(".");
    const ref =
      blockID || path
        ? {
            blockID: blockID || inheritedBlockId || label,
            path: path || fallbackPath,
            source,
          }
        : null;
    const caption = ref ? `${ref.blockID} · ${ref.path}` : nextLabels.join(" / ");
    const children = normalizeTree(node.children ?? [], nextLabels, blockID || inheritedBlockId);
    return {
      key: String(node.key ?? node.id ?? `${labels.join(".")}:${label}:${index}`),
      label,
      caption,
      source,
      ref,
      children,
      searchableText: [label, caption, source ?? "", nextLabels.join(" "), blockID, path].join(" ").toLowerCase(),
    };
  });
}

function filterTree(nodes: NormalizedTreeItem[], normalizedQuery: string): NormalizedTreeItem[] {
  const next: NormalizedTreeItem[] = [];
  for (const node of nodes) {
    const children = filterTree(node.children, normalizedQuery);
    if (node.searchableText.includes(normalizedQuery) || children.length) {
      next.push({
        ...node,
        children,
      });
    }
  }
  return next;
}

function flattenTree(
  nodes: NormalizedTreeItem[],
  expanded: Set<string>,
  level: number,
  autoExpand: boolean,
): FlatTreeItem[] {
  const list: FlatTreeItem[] = [];
  for (const node of nodes) {
    const hasChildren = node.children.length > 0;
    const isExpanded = autoExpand || expanded.has(node.key);
    list.push({
      ...node,
      level,
      hasChildren,
      isLeaf: !hasChildren,
    });
    if (hasChildren && isExpanded) {
      list.push(...flattenTree(node.children, expanded, level + 1, autoExpand));
    }
  }
  return list;
}

function collectKeys(nodes: NormalizedTreeItem[]): string[] {
  const keys: string[] = [];
  for (const node of nodes) {
    keys.push(node.key);
    keys.push(...collectKeys(node.children));
  }
  return keys;
}

function findItemByKey(nodes: NormalizedTreeItem[], key: string): NormalizedTreeItem | null {
  for (const node of nodes) {
    if (node.key === key) return node;
    const child = findItemByKey(node.children, key);
    if (child) return child;
  }
  return null;
}

function findPathByRef(nodes: NormalizedTreeItem[], key: string, path: string[] = []): string[] {
  for (const node of nodes) {
    const nextPath = [...path, node.key];
    if (node.ref && getRefKey(node.ref) === key) return nextPath;
    const childPath = findPathByRef(node.children, key, nextPath);
    if (childPath.length) return childPath;
  }
  return [];
}

function getRefKey(ref: ValueRefContent | null | undefined) {
  if (!ref) return "";
  return `${ref.blockID ?? ""}::${ref.path ?? ""}::${ref.source ?? ""}`;
}

function toggleExpand(key: string) {
  const next = new Set(expandedKeys.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  expandedKeys.value = [...next];
}

function setQuery(value: string) {
  query.value = value;
}

function clearQuery() {
  query.value = "";
}

function selectReference(ref: ValueRefContent) {
  emit("select", ref);
  emit("request-close");
}

function expandPathToSelected() {
  const key = selectedKey.value;
  if (!key) return;
  const path = findPathByRef(normalizedTree.value, key);
  if (!path.length) return;
  const next = new Set(expandedKeys.value);
  path.slice(0, -1).forEach((itemKey) => {
    next.add(itemKey);
  });
  expandedKeys.value = [...next];
}

function isSelected(item: FlatTreeItem) {
  return Boolean(item.ref && selectedKey.value && getRefKey(item.ref) === selectedKey.value);
}

const slotProps = computed(() => ({
  tree: filteredTree.value,
  flatItems: flatItems.value,
  query: query.value,
  setQuery,
  clearQuery,
  expandedKeys: expandedKeys.value,
  toggleExpand,
  selected: props.modelValue,
  selectedItem: selectedItem.value,
  selectReference,
  close: () => emit("request-close"),
}));

defineExpose({
  setQuery,
  clearQuery,
  selectReference,
});
</script>

<template>
  <slot name="tree-panel" v-bind="slotProps">
    <div class="flex min-h-0 flex-col gap-3">
      <div class="flex items-center gap-2 rounded-[12px] border border-[#e8e7ef] bg-[#f7f7fb] px-3 py-2">
        <Search class="size-4 shrink-0 text-[#9898a8]" />
        <Input
          :model-value="query"
          :placeholder="searchPlaceholder"
          class="h-7 border-0 bg-transparent px-0 text-[13px] shadow-none focus-visible:ring-0"
          @update:model-value="setQuery(String($event))"
        />
        <Button
          v-if="query"
          type="button"
          size="icon-sm"
          variant="ghost"
          class="size-6 rounded-full text-[#7f8094]"
          @click="clearQuery"
        >
          <X class="size-3.5" />
        </Button>
      </div>

      <div v-if="selectedItem?.ref" class="rounded-[12px] border border-[#e9e7fb] bg-[#f6f3ff] px-3 py-2">
        <div class="flex items-center justify-between gap-2">
          <div class="min-w-0">
            <p class="truncate text-[12px] font-medium text-[#504672]">{{ selectedItem.label }}</p>
            <p class="truncate text-[11px] text-[#7a7497]">{{ selectedItem.caption }}</p>
          </div>
          <Badge variant="secondary" class="rounded-full bg-white/85 text-[#6b5eb8]">
            当前引用
          </Badge>
        </div>
      </div>

      <ScrollArea class="min-h-0 flex-1 rounded-[14px] border border-[#eceaf2] bg-white">
        <div v-if="!flatItems.length" class="px-4 py-10 text-center text-[13px] text-[#8f91a2]">
          {{ emptyText }}
        </div>
        <div v-else class="space-y-1 p-2">
          <button
            v-for="item in flatItems"
            :key="item.key"
            type="button"
            :class="[
              'flex w-full items-start gap-2 rounded-[10px] px-2 py-2 text-left transition-colors',
              isSelected(item) ? 'bg-[#f3efff] text-[#3d3263]' : 'hover:bg-[#f6f6fb] text-[#2f3242]',
            ]"
            @click="item.ref ? selectReference(item.ref) : item.hasChildren ? toggleExpand(item.key) : undefined"
          >
            <span class="flex shrink-0 items-center pt-0.5" :style="{ width: `${item.level * 14 + 16}px` }">
              <span v-if="item.hasChildren" class="inline-flex size-4 items-center justify-center rounded-[6px] text-[#8a8ba1]">
                <ChevronDown v-if="hasQuery || expandedSet.has(item.key)" class="size-3.5" />
                <ChevronRight v-else class="size-3.5" />
              </span>
              <span v-else class="inline-flex size-4 items-center justify-center">
                <span class="size-1.5 rounded-full bg-[#d4d6df]" />
              </span>
            </span>

            <span class="min-w-0 flex-1">
              <span class="flex items-center gap-2">
                <span class="truncate text-[13px] font-medium">{{ item.label }}</span>
                <Badge
                  v-if="item.source"
                  variant="outline"
                  class="rounded-full border-[#e6e4f0] bg-[#f8f7fc] px-1.5 text-[10px] text-[#7e7a92]"
                >
                  {{ item.source }}
                </Badge>
              </span>
              <span class="mt-0.5 block truncate text-[11px] text-[#8d90a2]">
                {{ item.ref ? item.caption : item.children.length ? `${item.children.length} 个子项` : placeholder }}
              </span>
            </span>
          </button>
        </div>
      </ScrollArea>
    </div>
  </slot>
</template>
