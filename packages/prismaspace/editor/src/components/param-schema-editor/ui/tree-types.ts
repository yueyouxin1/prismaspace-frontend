import type { SchemaType } from "../core";

export interface VariableTreeNode {
  id?: string;
  key?: string | number;
  name?: string;
  label?: string;
  title?: string;
  path?: string;
  blockID?: string;
  source?: string;
  schemaType?: SchemaType;
  selectable?: boolean;
  children?: VariableTreeNode[];
}
