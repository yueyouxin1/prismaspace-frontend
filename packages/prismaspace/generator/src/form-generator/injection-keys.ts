import type { VariableTreeNode } from "@prismaspace/editor";
import type { InjectionKey, ShallowRef } from "vue";

export type FormGeneratorHeaderActionsPortal = {
  target: Readonly<ShallowRef<HTMLElement | null>>;
};

export type FormGeneratorTabsTriggerPortal = {
  target: Readonly<ShallowRef<HTMLElement | null>>;
};

export const formGeneratorHeaderActionsPortalKey: InjectionKey<FormGeneratorHeaderActionsPortal> = Symbol("form-generator-header-actions-portal");

export const formGeneratorTabsTriggerPortalKey: InjectionKey<FormGeneratorTabsTriggerPortal> = Symbol("form-generator-tabs-trigger-portal");

export const formGeneratorValueRefTreeKey: InjectionKey<Readonly<VariableTreeNode[]>> = Symbol("form-generator-value-ref-tree");
