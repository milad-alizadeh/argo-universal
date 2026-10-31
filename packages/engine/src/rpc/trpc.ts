import { SessionOpenFailure } from '@repo/contracts';
import { type AnyTRPCRouter, initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';
import type { RpcContext } from './connection';

// Routers close over domain dependencies; context identifies the actual Connection.
const t = initTRPC.context<RpcContext>().create({
  errorFormatter: (failure) => ({
    ...failure['shape'],
    data: {
      ...failure['shape'].data,
      openError:
        failure.error.cause instanceof SessionOpenFailure
          ? failure.error.cause.openError
          : undefined,
    },
  }),
});

export const router = t.router;

export const mergeRouters = t.mergeRouters;

/*
 * Every procedure of every router, behind the one question the handshake answers: which Device is this (ADR-0045)?
 * "Public" means any Device this Server trusts, the Server Device included, as against `serverDeviceProcedure` below, which narrows it to the Server Device alone. A Connection that proved nothing reaches none of them, whichever router it asks for.
 */
export const publicProcedure = t.procedure.use(async ({ ctx, next }) => {
  const identity = ctx.connection?.identity;

  if (!identity)
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'This Connection has not proved which Device it is',
    });

  return next({ ctx: { identity } });
});

/*
 * The actions that are the Server Device's alone (ADR-0022, ADR-0045): pairing a Device, unpairing another one, the Local network access switch, keeping the Server running after the desktop app quits, and the Devices list, which a Paired Device never sees.
 * The Server decides this itself, from the identity the handshake proved rather than from the address a Connection came from, because hiding a row in the App is not the check. The refusal is a `FORBIDDEN` the App draws, the same shape as every other refusal it renders.
 */
export const serverDeviceProcedure = publicProcedure.use(
  async ({ ctx, next }) => {
    if (!ctx.identity.serverDevice)
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only the Server Device may do this',
      });

    return next({ ctx: { identity: ctx.identity } });
  },
);

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
