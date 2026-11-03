import { useCallback, useState } from 'react';
import type { ArchiveSessionAlertProps } from '#features/sessions';
import { archiveAsksFirst } from './archive-asks-first';
import { archiveSessions } from './archive-session-mutations';
import { useArchivePort } from './use-archive-port';
import { useKeepsWorktrees } from './use-keeps-worktrees';

export interface ArchiveSession {
  // Archive in a row's or header's menu; it keeps one identity, so the rows it reaches stay memoised.
  onArchive: (sessionId: string) => void;
  onArchiveMany: (sessionIds: readonly string[]) => void;
  // The phones' alert; desktop and the web never open it.
  alert: ArchiveSessionAlertProps;
}

type Archive = (ids: readonly string[]) => void;

type Ask = (ids: readonly string[] | undefined) => void;

// Phones ask first and offer no Undo; desktop and the web archive at once and do.
function useArchive(onArchived?: () => void): Archive {
  const port = useArchivePort();

  return useCallback(
    (ids) =>
      archiveSessions(port, ids, { offerUndo: !archiveAsksFirst, onArchived }),
    [port, onArchived],
  );
}

function useRequest(archive: Archive, ask: Ask): Archive {
  return useCallback(
    (ids) => {
      if (ids.length === 0) return;

      if (archiveAsksFirst) ask([...ids]);
      else archive(ids);
    },
    [archive, ask],
  );
}

export function useArchiveSession(onArchived?: () => void): ArchiveSession {
  const [asking, setAsking] = useState<readonly string[]>();
  const archive = useArchive(onArchived);
  const onArchiveMany = useRequest(archive, setAsking);

  const onArchive = useCallback(
    (id: string) => onArchiveMany([id]),
    [onArchiveMany],
  );

  const keepsWorktree = useKeepsWorktrees(asking);
  const alert = { ...alertProps(asking, archive, setAsking), keepsWorktree };

  return { onArchive, onArchiveMany, alert };
}

function alertProps(
  asking: readonly string[] | undefined,
  archive: Archive,
  setAsking: Ask,
): ArchiveSessionAlertProps {
  return {
    open: asking !== undefined,
    onArchive: () => {
      if (asking) archive(asking);
    },
    onClose: () => setAsking(undefined),
  };
}
