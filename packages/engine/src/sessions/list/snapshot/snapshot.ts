import type { ChangesSummary, SessionSnapshot } from '@repo/contracts';
import { toShell } from '../../acp/shells';
import { feedSnapshotFields, sessionSnapshotFields } from './fields';
import type { SessionState, SnapshotFeed, StoredSnapshot } from './types';

const noChanges: ChangesSummary = { files: 0, additions: 0, deletions: 0 };

export function isSessionReady(session: SessionState): boolean {
  return (
    session.matches({ open: 'acp' }) &&
    !(['opening', 'closing', 'flushing'] as const).some((state) =>
      session.matches({ open: { acp: state } }),
    )
  );
}

export function toSessionSnapshot(
  session: SessionState | null,
  feed: SnapshotFeed,
  storedSession: StoredSnapshot,
): SessionSnapshot {
  return {
    ...storedFields(storedSession),
    ...sessionSnapshotFields(session),
    ...feedSnapshotFields(session, feed),
    shells: snapshotShells(session, storedSession),
  };
}

type StoredFields = Pick<
  SessionSnapshot,
  | 'projectId'
  | 'agent'
  | 'title'
  | 'titleSource'
  | 'checkout'
  | 'changes'
  | 'subagents'
>;

function storedFields(stored: StoredSnapshot): StoredFields {
  return {
    projectId: stored.projectId,
    agent: stored.agent,
    title: stored.title,
    titleSource: stored.titleSource,
    checkout: stored.checkout,
    changes: noChanges,
    subagents: stored.subagents ?? [],
  };
}

function snapshotShells(
  session: SessionState | null,
  stored: StoredSnapshot,
): SessionSnapshot['shells'] {
  return session ? liveShells(session) : (stored.shells ?? []);
}

function liveShells(session: SessionState): SessionSnapshot['shells'] {
  return session.context.shells.map((record) =>
    toShell(record, {
      now: session.context.input.now(),
      terminalAvailable: session.context.shellRuntime.canStop(record.id),
    }),
  );
}
