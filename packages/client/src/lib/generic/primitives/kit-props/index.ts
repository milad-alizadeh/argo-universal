import type {
  KitPart,
  KitSchemaProps,
  KitEvents,
  KitSlots,
  KitHasChildren,
  KitChoiceValue,
  KitListItem,
  KitNode,
  KitValuePayload,
} from '@repo/contracts/kit-props';
import type { ReactNode } from 'react';

type ChoicePayload<Payload, Choice> = Payload extends KitChoiceValue
  ? Choice
  : Payload extends (infer Element)[]
    ? ChoicePayload<Element, Choice>[]
    : Payload extends readonly (infer Element)[]
      ? readonly ChoicePayload<Element, Choice>[]
      : Payload;

type Callback<Event, Choice, Props> = Event extends { empty: true }
  ? () => void
  : Event extends { payload: infer Payload }
    ? (payload: ChoicePayload<KitValuePayload<Payload, Props>, Choice>) => void
    : never;

type CleanProps<Props> = Props extends object
  ? {
      [Prop in keyof Props as string extends Prop ? never : Prop]: Props[Prop];
    }
  : Props;

type SchemaProps<Name extends KitPart> = CleanProps<KitSchemaProps[Name]> &
  Partial<Record<Exclude<KitSlots<Name>, keyof KitSchemaProps[Name]>, null>> &
  (KitHasChildren<Name> extends true
    ? { children?: ReactNode }
    : Record<never, never>);

type KitValue<Value, Events, Node, Choice, Item> = Value extends KitListItem
  ? Item
  : Value extends KitNode
    ? Node
    : Value extends KitChoiceValue
      ? Choice
      : Value extends (...args: infer Args) => infer Result
        ? (
            ...args: {
              [Key in keyof Args]: KitValue<
                Args[Key],
                Events,
                Node,
                Choice,
                Item
              >;
            }
          ) => KitValue<Result, Events, Node, Choice, Item>
        : Value extends (infer Element)[]
          ? KitValue<Element, Events, Node, Choice, Item>[]
          : Value extends readonly (infer Element)[]
            ? readonly KitValue<Element, Events, Node, Choice, Item>[]
            : Value extends object
              ? MappedProps<Value, Events, never, Node, Choice, Item>
              : Value;

// Contracts owns every prop, including events inside action and option data.
type MappedProps<
  Props,
  Events,
  Slots extends PropertyKey,
  Node,
  Choice,
  Item,
> = {
  [Prop in keyof Props]: [Exclude<Props[Prop], undefined>] extends [never]
    ? Props[Prop]
    : Prop extends Slots
      ? Node
      : Prop extends keyof Events
        ? [Exclude<Props[Prop], undefined>] extends [never]
          ? Props[Prop]
          : Callback<Events[Prop], Choice, Props>
        : KitValue<Props[Prop], Events, Node, Choice, Item>;
};

export type KitProps<
  Name extends KitPart,
  Choice extends string = string,
  Node = ReactNode,
  Item = unknown,
> = MappedProps<
  SchemaProps<Name>,
  KitEvents<Name>,
  KitSlots<Name> | (KitHasChildren<Name> extends true ? 'children' : never),
  Node,
  Choice,
  Item
>;
