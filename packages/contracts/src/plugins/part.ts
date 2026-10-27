import { z } from 'zod';
import { schemaProperties } from './schema-properties';
import type {
  PartGroup,
  PartReference,
  WirePartDefinition,
} from './wire-part-definition';

// What a Screen, a row, a tile or an Inspector holds as its Actions: Actions, loose or in Sections.
export const actionSlot = ['Action', 'Action.Section'] as const;

// A part's structure, and the reference text the docs generator cannot infer from its schema.
export interface PartOptions extends Partial<Omit<PartReference, 'summary'>> {
  group: PartGroup;
  wire?: boolean;
  slots?: Record<string, readonly string[]>;
  events?: Record<string, z.ZodType>;
  children?: boolean | readonly string[];
  root?: boolean;
  container?: boolean;
  expansion?: z.ZodType;
}

type Option<Options, Key extends PropertyKey, Fallback> =
  Options extends Record<Key, infer Value> ? Value : Fallback;

type Keys<Value> = Value extends object ? keyof Value : never;

type InferredEvents<Schema extends z.ZodType> = {
  [
    Prop in Keys<z.output<Schema>> as Prop extends `on${string}` ? Prop : never
  ]: z.ZodUndefined;
};

type PartEvents<Schema extends z.ZodType, Options> = Omit<
  InferredEvents<Schema>,
  keyof Option<Options, 'events', Record<never, never>>
> &
  Option<Options, 'events', Record<never, never>>;

export type PartDefinition<
  Schema extends z.ZodType,
  Options extends PartOptions,
> = Omit<
  WirePartDefinition,
  'props' | 'slots' | 'events' | 'children' | 'group' | 'wire'
> &
  Pick<Options, Extract<keyof Options, 'expansion'>> & {
    props: Schema;
    slots: Option<Options, 'slots', Record<never, never>>;
    events: PartEvents<Schema, Options>;
    children: Option<Options, 'children', false>;
    group: Options['group'];
    wire: Option<Options, 'wire', true>;
  };

// Every `on*` prop is an event; `events` overrides a payload or adds one the props do not name.
function inferredEvents(schema: z.ZodType): Record<string, z.ZodType> {
  return Object.fromEntries(
    Object.keys(schemaProperties(schema))
      .filter((name) => name.startsWith('on'))
      .map((name) => [name, z.undefined()]),
  );
}

const hasSlots = (options: PartOptions): boolean =>
  Object.keys(options.slots ?? {}).length > 0;

// A part with children or slots is a container unless it says otherwise.
const containerOf = (options: PartOptions): boolean =>
  options.container ?? (Boolean(options.children) || hasSlots(options));

function extras(options: PartOptions): Partial<WirePartDefinition> {
  const { expansion } = options;

  return expansion ? { expansion } : {};
}

type Structure = Pick<
  WirePartDefinition,
  'group' | 'wire' | 'slots' | 'children' | 'root'
>;

function structure(options: PartOptions): Structure {
  const { group, wire, slots, children, root } = {
    wire: true,
    slots: {},
    children: false,
    root: false,
    ...options,
  };

  return { group, wire, slots, children, root };
}

function reference(summary: string, options: PartOptions): PartReference {
  const { label, appearance, accessibility, sdkProps } = options;

  return { summary, label, appearance, accessibility, sdkProps };
}

function definition(
  summary: string,
  schema: z.ZodType,
  options: PartOptions,
): WirePartDefinition {
  return {
    props: schema,
    ...extras(options),
    ...structure(options),
    container: containerOf(options),
    events: { ...inferredEvents(schema), ...options.events },
    reference: reference(summary, options),
  };
}

// The one way to declare a kit component: its summary, its props schema, and how it is built.
export function part<
  Schema extends z.ZodType,
  const Options extends PartOptions,
>(
  summary: string,
  schema: Schema,
  options: Options,
): PartDefinition<Schema, Options>;
export function part(
  summary: string,
  schema: z.ZodType,
  options: PartOptions,
): WirePartDefinition {
  return definition(summary, schema, options);
}
