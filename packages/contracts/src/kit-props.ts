import type { z } from 'zod';
import type { WithPropHints } from './kit-prop-hints';
import type { KitListItem, KitNode } from './plugins/list-expansion';
import type { pluginPartSchemas } from './plugins/plugin-part-schemas';
import type { WireSchemaHints } from './plugins/plugin-prop-descriptions.gen';
import type { KitChoiceValue } from './plugins/selection-value';
import type { WireEvent, WireNode } from './plugins/wire';

export type KitPart = keyof typeof pluginPartSchemas;

export type { KitListItem, KitNode } from './plugins/list-expansion';

export type { KitChoiceValue } from './plugins/selection-value';

export type { WireNode } from './plugins/wire';

// Index signatures from passthrough schemas are not props.
export type DeclaredProps<Props> = Props extends object
  ? {
      [Key in keyof Props as string extends Key ? never : Key]: Props[Key];
    }
  : Props;

export type Expansion<Part> = Part extends {
  expansion: infer Schema extends z.ZodType;
}
  ? z.output<Schema>
  : Record<never, never>;

export type KitSchemaProps = {
  [Name in KitPart]: WithPropHints<
    DeclaredProps<z.output<(typeof pluginPartSchemas)[Name]['props']>> &
      Expansion<(typeof pluginPartSchemas)[Name]>,
    Name extends keyof WireSchemaHints
      ? WireSchemaHints[Name]
      : Record<never, never>
  >;
};

export type KitEvents<Name extends KitPart> =
  (typeof pluginPartSchemas)[Name]['events'];

export type KitSlots<Name extends KitPart> =
  keyof (typeof pluginPartSchemas)[Name]['slots'];

export type KitHasChildren<Name extends KitPart> =
  (typeof pluginPartSchemas)[Name]['children'] extends false ? false : true;

// An event whose payload may take several shapes reports the one its part's own `value` holds, as Picker `multiple` reports a list.
type KitValuePayload<Payload, Props> = Props extends {
  value?: infer Value;
}
  ? [Extract<Payload, NonNullable<Value>>] extends [never]
    ? Payload
    : Extract<Payload, NonNullable<Value>>
  : Payload;

/*
 * How one side draws schema values. The App gets its own nodes, choices and items, receives handlers alone
 * (inside nested data too) and slot props as nodes. A Plugin writes JSX: a handler goes beside the value it
 * replaces, only in top-level props, and every list is readonly.
 */
export interface KitDrawing {
  node: unknown;
  choice: unknown;
  item: unknown;
  wireNode: unknown;
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
  ? () => Drawing['returns']
  : (
      payload: KitValue<Payload<Schema, Props>, Record<never, never>, Drawing>,
    ) => Drawing['returns'];

type NestedEvents<
  Events,
  Drawing extends KitDrawing,
> = Drawing['plugin'] extends true ? Record<never, never> : Events;

type KitList<
  Element,
  Events,
  Drawing extends KitDrawing,
> = Drawing['plugin'] extends true
  ? readonly KitValue<Element, Events, Drawing>[]
  : KitValue<Element, Events, Drawing>[];

type KitValue<
  Value,
  Events,
  Drawing extends KitDrawing,
> = Value extends WireNode
  ? Drawing['wireNode']
  : Value extends WireEvent
    ? Drawing['plugin'] extends true
      ? never
      : Value
    : Value extends KitListItem
      ? Drawing['item']
      : Value extends KitNode
        ? Drawing['node']
        : Value extends KitChoiceValue
          ? Drawing['choice']
          : Value extends (...args: infer Args) => infer Result
            ? (
                ...args: {
                  [Key in keyof Args]: KitValue<Args[Key], Events, Drawing>;
                }
              ) => KitValue<Result, Events, Drawing>
            : Value extends (infer Element)[]
              ? KitList<Element, Events, Drawing>
              : Value extends readonly (infer Element)[]
                ? readonly KitValue<Element, Events, Drawing>[]
                : Value extends object
                  ? KitMappedProps<
                      Value,
                      NestedEvents<Events, Drawing>,
                      never,
                      Drawing
                    >
                  : Value;

type EventProp<
  Value,
  Schema,
  Props,
  Drawing extends KitDrawing,
> = Drawing['plugin'] extends true
  ?
      | KitValue<Exclude<Value, WireEvent>, Record<never, never>, Drawing>
      | Callback<Schema, Props, Drawing>
  : Callback<Schema, Props, Drawing>;

/*
 * The one schema-to-props mapping for App kit props and Plugin JSX; Contracts owns every prop, including
 * events inside action and option data. The App keeps a prop its schema leaves unset as it is; a Plugin may
 * still pass a handler for it.
 */
export type KitMappedProps<
  Props,
  Events,
  Slots extends PropertyKey,
  Drawing extends KitDrawing,
> = {
  [Prop in keyof Props]: [
    Drawing['plugin'],
    Exclude<Props[Prop], undefined>,
  ] extends [false, never]
    ? Props[Prop]
    : Prop extends Slots
      ? Drawing['node']
      : Prop extends keyof Events
        ? EventProp<Props[Prop], Events[Prop], Props, Drawing>
        : KitValue<Props[Prop], Events, Drawing>;
};
