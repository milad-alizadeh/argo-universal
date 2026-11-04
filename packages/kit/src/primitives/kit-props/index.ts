import type {
  DeclaredProps,
  FieldGroupEvents,
  FieldGroupKitComponentName,
  FieldGroupSchemaProps,
  KitDrawing,
  KitEvents,
  KitExpansion,
  KitHasChildren,
  KitMappedProps,
  KitComponentName,
  KitSchemaProps,
  KitSlots,
} from '@repo/contracts/kit-props';
import type { ReactNode } from 'react';

type SchemaProps<Name extends KitComponentName> = DeclaredProps<
  KitSchemaProps[Name]
> &
  Partial<Record<Exclude<KitSlots<Name>, keyof KitSchemaProps[Name]>, null>> &
  (KitHasChildren<Name> extends true
    ? { children?: ReactNode }
    : Record<never, never>);

// The App draws its own nodes and choices; handlers return nothing.
interface AppDrawing<Choice, Node> extends KitDrawing {
  node: Node;
  choice: Choice;
  returns: void;
  plugin: false;
}

export type KitProps<
  Name extends KitComponentName,
  Choice extends string = string,
  Node = ReactNode,
  Item = unknown,
> = KitMappedProps<
  SchemaProps<Name>,
  KitEvents<Name>,
  KitSlots<Name> | (KitHasChildren<Name> extends true ? 'children' : never),
  AppDrawing<Choice, Node>
> &
  KitExpansion<Name, Item, Node>;

// A Form component's props (ADR-0042): its Contracts schema, with handlers as callbacks.
export type FieldGroupKitProps<Name extends FieldGroupKitComponentName> =
  KitMappedProps<
    FieldGroupSchemaProps<Name>,
    FieldGroupEvents<Name>,
    never,
    AppDrawing<string, ReactNode>
  >;
