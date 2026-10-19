import type { WireJson, WireNode } from '@repo/contracts/plugins/wire';
import type { Prop, Props, PluginFn, Handlers } from './wire-tree';

// A handler prop goes on the wire as a Part event the App sends back by node key and event name.
export function wireProps(
  props: Props,
  id: string,
  handlers: Handlers,
): WireNode['props'] {
  return Object.fromEntries(
    Object.entries(props).map(([name, value]) => [
      name,
      wireProp([id, name], value, handlers),
    ]),
  );
}

function wireProp(
  [id, name]: [string, string],
  value: Prop,
  handlers: Handlers,
): WireJson {
  if (typeof value !== 'function') return wireData(value);
  handlers.set(JSON.stringify([id, name]), value);

  return { $event: name };
}

function wireData(value: Prop): WireJson {
  if (typeof value === 'function')
    throw new Error('Plugin handlers go only in top-level props');

  return Array.isArray(value) ? value.map(wireData) : wireValue(value);
}

function wireValue(value: Exclude<Prop, PluginFn | Prop[]>): WireJson {
  return value !== null && typeof value === 'object'
    ? Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, wireData(item)]),
      )
    : value;
}
