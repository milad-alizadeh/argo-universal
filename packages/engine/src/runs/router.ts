import {
  RunOutput,
  RunOutputCursor,
  RunStatusResult,
  shellId,
} from '@repo/contracts';
import { z } from 'zod';
import {
  authenticatedAppProcedure,
  router,
  routerFactory,
  zAsyncIterable,
} from '../rpc';
import type { Runs } from './runs';

type RunTransport = { runs: Runs };

const sessionInput = z.strictObject({ sessionId: z.string().min(1) });

const cursor = RunOutputCursor.optional();

const outputInput = z.union([
  sessionInput.extend({ name: z.string().min(1), cursor }),
  sessionInput.extend({ shellId, cursor }),
]);

const streamSignal = (
  connection: AbortSignal,
  signal?: AbortSignal,
): AbortSignal => (signal ? AbortSignal.any([connection, signal]) : connection);

export const createRunRouter = routerFactory((deps: RunTransport) =>
  router({
    output: authenticatedAppProcedure
      .input(outputInput)
      .output(zAsyncIterable({ yield: RunOutput }))
      .subscription(({ ctx, input, signal }) => {
        const checkout = deps.runs.sessions.checkout(input.sessionId);
        const abort = streamSignal(ctx.connection.signal, signal);

        return deps.runs.terminals.watchOutput(checkout, input, abort);
      }),
    watchStatus: authenticatedAppProcedure
      .input(sessionInput)
      .output(zAsyncIterable({ yield: RunStatusResult }))
      .subscription(({ ctx, input, signal }) =>
        deps.runs.view.watchStatus(
          deps.runs.sessions.checkout(input.sessionId),
          streamSignal(ctx.connection.signal, signal),
        ),
      ),
  }),
);
