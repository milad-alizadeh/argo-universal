import type { SessionArchiveInput, SessionListOutput } from '@repo/contracts';
import { errorToast } from '@repo/kit/error-toast';
import { showToast } from '@repo/kit/primitives/overlays/toast';
import {
  type InfiniteData,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { useTRPC } from '#features/connection';

const archiveFailedTitle = 'Couldn’t archive the Session';

const undoFailedTitle = 'Couldn’t restore the Session';

export type Archive = (input: SessionArchiveInput) => void;

// A failure says so in an error toast, under the Server's own words.
function showFailure(title: string, cause: unknown): void {
  const toast = errorToast(title, cause);

  if (toast) showToast({ ...toast, tone: 'danger' });
}

// Once the Server has the change, the list reloads without the row, or with it again.
function useRefreshList(): () => Promise<void> {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return () => queryClient.invalidateQueries(trpc.session.list.pathFilter());
}

// `session.unarchive`: Undo while the archived toast shows.
function useUndo(): Archive {
  const trpc = useTRPC();
  const refresh = useRefreshList();

  return useMutation({
    ...trpc.session.unarchive.mutationOptions(),
    onSuccess: refresh,
    onError: (error) => showFailure(undoFailedTitle, error),
  }).mutate;
}

type SessionListData = SessionListOutput | InfiniteData<SessionListOutput>;

// One list page, or every page of a scrolled list, without the archived Session.
function withoutSession(
  data: SessionListData | undefined,
  sessionId: string,
): SessionListData | undefined {
  const keep = (page: SessionListOutput): SessionListOutput => ({
    ...page,
    sessions: page.sessions.filter(
      (session) => session.sessionId !== sessionId,
    ),
  });

  if (!data) return data;

  return 'pages' in data
    ? { ...data, pages: data.pages.map(keep) }
    : keep(data);
}

// The row leaves every cached list at once, before the Server answers.
function useDropRow(): Archive {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useCallback(
    ({ sessionId }) => {
      const lists = trpc.session.list.pathFilter();

      void queryClient.cancelQueries(lists);
      queryClient.setQueriesData<SessionListData>(lists, (data) =>
        withoutSession(data, sessionId),
      );
    },
    [trpc, queryClient],
  );
}

// `session.archive`; whatever the Server says, the list then reloads from it.
function useArchiveMutation(): Archive {
  const trpc = useTRPC();
  const refresh = useRefreshList();

  return useMutation({
    ...trpc.session.archive.mutationOptions(),
    onError: (error) => showFailure(archiveFailedTitle, error),
    onSettled: refresh,
  }).mutate;
}

export interface ArchiveEffects {
  dropRow: Archive;
  archive: Archive;
  undo: Archive;
}

export function useArchiveEffects(): ArchiveEffects {
  const dropRow = useDropRow();
  const archive = useArchiveMutation();
  const undo = useUndo();

  return useMemo(() => ({ dropRow, archive, undo }), [dropRow, archive, undo]);
}
