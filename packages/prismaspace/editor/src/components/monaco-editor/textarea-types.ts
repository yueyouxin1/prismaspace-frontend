import type { MonacoEditorExpose, MonacoEditorProps } from "./types";

export interface MonacoTextareaEditorProps
  extends Omit<MonacoEditorProps, "height" | "minimap" | "lineNumbers" | "wordWrap"> {
  minRows?: number;
  maxRows?: number;
}

export type MonacoTextareaEditorExpose = MonacoEditorExpose;
