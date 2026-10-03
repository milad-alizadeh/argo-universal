import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import type { Services } from './services';

export interface Context {
  services: Services;
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;

const isAsyncIterable = (value: unknown): value is AsyncIterable<unknown> =>
  value != null && typeof value === 'object' && Symbol.asyncIterator in value;

// `.output()` checks a subscription's whole return value, so this checks each yielded value (tRPC subscriptions docs).
export function zAsyncIterable<TYieldIn, TYieldOut>(options: {
  yield: z.ZodType<TYieldOut, TYieldIn>;
}) {
  return z
    .custom<AsyncIterable<TYieldIn>>((value) => isAsyncIterable(value))
    .transform(async function* (iterable) {
      for await (const value of iterable) yield options.yield.parseAsync(value);
    }) as unknown as z.ZodType<
    AsyncIterable<TYieldOut, void, unknown>,
    AsyncIterable<TYieldIn, void, unknown>
  >;
}
