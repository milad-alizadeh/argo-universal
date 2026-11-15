// What `JSON.parse` may answer, so a reader narrows Jira's reply instead of asserting its shape.
export type Json = string | number | boolean | null | Json[] | JsonObject;

export type JsonObject = { [key: string]: Json };

// A body that is not JSON reads as nothing, so a reader answers its own "unexpected reply".
export function parseJson(text: string): Json | undefined {
  try {
    const parsed: Json = JSON.parse(text);

    return parsed;
  } catch {
    return undefined;
  }
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// The value at a path of keys, or undefined where any step is not an object holding it.
export const at = (value: unknown, ...keys: string[]): unknown =>
  keys.reduce<unknown>(
    (inner, key) => (isObject(inner) ? inner[key] : undefined),
    value,
  );

export const text = (value: unknown): string | null =>
  typeof value === 'string' && value !== '' ? value : null;

export const list = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];
