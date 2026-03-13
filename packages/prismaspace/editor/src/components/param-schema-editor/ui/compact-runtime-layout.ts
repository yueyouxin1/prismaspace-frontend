export type CompactRuntimeDensity = "xs" | "sm" | "md" | "lg";

export interface CompactRuntimeLayout {
  density: CompactRuntimeDensity;
  railWidth: number;
  gridTemplate: string;
  inlineType: boolean;
  inlineRequired: boolean;
  inlineDefault: boolean;
  valueField: "value" | "default" | null;
  readBadgeOnly: boolean;
  actionButtons: number;
}
