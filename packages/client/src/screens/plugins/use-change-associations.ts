import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTRPC } from '#features/connection';
import type { ChangeActions, UnreadChange } from '#features/sessions';
import { associationsOf, type UnreadReading } from './change-associations';
import type { OperationRunner } from './page-calls-ports';
import {
  createUnreadReader,
  readUnread,
  type UnreadReader,
} from './unread-reader';
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

const none: UnreadChange[] = [];

// What was read, and for which Session: another Session never shows it.
interface Held {
  key: string;
  unread: UnreadChange[];
}

const keyOf = ({ projectId, sessionId }: ChangesContext): string =>
  `${projectId}/${sessionId}`;

interface Reading {
  run: OperationRunner['run'];
  session: ChangesContext;
  publish: (held: Held) => void;
}

const readerOf = ({ run, session, publish }: Reading): UnreadReader =>
  createUnreadReader(
    () => readUnread(run, session),
    (unread) => publish({ key: keyOf(session), unread }),
  );

// One reader per Session: it reads when the Session opens, and a Session that goes drops what it still has in flight.
function useReader(
  session: ChangesContext,
  publish: (held: Held) => void,
): UnreadReader {
  const { run } = useOperationRunner();

  const reader = useMemo(
    () => readerOf({ run, session, publish }),
    [run, session, publish],
  );

  useReading(reader, session);

  return reader;
}

// It reads once the Session is known, and drops a reading still in flight when the Session goes.
function useReading(reader: UnreadReader, session: ChangesContext): void {
  useEffect(() => {
    if (session.sessionId && session.projectId) void reader.reload();

    return reader.cancel;
  }, [reader, session]);
}

/*
 * The attached pull requests that were never read, from `github.list` when the Session opens and again after each
 * Operation that changes what is attached. A failed read of that list is not shown as none: it leaves what is known, and
 * the page's Retry reads again. Another Session starts from none, and its own answer alone may fill it.
 */
function useUnread(session: ChangesContext): UnreadReading {
  const key = keyOf(session);
  const [held, setHeld] = useState<Held>({ key, unread: none });
  const reader = useReader(session, setHeld);
  const unread = held.key === key ? held.unread : none;

  return useMemo(
    () => ({ unread, set: reader.set, reload: reader.reload }),
    [unread, reader],
  );
}

// The way to the Account's own sign-in, which this page does not draw.
function useSignIn(): () => void {
  const openPage = useOpenPluginPage();

  return useCallback(() => openPage(accountPluginId, signInPath), [openPage]);
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
  const signIn = useSignIn();

  return useMemo(
    () => scope && associationsOf(runner, scope, { reading, signIn }),
    [runner, scope, reading, signIn],
  );
}
