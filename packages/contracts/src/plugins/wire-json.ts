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
