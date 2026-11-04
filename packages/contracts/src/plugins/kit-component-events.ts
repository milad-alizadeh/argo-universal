import { z } from 'zod';
import { componentEventRules } from '#plugin-wire-events';
import { WireJson } from '#plugin-wire-json';

export const WireProps = z.record(z.string(), WireJson);

export type WireProps = z.infer<typeof WireProps>;

/*
 * The props a Component event's schema `within` names: that prop object of the node, or the node's own props when it names none.
 * Returned by reference, never copied: a field tells the Server's answer from a redraw by the echoed value's identity.
 */
export function propsWithin(
  props: WireProps,
  within: string | undefined,
): WireProps {
  if (within === undefined) return props;
  const holder = props[within];

  return isWireProps(holder) ? holder : {};
}

const isWireProps = (value: WireJson | undefined): value is WireProps =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// A Component event's handler on the node: at the event's name, inside the props its schema's `within` names.
export function componentEventHandler(
  props: WireProps,
  name: string,
  schema: z.ZodType | undefined,
): WireJson | undefined {
  return propsWithin(props, componentEventRules(schema).within)[name];
}
