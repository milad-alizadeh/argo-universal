import { z } from 'zod';
import { Action, WireEvent } from './wire';

export const stringLabel = z
  .string()
  .describe('The visible and accessible label.');

export const optionalLabel = stringLabel.optional();

type EventHandler<Name extends string> = z.ZodUnion<
  readonly [
    z.ZodObject<{ $event: z.ZodLiteral<Name> }, z.core.$strict>,
    typeof Action,
  ]
>;

export function handler<const Name extends string>(
  name: Name,
): EventHandler<Name> {
  return z
    .union([WireEvent.extend({ $event: z.literal(name) }), Action])
    .describe(`Action or Plugin event invoked by ${name}.`);
}

export const onPress = handler('onPress');

// Events go only on a kit component's top-level props, so a press inside prop data runs a Built-in Action.
export const builtInPress = Action.describe('Built-in Action run on press.');

// The App echoes the payload into `prop` at once, so the payload schema is that prop's schema.
export function echoes<
  Prop extends string,
  Fields extends Record<string, z.ZodType> & Record<Prop, z.ZodType>,
>(
  props: z.ZodObject<Fields>,
  prop: Prop,
  rules: { blocks?: boolean; throttleMs?: number } = {},
): z.ZodNonOptional<Fields[Prop]> {
  return props.shape[prop].nonoptional().meta({ value: prop, ...rules });
}
