import { z } from 'zod';
import { partEventRules } from '#plugin-wire-events';
import { WireJson } from '#plugin-wire-json';

export const WireProps = z.record(z.string(), WireJson);

export type WireProps = z.infer<typeof WireProps>;

const propsOf = (value: WireJson | undefined): WireProps =>
  WireProps.safeParse(value).data ?? {};

// A Part event's handler on the node: at the event's name, or inside the prop object its schema's `within` names.
export function partEventHandler(
  props: WireProps,
  name: string,
  schema: z.ZodType | undefined,
): WireJson | undefined {
  const { within } = partEventRules(schema);

  return within === undefined ? props[name] : propsOf(props[within])[name];
}

function moved(
  props: WireProps,
  within: string,
  [name, handler]: [string, WireJson],
): WireProps {
  const rest = Object.fromEntries(
    Object.entries(props).filter(([key]) => key !== name),
  );

  return { ...rest, [within]: { ...propsOf(rest[within]), [name]: handler } };
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

  return moved(props, within, [name, handler]);
}
