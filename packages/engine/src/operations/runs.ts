import type { runOperations } from '@repo/contracts/operations';
import type { Database } from '@repo/db';
import { session } from '@repo/db/schema';
import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import type { RunCheckout, Runs } from '../runs';
import { namedParam } from '../sessions';
import type { OperationImplementations } from './operations';

type RunImplementations = Pick<
  OperationImplementations,
  keyof typeof runOperations
>;

// A Session that runs a `run.*` Operation and names no Session uses its own; its Checkout decides which Runs it means.
export const runCheckoutOf = (
  database: Database,
  sessionId: string | undefined,
): RunCheckout => {
  const row = database
    .select({
      projectId: session.projectId,
      checkoutPath: session.checkoutPath,
    })
    .from(session)
    .where(
      eq(
        session.id,
        namedParam(
          sessionId,
          'Pass sessionId: the Session whose Checkout runs it. A Session that runs this uses its own.',
        ),
      ),
    )
    .get();

  if (!row)
    throw new TRPCError({ code: 'NOT_FOUND', message: 'No such Session' });

  return row;
};

export function createRunOperations(deps: {
  database: Database;
  runs: Runs;
}): RunImplementations {
  const { database, runs } = deps;

  return {
    'run.start': async ({ sessionId, name, timeoutMs }) =>
      runs.start(runCheckoutOf(database, sessionId), name, timeoutMs),
    'run.stop': async ({ sessionId, name }) =>
      runs.stop(runCheckoutOf(database, sessionId), name),
    'run.restart': async ({ sessionId, name, timeoutMs }) =>
      runs.restart(runCheckoutOf(database, sessionId), name, timeoutMs),
    'run.status': async ({ sessionId }) =>
      runs.status(runCheckoutOf(database, sessionId)),
    'run.logs': async ({ sessionId, name, tail }) =>
      runs.logs(runCheckoutOf(database, sessionId), name, tail),
  };
}
