import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTRPC } from '#features/connection';
import type { ChangeActions, UnreadChange } from '#features/sessions';
import { associationsOf, type UnreadReading } from './change-associations';
import { createUnreadReader, readUnread } from './unread-reader';
import { useOpenPluginPage } from './use-plugin-opener';
import type { ChangesContext } from './use-session-pull-requests';
import { useOperationRunner } from './use-tree-calls';

// The Plugin that provides the GitHub Account, whose sign-in page is where the App leads a person to sign in again.
const accountPluginId = 'issue-tracker';

const signInPath = '/sign-in';

// Whether the GitHub Plugin is on: without it there is nothing to find, attach or retry.
function useGithubEnabled(): boolean {
  const { data } = useQuery(useTRPC().plugin.list.queryOptions());

  return !!data?.plugins.some(
    ({ manifest, enabled }) => manifest.id === 'github' && enabled,
  );
}

const noSession: ChangesContext = { sessionId: '', projectId: '' };

/*
 * The attached pull requests that were never read, from `github.list` when the Session opens and again after each
 * Operation that changes what is attached. A failed read of that list is not shown as none: it leaves what is known, and
 * the page's Retry reads again. Another Session starts from none, and its own answer alone may fill it.
 */
function useUnread(session: ChangesContext): UnreadReading {
  const { run } = useOperationRunner();
  const [unread, setUnread] = useState<UnreadChange[]>([]);
  const latestRun = useRef(run);
  const { sessionId, projectId } = session;

  useEffect(() => {
    latestRun.current = run;
  });

  const reader = useMemo(
    () =>
      createUnreadReader(
        () =>
          readUnread((call) => latestRun.current(call), {
            sessionId,
            projectId,
          }),
        setUnread,
      ),
    [sessionId, projectId],
  );

  useEffect(() => {
    setUnread([]);

    if (sessionId && projectId) void reader.reload();

    return reader.cancel;
  }, [reader, sessionId, projectId]);

  return useMemo(
    () => ({ unread, set: reader.set, reload: reader.reload }),
    [unread, reader],
  );
}

// The Session, only while the GitHub Plugin is on.
function useScope(
  session: ChangesContext | undefined,
): ChangesContext | undefined {
  return useGithubEnabled() ? session : undefined;
}

/*
 * The Session's association controls over the App's Operation runner; none while the Session has not loaded or the
 * GitHub Plugin is off. They keep one identity until the Session, what is unread or the runner changes, so the header
 * that holds them does not redraw for nothing.
 */
export function useChangeAssociations(
  session: ChangesContext | undefined,
): ChangeActions | undefined {
  const runner = useOperationRunner();
  const scope = useScope(session);
  const reading = useUnread(scope ?? noSession);
  const openPage = useOpenPluginPage();

  return useMemo(
    () =>
      scope &&
      associationsOf(runner, scope, reading, () =>
        openPage(accountPluginId, signInPath),
      ),
    [runner, scope, reading, openPage],
  );
}
