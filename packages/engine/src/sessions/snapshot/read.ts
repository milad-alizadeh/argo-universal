import type {
  ChangesSummary,
  SessionGetInput,
  SessionGetOutput,
} from '@repo/contracts';
import { readChangesSummary } from '@repo/git';
import { sessionChangesSelection } from '../changes-selection';
import type { OpenSessions } from '../open-sessions';
import { SessionSnapshotReader } from './reader';

export function createSessionSnapshotReader(
  deps: OpenSessions,
): (input: SessionGetInput) => Promise<SessionGetOutput> {
  const reader = new SessionSnapshotReader(deps);

  return ({ sessionId }): Promise<SessionGetOutput> =>
    readCurrentSnapshot(deps, reader, sessionId);
}

async function readCurrentSnapshot(
  deps: OpenSessions,
  reader: SessionSnapshotReader,
  sessionId: string,
): Promise<SessionGetOutput> {
  const snapshot = reader.read(sessionId, deps.session(sessionId)).snapshot;

  if (deps.findFeed(sessionId)) return snapshot;

  return withStoredChanges(deps, { sessionId, snapshot });
}

async function withStoredChanges(
  deps: OpenSessions,
  { sessionId, snapshot }: { sessionId: string; snapshot: SessionGetOutput },
): Promise<SessionGetOutput> {
  try {
    const changes = await storedChanges(deps, snapshot);

    return { ...snapshot, changes };
  } catch (error) {
    console.error(`Session ${sessionId}: stored Checkout totals unread`, error);

    return snapshot;
  }
}

function storedChanges(
  deps: OpenSessions,
  snapshot: SessionGetOutput,
): Promise<ChangesSummary> {
  return readChangesSummary(sessionChangesSelection(deps.database, snapshot));
}
