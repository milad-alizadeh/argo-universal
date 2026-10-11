import { type AnyTRPCRouter, initTRPC } from '@trpc/server';
import { z } from 'zod';

// Routers close over their own dependencies, so a call carries no context.
const t = initTRPC.create();

export const router = t.router;
export const mergeRouters = t.mergeRouters;
export const publicProcedure = t.procedure;

// A module's router, built from the dependencies it names; its type is the build's.
export const routerFactory = <Deps, Built extends AnyTRPCRouter>(
  buildRouter: (deps: Deps) => Built,
): ((deps: Deps) => Built) => buildRouter;

const isAsyncIterable = (value: unknown): value is AsyncIterable<unknown> =>
  value != null && typeof value === 'object' && Symbol.asyncIterator in value;

type ParsedValues<Yield> = AsyncGenerator<
  Awaited<Yield>,
  void,
  Parameters<z.ZodType['parse']>[0]
>;

// `.output()` checks a subscription's whole return value, so this checks each yielded value (tRPC subscriptions docs).
export function zAsyncIterable<TYieldIn, TYieldOut>(options: {
  yield: z.ZodType<TYieldOut, TYieldIn>;
}): z.ZodPipe<
  z.ZodCustom<AsyncIterable<TYieldIn>>,
  z.ZodTransform<ParsedValues<TYieldOut>, AsyncIterable<TYieldIn>>
> {
  return z
    .custom<AsyncIterable<TYieldIn>>(
      (value): value is AsyncIterable<Parameters<typeof isAsyncIterable>[0]> =>
        isAsyncIterable(value),
    )
    .transform(async function* (iterable): ParsedValues<TYieldOut> {
      for await (const value of iterable) yield options.yield.parseAsync(value);
    });
}
