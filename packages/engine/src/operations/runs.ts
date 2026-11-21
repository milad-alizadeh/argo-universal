import type { runOperations } from '@repo/contracts/operations';
import type { Database } from '@repo/db';
import { session } from '@repo/db/schema';
import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { draftRunConfigurations, type RunCheckout, type Runs } from '../runs';
import { namedParam } from '../sessions';
import type { OperationImplementations } from './operations';

type RunImplementations = Pick<
  OperationImplementations,
  keyof typeof runOperations
>;

// A Session that runs a `run.*` Operation and names no Session uses its own; its Checkout decides which Runs it means.
const checkoutOf = (
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
      runs.start(checkoutOf(database, sessionId), name, timeoutMs),
    'run.stop': async ({ sessionId, name }) =>
      runs.stop(checkoutOf(database, sessionId), name),
    'run.restart': async ({ sessionId, name, timeoutMs }) =>
      runs.restart(checkoutOf(database, sessionId), name, timeoutMs),
    'run.status': async ({ sessionId }) =>
      runs.status(checkoutOf(database, sessionId)),
    'run.draft': async ({ sessionId, overwrite }) => {
      const drafted = await draftRunConfigurations(
        checkoutOf(database, sessionId).checkoutPath,
        overwrite ?? false,
      );

      return {
        path: drafted.path,
        configurations: drafted.configurations.map(
          ({ name, command, port }) => ({
            name,
            command,
            port: port ?? null,
            source: drafted.sources[name] ?? '',
          }),
        ),
        skipped: drafted.skipped,
      };
    },
    'run.logs': async ({ sessionId, name, tail }) =>
      runs.logs(checkoutOf(database, sessionId), name, tail),
  };
}
