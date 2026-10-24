import type {
  DeclaredProps,
  FieldGroupEvents,
  FieldGroupKitPart,
  FieldGroupSchemaProps,
  KitDrawing,
  KitEvents,
  KitHasChildren,
  KitMappedProps,
  KitPart,
  KitSchemaProps,
  KitSlots,
  WireNode,
} from '@repo/contracts/kit-props';
import type { ReactNode } from 'react';

type SchemaProps<Name extends KitPart> = DeclaredProps<KitSchemaProps[Name]> &
  Partial<Record<Exclude<KitSlots<Name>, keyof KitSchemaProps[Name]>, null>> &
  (KitHasChildren<Name> extends true
    ? { children?: ReactNode }
    : Record<never, never>);

// The App draws its own nodes, choices and list items; handlers return nothing.
interface AppDrawing<Choice, Node, Item> extends KitDrawing {
  node: Node;
  choice: Choice;
  item: Item;
  wireNode: WireNode;
  returns: void;
  plugin: false;
}

export type KitProps<
  Name extends KitPart,
  Choice extends string = string,
  Node = ReactNode,
  Item = unknown,
> = KitMappedProps<
  SchemaProps<Name>,
  KitEvents<Name>,
  KitSlots<Name> | (KitHasChildren<Name> extends true ? 'children' : never),
  AppDrawing<Choice, Node, Item>
>;

// A Form component's props (ADR-0042): its Contracts schema, with handlers as callbacks.
export type FieldGroupKitProps<Name extends FieldGroupKitPart> = KitMappedProps<
  FieldGroupSchemaProps<Name>,
  FieldGroupEvents<Name>,
  never,
  AppDrawing<string, ReactNode, unknown>
>;
