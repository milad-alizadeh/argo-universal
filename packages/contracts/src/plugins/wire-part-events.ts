import { z } from 'zod';
import { partEventRules } from '#plugin-wire-events';
import { WireJson } from '#plugin-wire-json';

export const WireProps = z.record(z.string(), WireJson);

export type WireProps = z.infer<typeof WireProps>;

// The props a Part event's schema `within` names: that prop object of the node, or the node's own props when it names none.
export function propsWithin(
  props: WireProps,
  within: string | undefined,
): WireProps {
  if (within === undefined) return props;

  return WireProps.safeParse(props[within]).data ?? {};
}

// A Part event's handler on the node: at the event's name, inside the props its schema's `within` names.
export function partEventHandler(
  props: WireProps,
  name: string,
  schema: z.ZodType | undefined,
): WireJson | undefined {
  return propsWithin(props, partEventRules(schema).within)[name];
}

// Moves a handler from the node's top level, where the Plugin runtime keeps it, into the prop object `within` names.
export function placedPartEvent(
  props: WireProps,
  name: string,
  schema: z.ZodType | undefined,
): WireProps {
  const { within } = partEventRules(schema);
  const handler = props[name];

  if (within === undefined || handler === undefined) return props;
  const rest = without(props, name);

  return {
    ...rest,
    [within]: { ...propsWithin(rest, within), [name]: handler },
  };
}

const without = (props: WireProps, name: string): WireProps =>
  Object.fromEntries(Object.entries(props).filter(([key]) => key !== name));
