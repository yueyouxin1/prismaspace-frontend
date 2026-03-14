<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import type * as monaco from "monaco-editor";
import { cn } from "@prismaspace/ui-shadcn/lib/utils";
import {
  EDITOR_TEXTAREA_PADDING_BOTTOM_PX,
  EDITOR_TEXTAREA_PADDING_TOP_PX,
  EDITOR_TEXTAREA_PADDING_X_PX,
  EDITOR_TEXTAREA_SHELL_CLASS,
  normalizeEditorSize,
  resolveEditorTextareaHeight,
  resolveEditorTextareaLineHeight,
} from "../editor-textarea-utils";
import MonacoEditor from "./MonacoEditor.vue";
import type { MonacoTextareaEditorExpose, MonacoTextareaEditorProps } from "./textarea-types";
import type { MonacoEditorExpose } from "./types";

const props = withDefaults(defineProps<MonacoTextareaEditorProps>(), {
  language: "json",
  theme: "vs-light",
  width: "100%",
  placeholder: "",
  fontSize: 13,
  readonly: false,
  autofocus: false,
  options: undefined,
  path: undefined,
  bare: false,
  minRows: 1,
  maxRows: undefined,
});

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
  (e: "ready", payload: { editor: monaco.editor.IStandaloneCodeEditor; monaco: typeof monaco }): void;
  (e: "change", value: string): void;
  (e: "focus"): void;
  (e: "blur"): void;
  (e: "validate", markers: monaco.editor.IMarker[]): void;
  (e: "error", error: unknown): void;
}>();

const editorRef = ref<MonacoEditorExpose>();
const resolvedHorizontalPadding = computed(() => (props.bare ? 8 : EDITOR_TEXTAREA_PADDING_X_PX));
const resolvedVerticalPadding = computed(() =>
  props.bare ? 4 : EDITOR_TEXTAREA_PADDING_TOP_PX + EDITOR_TEXTAREA_PADDING_BOTTOM_PX,
);
const resolvedLineHeight = computed(() =>
  props.bare ? Math.max(16, Math.round(props.fontSize * 1.35)) : resolveEditorTextareaLineHeight(props.fontSize),
);
const editorHeight = ref(
  resolveEditorTextareaHeight(0, props.fontSize, props.minRows, props.maxRows, resolvedVerticalPadding.value),
);

let contentSizeListener: monaco.IDisposable | undefined;

const resolvedOptions = computed<monaco.editor.IStandaloneEditorConstructionOptions>(() => ({
  ...props.options,
  acceptSuggestionOnEnter: "off",
  codeLens: false,
  contextmenu: false,
  glyphMargin: false,
  folding: false,
  hover: {
    enabled: false,
    ...(props.options?.hover ?? {}),
  },
  inlineSuggest: {
    enabled: false,
    ...(props.options?.inlineSuggest ?? {}),
  },
  lineDecorationsWidth: 0,
  lineNumbersMinChars: 0,
  lineNumbers: "off",
  matchBrackets: "never",
  minimap: { enabled: false },
  occurrencesHighlight: "off",
  parameterHints: {
    enabled: false,
    ...(props.options?.parameterHints ?? {}),
  },
  overviewRulerLanes: 0,
  overviewRulerBorder: false,
  quickSuggestions: false,
  renderLineHighlight: "none",
  selectionHighlight: false,
  snippetSuggestions: "none",
  scrollBeyondLastLine: false,
  suggestOnTriggerCharacters: false,
  cursorWidth: props.bare ? 1 : props.options?.cursorWidth,
  scrollbar: {
    alwaysConsumeMouseWheel: false,
    handleMouseWheel: false,
    horizontal: "hidden",
    useShadows: false,
    vertical: "hidden",
    ...(props.options?.scrollbar ?? {}),
  },
  tabCompletion: "off",
  wordBasedSuggestions: "off",
  padding: {
    top: props.bare ? 2 : EDITOR_TEXTAREA_PADDING_TOP_PX,
    bottom: props.bare ? 2 : EDITOR_TEXTAREA_PADDING_BOTTOM_PX,
    ...(props.options?.padding ?? {}),
  },
  wordWrap: "on",
  lineHeight: resolvedLineHeight.value,
}));

const rootClass = computed(() =>
  cn(
    "monaco-textarea-editor-root",
    props.bare ? "bg-transparent shadow-none border-0 rounded-none ring-0" : EDITOR_TEXTAREA_SHELL_CLASS,
    props.bare ? "" : "bg-background dark:bg-input/30",
  ),
);

const rootStyle = computed(() => ({
  width: normalizeEditorSize(props.width),
}));

const containerHeight = computed(() => `${editorHeight.value}px`);

function syncEditorHeight() {
  const editor = editorRef.value?.getEditor();
  const contentHeight = editor?.getContentHeight() ?? 0;
  editorHeight.value = resolveEditorTextareaHeight(
    contentHeight,
    props.fontSize,
    props.minRows,
    props.maxRows,
    resolvedVerticalPadding.value,
  );
  nextTick(() => editor?.layout());
}

function bindEditorListeners(editor: monaco.editor.IStandaloneCodeEditor) {
  contentSizeListener?.dispose();
  contentSizeListener = editor.onDidContentSizeChange(() => {
    syncEditorHeight();
  });
}

function handleReady(payload: { editor: monaco.editor.IStandaloneCodeEditor; monaco: typeof monaco }) {
  bindEditorListeners(payload.editor);
  syncEditorHeight();
  emit("ready", payload);
}

watch(
  () => [props.modelValue, props.fontSize, props.minRows, props.maxRows] as const,
  () => {
    nextTick(() => syncEditorHeight());
  },
);

onBeforeUnmount(() => {
  contentSizeListener?.dispose();
  contentSizeListener = undefined;
});

defineExpose<MonacoTextareaEditorExpose>({
  focus: () => editorRef.value?.focus(),
  blur: () => editorRef.value?.blur(),
  formatDocument: async () => {
    await editorRef.value?.formatDocument();
  },
  getEditor: () => editorRef.value?.getEditor(),
  getModel: () => editorRef.value?.getModel(),
});
</script>

<template>
  <div :class="rootClass" :style="rootStyle">
    <div class="monaco-textarea-editor-inner" :style="{ paddingInline: `${resolvedHorizontalPadding}px` }">
      <MonacoEditor
        ref="editorRef"
        :model-value="modelValue"
        :language="language"
        :path="path"
        :theme="theme"
        width="100%"
        :height="containerHeight"
        :placeholder="placeholder"
        word-wrap="on"
        :font-size="fontSize"
        :minimap="false"
        line-numbers="off"
        :options="resolvedOptions"
        :readonly="readonly"
        :autofocus="autofocus"
        @update:model-value="emit('update:modelValue', $event)"
        @ready="handleReady"
        @change="emit('change', $event)"
        @focus="emit('focus')"
        @blur="emit('blur')"
        @validate="emit('validate', $event)"
        @error="emit('error', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.monaco-textarea-editor-root :deep(.monaco-editor-root) {
  width: 100%;
}

.monaco-textarea-editor-inner {
  width: 100%;
}

.monaco-textarea-editor-root :deep(.monaco-editor-container) {
  min-height: 0;
}

.monaco-textarea-editor-root :deep(.monaco-editor),
.monaco-textarea-editor-root :deep(.monaco-editor-background),
.monaco-textarea-editor-root :deep(.margin),
.monaco-textarea-editor-root :deep(.inputarea.ime-input) {
  background: transparent !important;
}

.monaco-textarea-editor-root :deep(.monaco-editor.focused),
.monaco-textarea-editor-root :deep(.monaco-editor .focused) {
  outline: none !important;
  box-shadow: none !important;
}

.monaco-textarea-editor-root :deep(.monaco-editor .current-line),
.monaco-textarea-editor-root :deep(.monaco-editor .current-line-margin) {
  border: 0 !important;
  background: transparent !important;
}

.monaco-textarea-editor-root :deep(.monaco-editor textarea:focus),
.monaco-textarea-editor-root :deep(.monaco-editor .inputarea.ime-input:focus) {
  outline: none !important;
  box-shadow: none !important;
}

.monaco-textarea-editor-root :deep(.monaco-editor .margin) {
  width: 0 !important;
}

.monaco-textarea-editor-root :deep(.monaco-editor .view-overlays),
.monaco-textarea-editor-root :deep(.monaco-editor .margin-view-overlays) {
  background: transparent !important;
}

.monaco-textarea-editor-root :deep(.monaco-editor .scroll-decoration) {
  display: none !important;
}
</style>
