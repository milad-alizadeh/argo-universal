import type { runOperations } from '@repo/contracts/operations';
import type { Database } from '@repo/db';
import { session } from '@repo/db/schema';
import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import {
  draftRunConfigurations,
  type RunCheckout,
  type RunRequest,
  type RunStarter,
  type Runs,
} from '../runs';
import { namedParam } from '../sessions';
import type { OperationImplementations } from './operations';

type RunImplementations = Pick<
  OperationImplementations,
  keyof typeof runOperations
>;

// A Session that runs a `run.*` Operation and names no Session uses its own; its Checkout decides which Runs it means.
const sessionOf = (
  database: Database,
  sessionId: string | undefined,
): RunCheckout & RunStarter => {
  const row = database
    .select({
      id: session.id,
      title: session.title,
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

export const runCheckoutOf = (
  database: Database,
  sessionId: string | undefined,
): RunCheckout => {
  const { projectId, checkoutPath } = sessionOf(database, sessionId);

  return { projectId, checkoutPath };
};

const runRequestOf = (
  database: Database,
  sessionId: string | undefined,
): RunRequest => {
  const { id, title, ...checkout } = sessionOf(database, sessionId);

  return { ...checkout, starter: { id, title } };
};

type RunOperationSources = {
  database: Database;
  runs: Runs;
};

type RunStarts = Pick<
  RunImplementations,
  'run.start' | 'run.restart' | 'run.startGroup'
>;

// The App runner sets manual at the authenticated caller boundary, never from input.
export function createRunStarts(
  { database, runs }: RunOperationSources,
  manual = false,
): RunStarts {
  const target = (sessionId: string | undefined): RunRequest => ({
    ...runRequestOf(database, sessionId),
    manual,
  });

  return {
    'run.start': async ({ sessionId, name, timeoutMs }) =>
      runs.start(target(sessionId), name, timeoutMs),
    'run.restart': async ({ sessionId, name, timeoutMs }) =>
      runs.restart(target(sessionId), name, timeoutMs),
    'run.startGroup': async ({ sessionId, name, timeoutMs }) =>
      runs.groups.start(target(sessionId), name, timeoutMs),
  };
}

export function createRunOperations(
  deps: RunOperationSources,
): RunImplementations {
  const { database, runs } = deps;

  return {
    ...createRunStarts(deps),
    'run.stop': async ({ sessionId, name }) =>
      runs.stop(runCheckoutOf(database, sessionId), name),
    'run.stopGroup': async ({ sessionId, name }) =>
      runs.groups.stop(runCheckoutOf(database, sessionId), name),
    'run.getSettings': ({ sessionId, name }) =>
      runs.settings.read(runCheckoutOf(database, sessionId), name),
    'run.updateSettings': (input) =>
      runs.settings.update(runCheckoutOf(database, input.sessionId), input),
    'run.status': async ({ sessionId }) =>
      runs.view.status(runCheckoutOf(database, sessionId)),
    'run.draft': async ({ sessionId, overwrite }) => {
      const drafted = await draftRunConfigurations(
        runCheckoutOf(database, sessionId).checkoutPath,
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
      runs.view.logs(runCheckoutOf(database, sessionId), name, tail),
  };
}
