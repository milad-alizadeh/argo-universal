import { WireJson } from '#plugin-wire-json';
import type { PluginQuery } from './argo-calls';

// The kit's subscription identity and the Engine's hash use this same normal form.
export function serialisePluginQuery(query: PluginQuery): string {
  return canonicalWireJson(WireJson.parse(stated(normalHeaders(query))));
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
  const headers = Object.entries(query.headers).map(lowercaseName);

  refuseRepeatedNames(headers.map(([name]) => name));

  return { ...query, headers: Object.fromEntries(headers) };
}

const lowercaseName = ([name, value]: [string, string]): [string, string] => [
  name.toLowerCase(),
  value,
];

/*
 * HTTP header names are case-insensitive, so a Query naming one twice sets it to two values and says
 * neither. Keeping the last would send a header the Plugin did not ask for under the other's key, and
 * joining them the way a list-valued field allows would forge a value for the fields that are not lists.
 */
function refuseRepeatedNames(names: string[]): void {
  const repeated = names.find((name, at) => names.indexOf(name) !== at);

  if (repeated)
    throw new Error(`A Query names the ${repeated} header more than once`);
}

/*
 * A Query as a Plugin writes it: Plugin code compiles with `exactOptionalPropertyTypes` off, so an
 * optional field it decided against is present and undefined rather than absent.
 */
type AsWritten =
  | WireJson
  | undefined
  | AsWritten[]
  | { [key: string]: AsWritten };

/*
 * An optional field left undefined is that field being absent: the same Query, so the same key. An
 * array member stays as it is, where dropping one would move every member after it.
 */
function stated(value: AsWritten): AsWritten {
  if (Array.isArray(value)) return value.map(stated);

  return fields(value) ? setFields(value) : value;
}

const fields = (value: AsWritten): value is Record<string, AsWritten> =>
  value !== null && typeof value === 'object';

function setFields(
  value: Record<string, AsWritten>,
): Record<string, AsWritten> {
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => [key, stated(item)]),
  );
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
