import { z } from 'zod';
import { Action, WireEvent } from './wire';

export const stringLabel = z
  .string()
  .describe('The visible and accessible label.');

export const optionalLabel = stringLabel.optional();

export const tone = z
  .enum(['neutral', 'accent', 'success', 'warning', 'danger'])
  .optional()
  .describe('Argo semantic tone.');

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

export const imageSource = z
  .union([z.string().url(), z.object({ asset: z.string() })])
  .describe('A remote URL or Plugin asset served through the Server.');
