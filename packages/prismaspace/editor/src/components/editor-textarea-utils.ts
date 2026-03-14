export const EDITOR_TEXTAREA_SHELL_CLASS =
  "border-input focus-within:border-ring focus-within:ring-ring/50 dark:bg-input/30 flex w-full overflow-hidden rounded-md border bg-transparent text-base shadow-xs transition-[color,box-shadow] outline-none focus-within:ring-[3px] md:text-sm";

export const EDITOR_TEXTAREA_PADDING_TOP_PX = 8;
export const EDITOR_TEXTAREA_PADDING_BOTTOM_PX = 8;
export const EDITOR_TEXTAREA_PADDING_X_PX = 12;

export function normalizeEditorSize(size: number | string): string {
  if (typeof size === "number") {
    return `${size}px`;
  }

  return size;
}

export function resolveEditorTextareaLineHeight(fontSize: number): number {
  return Math.max(18, Math.round(fontSize * 1.45));
}

export function resolveEditorTextareaHeight(
  contentHeight: number,
  fontSize: number,
  minRows = 1,
  maxRows?: number,
  verticalPadding = EDITOR_TEXTAREA_PADDING_TOP_PX + EDITOR_TEXTAREA_PADDING_BOTTOM_PX,
): number {
  const lineHeight = resolveEditorTextareaLineHeight(fontSize);
  const minHeight = lineHeight * Math.max(1, minRows) + verticalPadding;
  const maxHeight =
    typeof maxRows === "number" && maxRows > 0 ? lineHeight * maxRows + verticalPadding : Number.POSITIVE_INFINITY;
  const resolvedContentHeight = Math.max(contentHeight, minHeight);

  return Math.min(resolvedContentHeight, maxHeight);
}
