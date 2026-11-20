import { useCallback, useState } from 'react';
import type { ArchiveSessionAlertProps } from '#features/sessions';
import { archiveAsksFirst } from './archive-asks-first';
import { archiveSessions } from './archive-session-mutations';
import { useArchivePort } from './use-archive-port';
import { useKeepsWorktrees } from './use-keeps-worktrees';

export interface ArchiveSession {
  onArchive: (sessionId: string) => void;
  onArchiveMany: (sessionIds: readonly string[]) => void;
  alert: ArchiveSessionAlertProps;
}

type ArchiveRequest = {
  ids: readonly string[];
  approvals: ReadonlyMap<string, string>;
};

type ArchivePort = ReturnType<typeof useArchivePort>;

type Inspected = { id: string; fingerprint?: string };

async function inspectOne(
  port: ArchivePort,
  id: string,
): Promise<Inspected | undefined> {
  try {
    const result = await port.inspect(id);

    return { id, fingerprint: result?.fingerprint };
  } catch (cause) {
    port.fail('Couldn’t archive the Session', cause);

    return undefined;
  }
}

async function inspect(
  port: ArchivePort,
  ids: readonly string[],
): Promise<ArchiveRequest> {
  const results = await Promise.all(ids.map((id) => inspectOne(port, id)));
  const approvals = new Map<string, string>();
  const eligible: string[] = [];

  for (const result of results.filter((entry) => entry !== undefined)) {
    eligible.push(result.id);

    if (result.fingerprint) approvals.set(result.id, result.fingerprint);
  }

  return { ids: eligible, approvals };
}

type RunArchive = (request: ArchiveRequest) => void;

function useRunArchive(port: ArchivePort, onArchived?: () => void): RunArchive {
  return useCallback(
    ({ ids, approvals }: ArchiveRequest) =>
      archiveSessions(port, ids, {
        offerUndo: !archiveAsksFirst,
        onArchived,
        approvals,
      }),
    [port, onArchived],
  );
}

type AskArchive = (request: ArchiveRequest) => void;

function useArchiveRequest(
  port: ArchivePort,
  archive: RunArchive,
  ask: AskArchive,
): ArchiveSession['onArchiveMany'] {
  return useCallback(
    (ids: readonly string[]) => {
      void inspect(port, ids).then((request) =>
        routeRequest(request, archive, ask),
      );
    },
    [archive, ask, port],
  );
}

function routeRequest(
  request: ArchiveRequest,
  archive: RunArchive,
  ask: AskArchive,
): void {
  if (request.ids.length === 0) return;

  const send = mustConfirm(request) ? ask : archive;
  send(request);
}

const mustConfirm = (request: ArchiveRequest): boolean =>
  request.approvals.size > 0 || archiveAsksFirst;

function archiveAlert(
  asking: ArchiveRequest | undefined,
  archive: RunArchive,
  options: { close: () => void; keepsWorktree?: boolean },
): ArchiveSessionAlertProps {
  return {
    open: asking !== undefined,
    keepsWorktree: options.keepsWorktree,
    losesWork: Boolean(asking?.approvals.size),
    onArchive: () => {
      if (asking) archive(asking);
    },
    onClose: options.close,
  };
}

export function useArchiveSession(onArchived?: () => void): ArchiveSession {
  const [asking, setAsking] = useState<ArchiveRequest>();
  const port = useArchivePort();
  const archive = useRunArchive(port, onArchived);
  const onArchiveMany = useArchiveRequest(port, archive, setAsking);

  const onArchive = useCallback(
    (id: string) => onArchiveMany([id]),
    [onArchiveMany],
  );

  const alert = archiveAlert(asking, archive, {
    close: () => setAsking(undefined),
    keepsWorktree: useKeepsWorktrees(asking?.ids),
  });

  return { onArchive, onArchiveMany, alert };
}
