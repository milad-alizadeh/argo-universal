import { useCallback, useState } from 'react';
import type { ArchiveSessionAlertProps } from '#features/sessions';
import { archiveAsksFirst } from './archive-asks-first';
import type { Archive } from './archive-session-mutations';
import { useArchiveOperations } from './archive-session-operations';

export interface ArchiveSession {
  // Archive in a row's or header's menu; it keeps one identity, so the rows it reaches stay memoised.
  onArchive: (sessionId: string) => void;
  onArchiveMany: (sessionIds: readonly string[]) => void;
  // The phones' alert; desktop and the web never open it.
  alert: ArchiveSessionAlertProps;
}

type Ask = (ids: readonly string[]) => void;

function requestOne(id: string, archive: Archive, ask: Ask): void {
  if (archiveAsksFirst) ask([id]);
  else archive({ sessionId: id });
}

function requestMany(ids: readonly string[], archive: Ask, ask: Ask): void {
  if (ids.length === 0) return;

  if (archiveAsksFirst) ask([...ids]);
  else archive(ids);
}

export function useArchiveSession(onArchived?: () => void): ArchiveSession {
  const [asking, setAsking] = useState<readonly string[]>();
  const { one, many } = useArchiveOperations(onArchived);

  const onArchive = useCallback(
    (id: string) => requestOne(id, one, setAsking),
    [one],
  );

  const onArchiveMany = useCallback(
    (ids: readonly string[]) => requestMany(ids, many, setAsking),
    [many],
  );

  const alert = alertProps(asking, many, setAsking);

  return { onArchive, onArchiveMany, alert };
}

function alertProps(
  asking: readonly string[] | undefined,
  archive: (ids: readonly string[]) => void,
  setAsking: (ids: readonly string[] | undefined) => void,
): ArchiveSessionAlertProps {
  return {
    open: asking !== undefined,
    count: asking?.length,
    onArchive: () => {
      if (asking) archive(asking);
    },
    onClose: () => setAsking(undefined),
  };
}
