// What `JSON.parse` may answer, so a reader narrows a reply instead of asserting its shape.
export type Json = string | number | boolean | null | Json[] | JsonObject;

export type JsonObject = { [key: string]: Json };

export const parseJson = (text: string): Json => JSON.parse(text);

export const isObject = (value: Json | undefined): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const pick = (value: Json | undefined, key: string): Json | undefined =>
  isObject(value) ? value[key] : undefined;

export const item = (
  value: Json | undefined,
  index: number,
): Json | undefined => (Array.isArray(value) ? value[index] : undefined);

export const nonEmpty = (value: Json | undefined): string | null =>
  typeof value === 'string' && value !== '' ? value : null;
