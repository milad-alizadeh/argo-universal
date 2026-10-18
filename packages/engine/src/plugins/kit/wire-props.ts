import type { WireJson, WireNode } from '@repo/contracts/plugins/wire';
import type { Prop, Props, PluginFn, Handlers } from './wire-tree';

function wireProp(path: string[], value: Prop, handlers: Handlers): WireJson {
  if (typeof value !== 'function') return wirePropData(path, value, handlers);
  handlers.set(JSON.stringify(path), value);

  return eventMarker(path);
}

function wirePropData(
  path: string[],
  value: Exclude<Prop, PluginFn>,
  handlers: Handlers,
): WireJson {
  if (Array.isArray(value))
    return value.map((item, index) =>
      wireProp([...path, String(index)], item, handlers),
    );

  if (value === null) return null;

  return wirePropScalar(path, value, handlers);
}

function wirePropScalar(
  path: string[],
  value: Exclude<Prop, PluginFn | null | Prop[] | WireJson[]>,
  handlers: Handlers,
): WireJson {
  return typeof value === 'object'
    ? wirePropObject(path, value, handlers)
    : value;
}

function wirePropObject(
  path: string[],
  value: Record<string, Prop>,
  handlers: Handlers,
): Record<string, WireJson> {
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      wireProp([...path, key], item, handlers),
    ]),
  );
}

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

function eventMarker(path: string[]): WireJson {
  const $event = path.at(-1) ?? '';

  return path.length > 2 ? { $event, $path: path.slice(1) } : { $event };
}
