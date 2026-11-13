import { type ChangeFilesSource, changeFilesOf } from './change-files';
import type { ChangesContext } from './use-session-pull-requests';
import { useOperationRunner } from './use-tree-calls';

// Where the Session's Changes read their files from, once its Project is known.
export function useChangeFiles(
  session: ChangesContext | undefined,
): ChangeFilesSource | undefined {
  const runner = useOperationRunner();

  return session && changeFilesOf(runner, session);
}
