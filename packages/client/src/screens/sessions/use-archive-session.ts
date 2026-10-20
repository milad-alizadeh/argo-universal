import type { SessionArchiveInput, SessionListOutput } from '@repo/contracts';
import {
  type InfiniteData,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { useTRPC } from '#features/connection';
import {
  type ArchiveSessionAlertProps,
  archivedToast,
} from '#features/session-list';
import { errorToast } from '#lib/generic/error-toast';
import { showToast } from '#primitives/overlays/toast';
import { archiveAsksFirst } from './archive-asks-first';

const archiveFailedTitle = 'Couldn’t archive the Session';

const undoFailedTitle = 'Couldn’t restore the Session';

export interface ArchiveSession {
  // Archive in a row's or header's menu; it keeps one identity, so the rows it reaches stay memoised.
  onArchive: (sessionId: string) => void;
  // The phones' alert; desktop and the web never open it.
  alert: ArchiveSessionAlertProps;
}

type Archive = (input: SessionArchiveInput) => void;

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

/*
 * `session.archive`. The row leaves at once; desktop and the web show the archived toast at once too,
 * whose Undo restores the Session. A refusal brings the row back with the list's next load.
 */
function useArchive(onArchived?: () => void): Archive {
  const dropRow = useDropRow();
  const undo = useUndo();
  const archive = useArchiveMutation();

  return useCallback(
    (input) => {
      dropRow(input);
      archive(input);

      if (!archiveAsksFirst) showToast(archivedToast(() => undo(input)));
      onArchived?.();
    },
    [dropRow, archive, undo, onArchived],
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

/*
 * Archive from a row's menu or a Session's header. Desktop and the web archive at once and show the archived toast
 * with Undo; iOS and Android ask first with the alert, and offer no Undo. `onArchived` runs once the archive is sent,
 * such as the header's leaving the Session; it keeps one identity.
 */
export function useArchiveSession(onArchived?: () => void): ArchiveSession {
  const [asking, setAsking] = useState<string>();
  const archive = useArchive(onArchived);

  const onArchive = useCallback(
    (sessionId: string) =>
      archiveAsksFirst ? setAsking(sessionId) : archive({ sessionId }),
    [archive],
  );

  return { onArchive, alert: alertProps(asking, archive, setAsking) };
}

function alertProps(
  asking: string | undefined,
  archive: Archive,
  setAsking: (sessionId: string | undefined) => void,
): ArchiveSessionAlertProps {
  return {
    open: asking !== undefined,
    onArchive: () => {
      if (asking) archive({ sessionId: asking });
    },
    onClose: () => setAsking(undefined),
  };
}
