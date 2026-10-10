import { initTRPC } from '@trpc/server';
import { z } from 'zod';

// Routers close over their own dependencies, so a call carries no context.
const t = initTRPC.create();

const router = t.router;
export const mergeRouters = t.mergeRouters;
export const publicProcedure = t.procedure;

type Procedures = Parameters<typeof router>[0];

// A module's router, built from the dependencies it names.
export const routerFactory =
  <Deps, Built extends Procedures>(
    buildProcedures: (deps: Deps) => Built,
  ): ((deps: Deps) => ReturnType<typeof router<Built>>) =>
  (deps) =>
    router(buildProcedures(deps));

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
