import type { WireJson, WireNode } from '@repo/contracts/plugins/wire';
import type { Prop, Props, Handlers } from './wire-tree';

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
  if (typeof value !== 'function') return copied(value);
  handlers.set(JSON.stringify([id, name]), value);

  return { $event: name };
}

// Data is copied, so a Plugin that mutates it in place still produces a patch.
function copied(value: WireJson): WireJson {
  if (Array.isArray(value)) return value.map(copied);

  return typeof value === 'object' ? copiedObject(value) : value;
}

const copiedObject = (value: { [key: string]: WireJson } | null): WireJson =>
  value &&
  Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, copied(item)]),
  );
