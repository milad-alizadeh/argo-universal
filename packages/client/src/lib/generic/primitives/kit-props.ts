import type {
  KitPart,
  KitSchemaProps,
  KitEvents,
  KitSlots,
  KitHasChildren,
  KitChoiceValue,
} from '@repo/contracts/kit-props';
import type { ReactNode } from 'react';

type Callback<Event, Choice> = Event extends { empty: true }
  ? () => void
  : Event extends { payload: infer Payload }
    ? (payload: Payload extends KitChoiceValue ? Choice : Payload) => void
    : never;

type CleanProps<Props> = Props extends object
  ? {
      [Prop in keyof Props as string extends Prop ? never : Prop]: Props[Prop];
    }
  : Props;

type SchemaProps<Name extends KitPart> = CleanProps<KitSchemaProps[Name]> &
  Partial<Record<Exclude<KitSlots<Name>, keyof KitSchemaProps[Name]>, never>> &
  (KitHasChildren<Name> extends true
    ? { children?: ReactNode }
    : Record<never, never>);

type KitValue<Value, Events, Node, Choice> = Value extends KitChoiceValue
  ? Choice
  : Value extends (infer Item)[]
    ? KitValue<Item, Events, Node, Choice>[]
    : Value extends readonly (infer Item)[]
      ? readonly KitValue<Item, Events, Node, Choice>[]
      : Value extends object
        ? MappedProps<Value, Events, never, Node, Choice>
        : Value;

// Contracts owns every prop, including events inside action and option data.
type MappedProps<Props, Events, Slots extends PropertyKey, Node, Choice> = {
  [Prop in keyof Props]: Prop extends Slots
    ? Node
    : Prop extends keyof Events
      ? [Exclude<Props[Prop], undefined>] extends [never]
        ? Props[Prop]
        : Callback<Events[Prop], Choice>
      : KitValue<Props[Prop], Events, Node, Choice>;
};

export type KitProps<
  Name extends KitPart,
  Choice extends string = string,
  Node = ReactNode,
> = MappedProps<
  SchemaProps<Name>,
  KitEvents<Name>,
  KitSlots<Name> | (KitHasChildren<Name> extends true ? 'children' : never),
  Node,
  Choice
>;
