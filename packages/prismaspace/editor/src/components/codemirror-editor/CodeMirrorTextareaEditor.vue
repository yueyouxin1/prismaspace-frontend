<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import type { Extension } from "@codemirror/state";
import type { EditorView, ViewUpdate } from "@codemirror/view";
import { EditorView as CmEditorView } from "@codemirror/view";
import { cn } from "@prismaspace/ui-shadcn/lib/utils";
import {
  EDITOR_TEXTAREA_PADDING_BOTTOM_PX,
  EDITOR_TEXTAREA_PADDING_TOP_PX,
  EDITOR_TEXTAREA_PADDING_X_PX,
  EDITOR_TEXTAREA_SHELL_CLASS,
  normalizeEditorSize,
  resolveEditorTextareaHeight,
} from "../editor-textarea-utils";
import CodeMirrorEditor from "./CodeMirrorEditor.vue";
import type { CodeMirrorTextareaEditorExpose, CodeMirrorTextareaEditorProps } from "./textarea-types";
import type { CodeMirrorEditorExpose, CodeMirrorEditorReadyPayload } from "./types";

const props = withDefaults(defineProps<CodeMirrorTextareaEditorProps>(), {
  theme: "vs-light",
  width: "100%",
  placeholder: "",
  fontSize: 13,
  readonly: false,
  autofocus: false,
  language: "json",
  extensions: undefined,
  minRows: 1,
  maxRows: undefined,
});

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
  (e: "ready", payload: CodeMirrorEditorReadyPayload): void;
  (e: "change", value: string): void;
  (e: "focus"): void;
  (e: "blur"): void;
  (e: "view-update", payload: ViewUpdate): void;
  (e: "error", error: unknown): void;
}>();

const editorRef = ref<CodeMirrorEditorExpose>();
const editorHeight = ref(resolveEditorTextareaHeight(0, props.fontSize, props.minRows, props.maxRows));

const textareaThemeExtension = computed<Extension>(() =>
  CmEditorView.theme({
    "&": {
      height: "100%",
      backgroundColor: "transparent",
      color: "inherit",
    },
    ".cm-scroller": {
      overflowX: "hidden",
      overflowY: "auto",
      fontFamily: "inherit",
      lineHeight: "1.5",
    },
    ".cm-content": {
      minHeight: "100%",
      padding: `${EDITOR_TEXTAREA_PADDING_TOP_PX}px ${EDITOR_TEXTAREA_PADDING_X_PX}px ${EDITOR_TEXTAREA_PADDING_BOTTOM_PX}px`,
      caretColor: "currentColor",
    },
    ".cm-line": {
      padding: "0",
    },
    ".cm-focused": {
      outline: "none",
      boxShadow: "none",
    },
    ".cm-activeLine": {
      backgroundColor: "transparent",
    },
    ".cm-placeholder": {
      color: "hsl(var(--muted-foreground))",
    },
  }),
);

const mergedExtensions = computed<Extension[]>(() => {
  const customExtensions = props.extensions
    ? Array.isArray(props.extensions)
      ? props.extensions
      : [props.extensions]
    : [];

  return [...customExtensions, textareaThemeExtension.value];
});

const rootClass = computed(() =>
  cn("codemirror-textarea-editor-root", EDITOR_TEXTAREA_SHELL_CLASS, "bg-background dark:bg-input/30"),
);

const rootStyle = computed(() => ({
  width: normalizeEditorSize(props.width),
}));

const containerHeight = computed(() => `${editorHeight.value}px`);

function syncEditorHeight(view?: EditorView) {
  const currentView = view ?? editorRef.value?.getView();
  const contentHeight = currentView?.contentHeight ?? 0;
  editorHeight.value = resolveEditorTextareaHeight(contentHeight, props.fontSize, props.minRows, props.maxRows);
}

function handleReady(payload: CodeMirrorEditorReadyPayload) {
  syncEditorHeight(payload.view);
  emit("ready", payload);
}

function handleViewUpdate(payload: ViewUpdate) {
  syncEditorHeight(payload.view);
  emit("view-update", payload);
}

watch(
  () => [props.modelValue, props.fontSize, props.minRows, props.maxRows] as const,
  () => {
    nextTick(() => syncEditorHeight());
  },
);

onMounted(() => {
  nextTick(() => syncEditorHeight());
});

defineExpose<CodeMirrorTextareaEditorExpose>({
  focus: () => editorRef.value?.focus(),
  blur: () => editorRef.value?.blur(),
  getView: () => editorRef.value?.getView(),
});
</script>

<template>
  <div :class="rootClass" :style="rootStyle">
    <CodeMirrorEditor
      ref="editorRef"
      :model-value="modelValue"
      :theme="theme"
      width="100%"
      :height="containerHeight"
      :placeholder="placeholder"
      :font-size="fontSize"
      :line-numbers="false"
      :line-wrapping="true"
      :readonly="readonly"
      :autofocus="autofocus"
      :language="language"
      :extensions="mergedExtensions"
      @update:model-value="emit('update:modelValue', $event)"
      @ready="handleReady"
      @change="emit('change', $event)"
      @focus="emit('focus')"
      @blur="emit('blur')"
      @view-update="handleViewUpdate"
      @error="emit('error', $event)"
    />
  </div>
</template>

<style scoped>
.codemirror-textarea-editor-root :deep(.codemirror-editor-root) {
  width: 100%;
  height: 100%;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.codemirror-textarea-editor-root :deep(.codemirror-editor-container) {
  height: 100%;
}

.codemirror-textarea-editor-root :deep(.cm-editor.cm-focused) {
  outline: none !important;
  box-shadow: none !important;
}
</style>
