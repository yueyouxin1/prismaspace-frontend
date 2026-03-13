import type { InjectionKey } from "vue";

export const TREE_INDENT = 15;
export const TREE_BASE_RAIL = 11;

export interface SchemaTreeOverlayRowRegistration {
  id: string;
  parentId: string | null;
  level: number;
  el: HTMLElement;
}

export interface SchemaTreeOverlayApi {
  registerRow: (registration: SchemaTreeOverlayRowRegistration) => void;
  unregisterRow: (id: string) => void;
  scheduleMeasure: () => void;
}

export const schemaTreeOverlayKey: InjectionKey<SchemaTreeOverlayApi> = Symbol("schema-tree-overlay");
