import type {
  ChangesSummary,
  SessionGetInput,
  SessionGetOutput,
} from '@repo/contracts';
import { readChangesSummary } from '@repo/git';
import { findMachineActor } from '../../lib/machine-actor';
import { sessionChangesSelection } from '../changes-selection';
import type { SessionRouterDeps } from '../router-deps';
import { sessionMachine, type SessionActorRef } from '../session-machine';
import { sessionActorId } from '../session-system';
import { SessionSnapshotReader } from './reader';

type SnapshotSources = Pick<
  SessionRouterDeps,
  'database' | 'findFeed' | 'findWriter' | 'sessions'
>;

export function createSessionSnapshotReader(
  deps: SnapshotSources,
): (input: SessionGetInput) => Promise<SessionGetOutput> {
  const reader = new SessionSnapshotReader(deps);

  return ({ sessionId }): Promise<SessionGetOutput> =>
    readCurrentSnapshot(deps, reader, sessionId);
}

async function readCurrentSnapshot(
  deps: SnapshotSources,
  reader: SessionSnapshotReader,
  sessionId: string,
): Promise<SessionGetOutput> {
  const snapshot = reader.read(
    sessionId,
    findSession(deps, sessionId),
  ).snapshot;

  if (deps.findFeed(sessionId)) return snapshot;

  return withStoredChanges(deps, { sessionId, snapshot });
}

function findSession(
  deps: SnapshotSources,
  sessionId: string,
): SessionActorRef | undefined {
  return findMachineActor(
    deps.sessions.system,
    sessionActorId(sessionId),
    sessionMachine,
  );
}

async function withStoredChanges(
  deps: SnapshotSources,
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
  deps: SnapshotSources,
  snapshot: SessionGetOutput,
): Promise<ChangesSummary> {
  return readChangesSummary(sessionChangesSelection(deps.database, snapshot));
}
