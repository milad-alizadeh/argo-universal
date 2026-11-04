import { z } from 'zod';

// Plugin pages cross the wire as data (ADR-0025): kit component names and props, never code.
export type WireJson =
  | string
  | number
  | boolean
  | null
  | WireJson[]
  | { [key: string]: WireJson };

export const WireJson: z.ZodType<WireJson> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(WireJson),
    z.record(z.string(), WireJson),
  ]),
);

const wireJson = z.json();

// A value as JSON would carry it, checked: what a Plugin's code gave, kept only as data crosses the wire.
export const wireJsonOf = (value: unknown): WireJson =>
  wireJson.parse(JSON.parse(JSON.stringify(value ?? null)));

/*
 * A value that crosses the worker boundary as JSON and comes back as the same type: `Value extends
 * CrossesAsJson<Value>` holds when no part of it is a function, a `bigint` or a `symbol`, so it accepts
 * interfaces and optional fields but refuses a `Date`, a `Map` or a function, whose methods are functions.
 * A plain JSON union cannot say this: an interface has no index signature, so it would refuse every interface.
 */
export type CrossesAsJson<Value> = {
  [Key in keyof Value]: JsonPart<Value[Key]>;
};

type JsonPart<Value> = Value extends
  | bigint
  | symbol
  | ((...args: never[]) => void)
  ? never
  : CrossesAsJson<Value>;
