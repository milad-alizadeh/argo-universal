import { WireJson } from '#plugin-wire-json';
import type { PluginQuery } from './argo-calls';

// The kit's subscription identity and the Engine's hash use this same normal form.
export function serialisePluginQuery(query: PluginQuery): string {
  return JSON.stringify(canonical(WireJson.parse(normalHeaders(query))));
}

function normalHeaders(query: PluginQuery): PluginQuery {
  if (query.api !== 'fetch') return query;

  if (!query.headers) return query;

  return {
    ...query,
    headers: Object.fromEntries(
      Object.entries(query.headers).map(([name, value]) => [
        name.toLowerCase(),
        value,
      ]),
    ),
  };
}

function canonical(value: WireJson): WireJson {
  if (value === null) return value;

  return typeof value === 'object' ? collection(value) : value;
}

function collection(value: WireJson[] | Record<string, WireJson>): WireJson {
  if (Array.isArray(value)) return value.map(canonical);

  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, canonical(item)]),
  );
}
