import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTRPC } from '#features/connection';
import type { ChangeActions, UnreadChange } from '#features/sessions';
import { associationsOf } from './change-associations';
import { unreadOf } from './change-outcomes';
import type { OperationRunner } from './page-calls-ports';
import type { ChangesContext } from './use-session-pull-requests';
import { useOperationRunner } from './use-tree-calls';

// Whether the GitHub Plugin is on: without it there is nothing to find, attach or retry.
function useGithubEnabled(): boolean {
  const { data } = useQuery(useTRPC().plugin.list.queryOptions());

  return !!data?.plugins.some(
    ({ manifest, enabled }) => manifest.id === 'github' && enabled,
  );
}

// `github.list` for the Session; a failed read says nothing, so what is known stays.
async function readUnread(
  run: OperationRunner['run'],
  session: ChangesContext,
): Promise<UnreadChange[] | undefined> {
  try {
    const list = { pluginId: 'github', operation: 'list', args: {} };

    return unreadOf((await run({ ...list, ...session })).result);
  } catch {
    return undefined;
  }
}

const noSession: ChangesContext = { sessionId: '', projectId: '' };

type Unread = [UnreadChange[], (unread: UnreadChange[]) => void];

/*
 * The attached pull requests that were never read, from `github.list` once when the Session opens. A failed read of
 * that list is not shown as none: it leaves what is known, and the page's Retry reads again.
 */
function useUnread(session: ChangesContext): Unread {
  const { run } = useOperationRunner();
  const [unread, setUnread] = useState<UnreadChange[]>([]);
  const { sessionId, projectId } = session;

  useEffect(() => {
    if (!sessionId || !projectId) return;

    void readUnread(run, { sessionId, projectId }).then(
      (read) => read && setUnread(read),
    );
    // The runner is new each render; the Session is what changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, projectId]);

  return [unread, setUnread];
}

// The Session, only while the GitHub Plugin is on.
function useScope(
  session: ChangesContext | undefined,
): ChangesContext | undefined {
  return useGithubEnabled() ? session : undefined;
}

// The Session's association controls over the App's Operation runner; none while the Session has not loaded or the GitHub Plugin is off.
export function useChangeAssociations(
  session: ChangesContext | undefined,
): ChangeActions | undefined {
  const runner = useOperationRunner();
  const scope = useScope(session);
  const [unread, set] = useUnread(scope ?? noSession);

  return scope && associationsOf(runner, scope, { unread, set });
}
