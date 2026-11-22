import type { runOperations } from '@repo/contracts/operations';
import type { Database } from '@repo/db';
import { readProjectPath } from '../projects';
import {
  draftRunConfigurations,
  runGuide,
  type RunCheckout,
  type RunRequest,
  type Runs,
} from '../runs';
import type { OperationImplementations } from './operations';

type RunImplementations = Pick<
  OperationImplementations,
  keyof typeof runOperations
>;

const projectCheckoutOf = (
  database: Database,
  projectId: string,
): RunCheckout => ({
  projectId,
  checkoutPath: readProjectPath(database, projectId),
});

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
  { runs }: Pick<RunOperationSources, 'runs'>,
  manual = false,
): RunStarts {
  const target = (sessionId: string | undefined): RunRequest => ({
    ...runs.sessions.forStart(sessionId),
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
      runs.stop(runs.sessions.checkout(sessionId), name),
    'run.stopGroup': async ({ sessionId, name }) =>
      runs.groups.stop(runs.sessions.checkout(sessionId), name),
    'run.getSettings': ({ sessionId, name }) =>
      runs.settings.read(runs.sessions.checkout(sessionId), name),
    'run.listSettings': ({ projectId }) =>
      runs.settings.list(projectCheckoutOf(database, projectId)),
    'run.updateSettings': ({ projectId, sessionId, ...input }) =>
      runs.settings.update(
        projectId === undefined
          ? runs.sessions.checkout(sessionId)
          : projectCheckoutOf(database, projectId),
        input,
      ),
    'run.status': async ({ sessionId }) =>
      runs.view.status(runs.sessions.checkout(sessionId)),
    'run.guide': async () => runGuide(),
    'run.draft': async ({ sessionId, overwrite }) => {
      const drafted = await draftRunConfigurations(
        runs.sessions.checkout(sessionId).checkoutPath,
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
      runs.view.logs(runs.sessions.checkout(sessionId), name, tail),
  };
}
