// What `JSON.parse` may answer, so a reader narrows Hue's reply instead of asserting its shape.
export type Json = string | number | boolean | null | Json[] | JsonObject;

export type JsonObject = { [key: string]: Json };

// A body that is not JSON reads as nothing, so a reader answers its own "unexpected reply".
export function parseJson(body: string): Json | undefined {
  try {
    const parsed: Json = JSON.parse(body);

    return parsed;
  } catch {
    return undefined;
  }
}

const isObject = (value: Json | undefined): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const step = (inner: Json | undefined, key: string): Json | undefined =>
  isObject(inner) ? inner[key] : undefined;

// The value at a path of keys, or undefined where any step is not an object holding it.
export const at = (
  value: Json | undefined,
  ...keys: string[]
): Json | undefined => keys.reduce(step, value);

export const text = (value: Json | undefined): string | null =>
  typeof value === 'string' && value !== '' ? value : null;

export const list = (value: Json | undefined): Json[] =>
  Array.isArray(value) ? value : [];

export const present = <Value>(value: Value | null): value is Value =>
  value !== null;

export type JsonRequest = Readonly<{
  method: 'PUT' | 'POST';
  headers: Record<string, string>;
  body: string;
}>;

// A request that sends a JSON body, beside any headers of its own.
export const jsonRequest = (
  method: JsonRequest['method'],
  value: Json,
  headers: Record<string, string> = {},
): JsonRequest => ({
  method,
  headers: { ...headers, 'Content-Type': 'application/json' },
  body: JSON.stringify(value),
});
