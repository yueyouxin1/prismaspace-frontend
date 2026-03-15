export type CompactRuntimeDensity = "xs" | "sm" | "md" | "lg";

export type CompactRuntimeControlColumnKey =
  | "required"
  | "add-child"
  | "toggle-detail"
  | "delete-node";

export interface CompactRuntimeControlColumn {
  key: CompactRuntimeControlColumnKey;
  label: string;
  width: string;
  minWidth: number;
  align: "center" | "right";
}

export interface CompactRuntimeLayout {
  density: CompactRuntimeDensity;
  railWidth: number;
  gridTemplate: string;
  inlineType: boolean;
  inlineDefault: boolean;
  valueField: "value" | "default" | null;
  readBadgeOnly: boolean;
  controlColumns: CompactRuntimeControlColumn[];
}
