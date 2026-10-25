import type { z } from 'zod';
import type { PartGroup, WirePartDefinition } from './wire-part-definition';
import type { WirePartReference } from './wire-part-reference';

export interface PartOptions {
  group: PartGroup;
  wire?: boolean;
  wireProps?: z.ZodType;
  slots?: Record<string, readonly string[]>;
  events?: Record<string, z.ZodType>;
  children?: boolean | readonly string[];
  root?: boolean;
  container?: boolean;
  label?: string;
  appearance?: string;
  accessibility?: Partial<WirePartReference['accessibility']>;
}

export type ResolvedPartOptions = Required<
  Omit<PartOptions, 'container' | 'wireProps'>
> & {
  container: boolean;
  wireProps?: z.ZodType;
};

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

type Draft<Options> = Options extends { wireProps: infer Props }
  ? { wireProps: Props }
  : unknown;

export type PartDefinition<
  Schema extends z.ZodType,
  Options extends PartOptions,
> = Omit<
  WirePartDefinition,
  'props' | 'wireProps' | 'slots' | 'events' | 'children' | 'group' | 'wire'
> &
  Draft<Options> & {
    props: Schema;
    slots: Option<Options, 'slots', Record<never, never>>;
    events: PartEvents<Schema, Options>;
    children: Option<Options, 'children', false>;
    group: Options['group'];
    wire: Option<Options, 'wire', true>;
  };
