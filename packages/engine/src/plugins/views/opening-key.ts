import { canonicalWireJson } from '@repo/contracts/plugins/query-normalisation';
import { WireJson } from '@repo/contracts/plugins/wire';
import type { OpenView } from './open-view';

// The Open event's own fields, which say nothing about what the App asked for.
const notAsked = new Set(['type', 'viewId']);

// A view's Opening never changes, since a reload only mints it a viewId, so each view is keyed once.
const keys = new WeakMap<OpenView, string>();

/*
 * What the App asked a Plugin to draw, as one string: the Opening without the viewId a reload rotates.
 * A Plugin reload keeps the key, and the same Opening on two connections shares it.
 */
export function openingKey(view: OpenView): string {
  const known = keys.get(view);

  if (known !== undefined) return known;

  const key = canonicalWireJson([view.pluginId, asked(view.opening)]);
  keys.set(view, key);

  return key;
}

function asked(opening: OpenView['opening']): WireJson {
  const fields = Object.entries(opening).filter(
    ([field]) => !notAsked.has(field),
  );

  // A round trip through JSON drops the fields an Opening leaves out, which the wire schema would reject outright.
  return WireJson.parse(JSON.parse(JSON.stringify(Object.fromEntries(fields))));
}
