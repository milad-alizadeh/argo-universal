import type { SessionListOutput } from '@repo/contracts';
import { errorToast } from '@repo/kit/error-toast';
import { showToast } from '@repo/kit/primitives/overlays/toast';
import {
  type InfiniteData,
  type QueryClient,
  useQueryClient,
} from '@tanstack/react-query';
import { useMemo } from 'react';
import { useTRPC, useTRPCClient, type TRPC } from '#features/connection';
import { archivedToast } from '#features/sessions';
import type { ArchivePort } from './archive-session-mutations';

type SessionListData = SessionListOutput | InfiniteData<SessionListOutput>;

// One list page, or every page of a scrolled list, without the archived Sessions.
function withoutSessions(
  data: SessionListData | undefined,
  gone: ReadonlySet<string>,
): SessionListData | undefined {
  const keep = (page: SessionListOutput): SessionListOutput => ({
    ...page,
    sessions: page.sessions.filter((session) => !gone.has(session.sessionId)),
  });

  if (!data) return data;

  return 'pages' in data
    ? { ...data, pages: data.pages.map(keep) }
    : keep(data);
}

function dropRows(
  queryClient: QueryClient,
  trpc: TRPC,
  ids: readonly string[],
): void {
  const lists = trpc.session.list.pathFilter();
  const gone = new Set(ids);

  void queryClient.cancelQueries(lists);
  queryClient.setQueriesData<SessionListData>(lists, (data) =>
    withoutSessions(data, gone),
  );
}

function showFailure(title: string, cause: unknown): void {
  const toast = errorToast(title, cause);

  if (toast) showToast({ ...toast, tone: 'danger' });
}

function announce(title: string, undo: () => void): void {
  showToast({ ...archivedToast(undo), title });
}

function listCalls(
  queryClient: QueryClient,
  trpc: TRPC,
): Pick<ArchivePort, 'dropRows' | 'refresh'> {
  return {
    dropRows: (ids) => dropRows(queryClient, trpc, ids),
    refresh: () =>
      queryClient.invalidateQueries(trpc.session.list.pathFilter()),
  };
}

type Calls = Pick<ArchivePort, 'archive' | 'unarchive'>;

function serverCalls(client: ReturnType<typeof useTRPCClient>): Calls {
  return {
    archive: async (sessionId) => {
      await client.session.archive.mutate({ sessionId });
    },
    unarchive: async (sessionId) => {
      await client.session.unarchive.mutate({ sessionId });
    },
  };
}

// The Server's archiving and the list's cache as this screen sees them, with the toasts that report them.
export function useArchivePort(): ArchivePort {
  const client = useTRPCClient();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMemo(
    () => ({
      ...serverCalls(client),
      ...listCalls(queryClient, trpc),
      announce,
      fail: showFailure,
    }),
    [client, trpc, queryClient],
  );
}
