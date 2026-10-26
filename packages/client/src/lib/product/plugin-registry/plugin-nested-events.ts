import { partEventRules, WireProps } from '@repo/contracts/plugins/wire';
import type { z } from 'zod';
import type { ControlInput, PluginProps } from './plugin-rendering';

function nested(
  props: PluginProps,
  [name, schema]: [string, z.ZodType],
): PluginProps {
  const { within } = partEventRules(schema);
  const callback = props[name];

  if (within === undefined || typeof callback !== 'function') return props;

  return placedCallback(props, within, { name, callback });
}

// A callback of an event the part keeps inside a prop object goes back there, as the kit component takes it.
export const withNestedEvents = (
  input: ControlInput,
  props: PluginProps,
): PluginProps =>
  Object.entries(input.part.events).reduce(
    (placed, entry) => nested(placed, entry),
    props,
  );

function placedCallback(
  props: PluginProps,
  within: string,
  event: { name: string; callback: PluginProps[string] },
): PluginProps {
  const rest = Object.fromEntries(
    Object.entries(props).filter(([key]) => key !== event.name),
  );

  const holder = WireProps.safeParse(props[within]).data;

  return { ...rest, [within]: { ...holder, [event.name]: event.callback } };
}
