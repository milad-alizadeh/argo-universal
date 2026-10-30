import type {
  ChangesSummary,
  SessionGetInput,
  SessionGetOutput,
} from '@repo/contracts';
import { readChangesSummary } from '@repo/git';
import { sessionChangesSelection } from '../changes-selection';
import type { HandlerSources } from '../session-sources';
import { SessionSnapshotReader } from './reader';

type SnapshotSources = HandlerSources<
  'database' | 'findFeed' | 'findWriter',
  'session'
>;

export function createSessionSnapshotReader(
  sources: SnapshotSources,
): (input: SessionGetInput) => Promise<SessionGetOutput> {
  const reader = new SessionSnapshotReader(sources);

  return ({ sessionId }): Promise<SessionGetOutput> =>
    readCurrentSnapshot(sources, reader, sessionId);
}

async function readCurrentSnapshot(
  sources: SnapshotSources,
  reader: SessionSnapshotReader,
  sessionId: string,
): Promise<SessionGetOutput> {
  const snapshot = reader.read(
    sessionId,
    sources.open.session(sessionId),
  ).snapshot;

  if (sources.findFeed(sessionId)) return snapshot;

  return withStoredChanges(sources, { sessionId, snapshot });
}

async function withStoredChanges(
  sources: SnapshotSources,
  { sessionId, snapshot }: { sessionId: string; snapshot: SessionGetOutput },
): Promise<SessionGetOutput> {
  try {
    const changes = await storedChanges(sources, snapshot);

    return { ...snapshot, changes };
  } catch (error) {
    console.error(`Session ${sessionId}: stored Checkout totals unread`, error);

    return snapshot;
  }
}

function storedChanges(
  sources: SnapshotSources,
  snapshot: SessionGetOutput,
): Promise<ChangesSummary> {
  return readChangesSummary(
    sessionChangesSelection(sources.database, snapshot),
  );
}
