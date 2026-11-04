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

/*
 * A value that crosses the worker boundary as JSON and comes back as the same type: `Value extends
 * CrossesAsJson<Value>` holds when every part of it is JSON, so it accepts interfaces and optional fields but refuses a
 * `Date`, a `Map` or a function, which would come back as something else. It is a mapped type at its top, so a type
 * parameter can be bounded by it; a primitive maps to itself.
 */
export type CrossesAsJson<Value> = {
  [Key in keyof Value]: JsonPart<Value[Key]>;
};

type JsonPart<Value> = unknown extends Value
  ? Value
  : Value extends string | number | boolean | null | undefined
    ? Value
    : Value extends bigint | symbol | ((...args: never[]) => void)
      ? never
      : CrossesAsJson<Value>;
