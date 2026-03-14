import type { MonacoEditorExpose, MonacoEditorProps } from "./types";

export interface MonacoTextareaEditorProps
  extends Omit<MonacoEditorProps, "height" | "minimap" | "lineNumbers" | "wordWrap"> {
  bare?: boolean;
  minRows?: number;
  maxRows?: number;
}

export type MonacoTextareaEditorExpose = MonacoEditorExpose;
