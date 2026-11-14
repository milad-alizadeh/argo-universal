// What `JSON.parse` may answer, so a reader narrows GitHub's reply instead of asserting its shape.
export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };

export const isObject = (
  value: Json | undefined,
): value is { [key: string]: Json } =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const child = (value: Json | undefined, key: string): Json | undefined =>
  isObject(value) ? value[key] : undefined;

export const valueAt = (
  value: Json,
  path: readonly string[],
): Json | undefined => path.reduce<Json | undefined>(child, value);

/*
 * The reads below reject what GitHub left out or sent as another kind, with the message of the reply being read: a
 * reply is outside data, so it is refused, never guessed at (CODING_STANDARDS.md "Adapters").
 */
export function text(value: Json, invalid: string, ...path: string[]): string {
  const found = valueAt(value, path);

  if (typeof found === 'string' && found !== '') return found;

  throw new Error(invalid);
}

const isCount = (found: Json | undefined): found is number =>
  typeof found === 'number' && Number.isSafeInteger(found) && found >= 0;

export function count(value: Json, invalid: string, key: string): number {
  const found = valueAt(value, [key]);

  if (isCount(found)) return found;

  throw new Error(invalid);
}
