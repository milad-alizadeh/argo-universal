import { WireJson } from '#plugin-wire-json';
import type { PluginQuery } from './argo-calls';

// The kit's subscription identity and the Engine's hash use this same normal form.
export function serialisePluginQuery(query: PluginQuery): string {
  return canonicalWireJson(WireJson.parse(normalHeaders(query)));
}

// The one normal form: sorted keys, so a structured value has a single string to compare and key by.
export function canonicalWireJson(value: WireJson): string {
  return JSON.stringify(canonical(value));
}

// Each Query api says how it reaches its normal form, so a new member has to answer here.
function normalHeaders(query: PluginQuery): PluginQuery {
  if (query.api === 'fetch') return lowercaseHeaders(query);

  return alreadyNormal(query);
}

// The Query apis that are their own normal form: a new api is named here or normalised above, never neither.
function alreadyNormal(
  query: Extract<PluginQuery, { api: 'process' | 'storage' }>,
): PluginQuery {
  return query;
}

function lowercaseHeaders(
  query: Extract<PluginQuery, { api: 'fetch' }>,
): PluginQuery {
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
