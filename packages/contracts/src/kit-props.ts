import type { z } from 'zod';
import type { KitCallbackReturn } from './kit-callback-return';
import type { kitComponentSchemas } from './plugins/kit-component-schemas';
import type { KitChoiceValue } from './plugins/selection-value';

export type KitComponentName = keyof typeof kitComponentSchemas;

export type { KitListItem, KitNode } from './plugins/list-expansion';

export type { KitChoiceValue } from './plugins/selection-value';

export type { WireNode } from './plugins/wire';

export type {
  FieldGroupEvents,
  FieldGroupKitComponentName,
  FieldGroupSchemaProps,
} from './plugins/field-group-kit-props';

// Index signatures from passthrough schemas are not props.
export type DeclaredProps<Props> = Props extends object
  ? {
      [Key in keyof Props as string extends Key ? never : Key]: Props[Key];
    }
  : Props;

/*
 * A List or Table's items and the `renderItem` that draws each one, run before the tree crosses the wire
 * (ADR-0031); without them the list takes its rows as children.
 */
export type KitListExpansion<Item, Node> =
  | {
      items: readonly Item[];
      renderItem: (item: Item, index: number) => Node;
      children?: undefined;
    }
  | { items?: undefined; renderItem?: undefined };

// The list expansion's props, for a kit component that has one.
export type Expansion<Component, Item, Node> = Component extends {
  expansion: z.ZodType;
}
  ? KitListExpansion<Item, Node>
  : Record<never, never>;

export type KitSchemaProps = {
  [Name in KitComponentName]: DeclaredProps<
    z.output<(typeof kitComponentSchemas)[Name]['props']>
  >;
};

export type KitExpansion<Name extends KitComponentName, Item, Node> = Expansion<
  (typeof kitComponentSchemas)[Name],
  Item,
  Node
>;

export type KitEvents<Name extends KitComponentName> =
  (typeof kitComponentSchemas)[Name]['events'];

export type KitSlots<Name extends KitComponentName> =
  keyof (typeof kitComponentSchemas)[Name]['slots'];

export type KitHasChildren<Name extends KitComponentName> =
  (typeof kitComponentSchemas)[Name]['children'] extends false ? false : true;

// An event whose payload may take several shapes reports the one its kit component's own `value` holds, as Picker `multiple` reports a list.
type KitValuePayload<Payload, Props> = Props extends {
  value?: infer Value;
}
  ? NarrowedTo<Payload, Extract<Payload, NonNullable<Value>>>
  : Payload;

// A payload narrowed to the shapes its component's value takes, or left whole when none fits.
type NarrowedTo<Payload, Narrowed> = [Narrowed] extends [never]
  ? Payload
  : Narrowed;

/*
 * How one side draws schema values. The App gets its own choices and receives handlers alone (inside nested
 * data too) and slot props as nodes. A Plugin writes JSX whose events are values.
 */
export interface KitDrawing {
  node: unknown;
  choice: unknown;
  returns: unknown;
  plugin: boolean;
}

type Payload<Schema, Props> = KitValuePayload<
  z.output<Extract<Schema, z.ZodType>>,
  Props
>;

// An event with no payload takes a handler with no argument.
type Callback<Schema, Props, Drawing extends KitDrawing> = [
  Payload<Schema, Props>,
] extends [undefined]
  ? () => KitCallbackReturn<Schema, Drawing['returns']>
  : (
      payload: KitValue<Payload<Schema, Props>, Record<never, never>, Drawing>,
    ) => KitCallbackReturn<Schema, Drawing['returns']>;

// A choice is drawn as the side's own choice type; objects and lists map prop by prop, and the rest is as the schema says.
type KitValue<
  Value,
  Events,
  Drawing extends KitDrawing,
> = Value extends KitChoiceValue
  ? Drawing['choice']
  : KitData<Value, Events, Drawing>;

type KitData<Value, Events, Drawing extends KitDrawing> = Value extends object
  ? KitObject<Value, Events, Drawing>
  : Value;

// A Plugin's nested event is a value like any other data, and its lists are readonly; the App's nested event takes a handler.
type KitObject<
  Value,
  Events,
  Drawing extends KitDrawing,
> = Drawing['plugin'] extends true
  ? Readonly<KitMappedProps<Value, Record<never, never>, never, Drawing>>
  : KitMappedProps<Value, Events, never, Drawing>;

// A Plugin's Render passes an event a value (ADR-0050); the App's kit component takes a handler.
type EventProp<
  Value,
  Schema,
  Props,
  Drawing extends KitDrawing,
> = Drawing['plugin'] extends true
  ? KitValue<Value, Record<never, never>, Drawing>
  : Callback<Schema, Props, Drawing>;

// A prop that is not a slot: an event, or data.
type KitProp<
  Prop,
  Props,
  Events,
  Drawing extends KitDrawing,
> = Prop extends keyof Events
  ? EventProp<Props[Prop & keyof Props], Events[Prop], Props, Drawing>
  : KitValue<Props[Prop & keyof Props], Events, Drawing>;

type KitSetProp<
  Prop,
  Props,
  Events,
  Slots extends PropertyKey,
  Drawing extends KitDrawing,
> = Prop extends Slots
  ? Drawing['node']
  : KitProp<Prop, Props, Events, Drawing>;

/*
 * The one schema-to-props mapping for App kit props and Plugin JSX; Contracts owns every prop, including
 * events inside action and option data. Slot props are drawn as nodes; a prop the schema leaves unset stays
 * unset, never a handler or a node.
 */
export type KitMappedProps<
  Props,
  Events,
  Slots extends PropertyKey,
  Drawing extends KitDrawing,
> = {
  [Prop in keyof Props]: [Exclude<Props[Prop], undefined>] extends [never]
    ? Props[Prop]
    : KitSetProp<Prop, Props, Events, Slots, Drawing>;
};
