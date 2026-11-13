import type { ChangeActions } from '#features/sessions';
import { associationsOf } from './change-associations';
import type { ChangesContext } from './use-session-pull-requests';
import { useOperationRunner } from './use-tree-calls';

// The Session's association controls over the App's Operation runner; none while the Session has not loaded.
export function useChangeAssociations(
  session: ChangesContext | undefined,
): ChangeActions | undefined {
  const runner = useOperationRunner();

  return session && associationsOf(runner, session);
}
