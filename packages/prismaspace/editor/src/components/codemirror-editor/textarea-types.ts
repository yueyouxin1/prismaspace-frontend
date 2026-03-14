import type { CodeMirrorEditorExpose, CodeMirrorEditorProps } from "./types";

export interface CodeMirrorTextareaEditorProps
  extends Omit<CodeMirrorEditorProps, "height" | "lineNumbers" | "lineWrapping"> {
  bare?: boolean;
  minRows?: number;
  maxRows?: number;
}

export type CodeMirrorTextareaEditorExpose = CodeMirrorEditorExpose;
