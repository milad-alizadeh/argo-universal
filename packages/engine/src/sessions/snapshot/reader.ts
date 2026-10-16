import type { SessionSnapshot, SessionUpdate } from '@repo/contracts';
import type { FeedDeps } from '../../feed';
import { createLiveHeaderRowsReader } from '../live-header';
import type { SessionActorRef } from '../session-machine';
import { createQueuedSessionReader } from '../session-record';
import { storedShells } from '../shells/reader';
import { createSubagentsReader } from '../subagents';
import {
  toSessionSnapshot,
  type FeedSnapshot,
  type StoredSnapshot,
} from './snapshot';

type SnapshotStored = ReturnType<ReturnType<typeof createQueuedSessionReader>>;

type SnapshotDeps = Pick<FeedDeps, 'database' | 'findFeed' | 'findWriter'>;

type SessionState = ReturnType<SessionActorRef['getSnapshot']> | null;

type FeedState = Pick<SessionSnapshot, 'epoch' | 'maxRevision'> & {
  rows?: Record<string, SessionUpdate>;
};

interface SnapshotRead {
  snapshot: SessionSnapshot;
  isClosed: boolean;
}

export class SessionSnapshotReader {
  private readonly readSession: ReturnType<typeof createQueuedSessionReader>;
  private readonly readSubagents: ReturnType<typeof createSubagentsReader>;
  private readonly readRows: ReturnType<typeof createLiveHeaderRowsReader>;

  public constructor(private readonly deps: SnapshotDeps) {
    this.readSubagents = createSubagentsReader(deps);
    this.readSession = createQueuedSessionReader(deps);
    this.readRows = createLiveHeaderRowsReader(deps);
  }

  public read(
    sessionId: string,
    actor: SessionActorRef | undefined,
  ): SnapshotRead {
    const session = currentSession(actor);
    const stored = this.readSession(sessionId);

    return {
      snapshot: this.snapshot(sessionId, session, stored),
      isClosed: closedSession(actor, stored.parentSessionId),
    };
  }

  private snapshot(
    id: string,
    session: SessionState,
    stored: SnapshotStored,
  ): SessionSnapshot {
    const feed = this.feedContext(id, stored);
    const snapshot = this.feedSnapshot(id, session, feed);

    return toSessionSnapshot(
      session,
      snapshot,
      this.storedSnapshot(id, stored),
    );
  }

  private storedSnapshot(
    sessionId: string,
    stored: SnapshotStored,
  ): StoredSnapshot {
    return {
      ...stored,
      subagents: this.readSubagents(sessionId),
      shells: storedShells(this.deps.database, sessionId),
    };
  }

  private feedSnapshot(
    sessionId: string,
    session: SessionState,
    feed: FeedState,
  ): FeedSnapshot {
    return { ...feed, rows: this.headerRows(sessionId, session, feed) };
  }

  private feedContext(sessionId: string, stored: FeedState): FeedState {
    const actor = this.deps.findFeed(sessionId);

    return actor ? actor.getSnapshot().context : stored;
  }

  private headerRows(
    sessionId: string,
    session: SessionState,
    feed: FeedState,
  ): Record<string, SessionUpdate> {
    return this.readRows({
      writer: this.deps.findWriter(),
      sessionId,
      turnId: session ? session.context.activeTurnId : null,
      rows: feed.rows ?? {},
    }).rows;
  }
}

function currentSession(actor: SessionActorRef | undefined): SessionState {
  return actor ? actor.getSnapshot() : null;
}

function closedSession(
  actor: SessionActorRef | undefined,
  parentSessionId: string | null,
): boolean {
  return !actor && parentSessionId === null;
}
