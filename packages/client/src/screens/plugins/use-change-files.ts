import { remoteChanges } from '#features/changes';
import { type ChangeFilesSource, remoteOf } from './change-files';
import type { OperationRunner } from './page-calls-ports';
import type { ChangesContext } from './use-session-pull-requests';
import { useOperationRunner } from './use-tree-calls';

const changeFilesOf =
  (
    runner: Pick<OperationRunner, 'run'>,
    session: ChangesContext,
  ): ChangeFilesSource =>
  (change) =>
    remoteChanges(remoteOf(runner, session, change));

// Where the Session's Changes read their files from, once its Project is known.
export function useChangeFiles(
  session: ChangesContext | undefined,
): ChangeFilesSource | undefined {
  const runner = useOperationRunner();

  return session && changeFilesOf(runner, session);
}
