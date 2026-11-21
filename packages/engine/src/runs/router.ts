import { RunStatusResult } from '@repo/contracts';
import { z } from 'zod';
import {
  authenticatedAppProcedure,
  router,
  routerFactory,
  zAsyncIterable,
} from '../rpc';
import type { SessionSources } from '../sessions';
import type { RunCheckout, Runs } from './runs';

type RunTransport = Pick<SessionSources, 'readSession'> & { runs: Runs };

const sessionInput = z.strictObject({ sessionId: z.string().min(1) });

const checkoutFor = (
  { readSession }: RunTransport,
  sessionId: string,
): RunCheckout => {
  const { projectId, checkout } = readSession(sessionId);

  return { projectId, checkoutPath: checkout.path };
};

const streamSignal = (
  connection: AbortSignal,
  signal?: AbortSignal,
): AbortSignal => (signal ? AbortSignal.any([connection, signal]) : connection);

export const createRunRouter = routerFactory((deps: RunTransport) =>
  router({
    watchStatus: authenticatedAppProcedure
      .input(sessionInput)
      .output(zAsyncIterable({ yield: RunStatusResult }))
      .subscription(({ ctx, input, signal }) =>
        deps.runs.watchStatus(
          checkoutFor(deps, input.sessionId),
          streamSignal(ctx.connection.signal, signal),
        ),
      ),
  }),
);
